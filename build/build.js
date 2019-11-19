#!/usr/bin/env node
//@ts-check
/// <reference path="./types.d.ts" />

const path = require('path');
const fs = require('fs-extra');
const colors = require('colors/safe')
const sass = require('sass');
const glob = require('glob');
const browserify = require('browserify');
const babel = require('@babel/core');
const watch = require('watch');
const watchify = require('watchify');
const sourceMapConvert = require('convert-source-map');

const log = createLogger();
const configFile = path.join(__dirname, 'config.json');
const projectRoot = path.join(__dirname, '..');

main().catch(onFatal);

/**
 * Main function
 */
async function main() {
	const args = getLaunchArguments();
	const config = await loadConfigFile();

	const sourceDir = path.join(projectRoot, config.from);
	const targetDir = path.join(projectRoot, config.dist);
	const babelrcFile = path.join(projectRoot, '.babelrc');

	const javascriptEntrypoints = new Set();
	const stylesheetEntrypoints = new Set();
	const assetEntrypoints = new Set();

	await taskResolveEntrypoints();
	await taskCleanTarget();
	await Promise.all([
		taskCopyAssets(),
		taskBuildJavascripts(),
		taskBuildStylesheets(),
	]);

	if (args.watch) await taskWatch();
	return;

	async function taskResolveEntrypoints() {
		log.start(`resolving entrypoints`);
		const files = await Promise.all(config.entrypoints
			.map(globExpression => new Promise((resolve, reject) => {
				glob(globExpression, { cwd: sourceDir }, (error, files) => {
					if (error) onFatal(`execute "${globExpression}" failed:`, error);
					resolve(files);
				});
			})));
		const flattenFiles = flattenArray(...files);
		flattenFiles.forEach(it => {
			const itsPath = path.resolve(sourceDir, it);
			if (it.endsWith('.js')) return javascriptEntrypoints.add(itsPath);
			if (it.endsWith('.css') || it.endsWith('.scss') || it.endsWith('.sass'))
				return stylesheetEntrypoints.add(itsPath);
			return assetEntrypoints.add(itsPath);
		});
		log.done(`resolved ${flattenFiles.length} entrypoints`);
	}
	async function taskCleanTarget() {
		log.start(`removing "${targetDir}"`);
		await fs.remove(targetDir);
		log.done('removed');
	}
	async function taskCopyAssets(onlyThisOne = '') {
		let assets = [];
		if (onlyThisOne) {
			assertInDirectory(onlyThisOne, sourceDir);
			assets.push(onlyThisOne);
		} else {
			assets = Array.from(assetEntrypoints);
		}
		log.start(`copying ${assets.length} assets`);
		for (let i = 0; i < assets.length; i++) {
			const from = assets[i];
			const to = path.join(targetDir, path.relative(sourceDir, from));
			const fromName = path.relative(process.cwd(), from);
			const toName = path.relative(process.cwd(), to);

			await copyFile(from, to);
			log.info(`copied "${fromName}" to "${toName}"`);
		}
		log.done(`copied ${assets.length} assets`);
	}
	async function taskBuildStylesheets(onlyThisOne = '') {
		let stylesheeets = [];
		if (onlyThisOne) {
			assertInDirectory(onlyThisOne, sourceDir);
			stylesheeets.push(onlyThisOne);
		} else {
			stylesheeets = Array.from(stylesheetEntrypoints);
		}
		log.start(`building ${stylesheeets.length} stylesheets`);
		await Promise.all(stylesheeets.map(from => {
			const to = path.join(targetDir, path.relative(sourceDir, from).replace(/\.(\w+)$/, '.css'));
			const sourceMapTo = to + '.map';
			const fromName = path.relative(process.cwd(), from);
			const toName = path.relative(process.cwd(), to);
			const indented = from.endsWith('.sass');
			return new Promise((resolve, reject) => {
				sass.render({
					file: from,
					indentedSyntax: indented,
					outputStyle: 'compressed',
					outFile: to,
					sourceMap: sourceMapTo,
				}, (err, result) => {
					if (err) onFatal(`build stylesheet "${fromName}" failed!`, err);
					writeTextFile(to, result.css)
						.then(() => writeTextFile(sourceMapTo, result.map))
						.then(() => log.info(`build "${fromName}" to "${toName}"`))
						.catch(onFatal)
						.then(resolve);
				});
			});
		}));
		log.done(`build ${stylesheeets.length} stylesheets`);
	}
	async function taskBuildJavascripts() {
		const javascripts = Array.from(javascriptEntrypoints);
		log.start(`building ${javascripts.length} javascripts`);
		await Promise.all(javascripts.map(from => {
			const to = path.join(targetDir, path.relative(sourceDir, from));
			const scriptName = path.basename(to);
			const sourceMapTo = to + '.map';
			const fromName = path.relative(process.cwd(), from);
			const toName = path.relative(process.cwd(), to);
			return new Promise((resolve, reject) => {
				const bundler = browserify([from], {
					extensions: [".jsx"],
					debug: true,
					basedir: path.dirname(to),
					cache: {}, packageCache: {} // for watchify
				});
				bundler.transform('babelify', {
					plugins: ["transform-es2015-modules-commonjs"]
				});
				if (args.watch) {
					bundler.plugin(watchify, {});
					bundler.on('update', () => bundler.bundle(afterBundle.bind(this, false)));
				}
				bundler.bundle(afterBundle.bind(this, true));
				function afterBundle(isFirstBundle, error, buffer) {
					if (error) {
						if (isFirstBundle) onFatal(`browserify bundle "${fromName}" failed!`, error);
						return log.error(`browserify bundle "${fromName}" failed!`, error);
					}
					let code = String(buffer);
					let map = JSON.parse(sourceMapConvert.fromSource(code).toJSON());
					code = sourceMapConvert.removeMapFileComments(code);

					let babelResult = pipeToBabel(code, map);
					if (babelResult.error) {
						if (isFirstBundle) return onFatal(`build "${fromName}" failed!`, error);
						return log.error(`build "${fromName}" failed!`, error);
					}
					code = babelResult.code;
					map = babelResult.map;
					writeTextFile(to, code);
					writeTextFile(to, code)
						.then(() => writeTextFile(sourceMapTo, JSON.stringify(map, null, '\t')))
						.then(() => log.info(`build "${fromName}" to "${toName}"`))
						.catch(onFatal)
						.then(() => isFirstBundle ? resolve() : null);
				}
				function pipeToBabel(code, inputSourcesMap) {
					try {
						const options = {
							sourceMaps: !!inputSourcesMap,
							inputSourceMap: inputSourcesMap,
							extends: babelrcFile,
						};
						const result = babel.transform(code, options);
						return {
							code: inputSourcesMap
								? `${result.code}\n//# sourceMappingURL=${scriptName}.map`
								: result.code,
							map: result.map,
						};
					} catch (error) {
						log.error(`babel transform "${scriptName}" failed!`, error);
						return { error };
					}
				}
			});
		}));
		log.done(`build ${javascripts.length} javascripts`);
	}
	async function taskWatch() {
		const watchDir = path.join(projectRoot, config.watch);
		const watchName = path.relative(process.cwd(), watchDir);
		watch.unwatchTree(watchDir);
		watch.watchTree(watchDir, { interval: 0.5 }, function (p, curr, prev) {
			if (typeof p == "object" && prev === null && curr === null)
				return log.start(`watching "${watchName}"`); //First time scan
			const file = String(p);
			const fileName = path.relative(process.cwd(), file);
			log.info(`"${fileName}" is modified`);
			if (assetEntrypoints.has(file))
				return taskCopyAssets(file).catch(onFatal);
			if (file.endsWith('.css') || file.endsWith('.scss') || file.endsWith('.sass'))
				return taskBuildStylesheets(stylesheetEntrypoints.has(file) ? file : '').catch(onFatal);
		});
	}
} // end of main function

function getLaunchArguments() {
	const args = { watch: false };
	for (let i = 2; i < process.argv.length; i++) {
		const arg = process.argv[i];
		if (arg === '-w' || arg === '--watch' || arg === 'watch') {
			args.watch = true;
			continue;
		}
	}
	return args;
}

/**
 * Load config yaml file
 * @returns {Promise<BuildConfig>}
 */
async function loadConfigFile() {
	const config = await readTextFile(configFile);
	return JSON.parse(config);
}

/**
 * Read a file to string
 * @param {string} filePath
 */
async function readTextFile(filePath) {
	try {
		return await fs.readFile(filePath, 'utf8');
	} catch (error) {
		const fileName = path.relative(process.cwd(), filePath);
		onFatal(`read file "${fileName}" failed!`, error.message);
	}
}

/**
 * Write a string into a file
 * @param {string} filePath
 * @param {string|Buffer} content
 */
async function writeTextFile(filePath, content) {
	const parentDir = path.dirname(filePath);
	if (!fs.existsSync(parentDir))
		await fs.mkdirp(parentDir);
	try {
		await fs.writeFile(filePath, content);
	} catch (error) {
		const fileName = path.relative(process.cwd(), filePath);
		onFatal(`write file "${fileName}" failed!`, error.message);
	}
}

/**
 * @param {string} from
 * @param {string} to
 */
async function copyFile(from, to) {
	const toParent = path.dirname(to);
	if (!fs.existsSync(toParent))
		await fs.mkdirp(toParent);
	await fs.copy(from, to);
}

/**
 * @template T
 * @param  {Array<Array<T>>} arrays
 * @returns {Array<T>}
 */
function flattenArray(...arrays) {
	const results = [];
	arrays.forEach(it => results.push(...it));
	return results;
}

/**
 * Assert a file is located in a directory
 * @param {string} filePath
 * @param {string} directoryPath
 */
function assertInDirectory(filePath, directoryPath) {
	const relative = path.relative(directoryPath, filePath);
	if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) return true;
	const fileName = path.relative(process.cwd(), filePath);
	const dirName = path.relative(process.cwd(), directoryPath);
	onFatal(`"${fileName}" is not located in "${dirName}"`);
}

/**
 * Create an unified logger
 */
function createLogger() {
	return {
		info: (...msg) => console.log(colors.blue('info: '), ...msg),
		error: (...msg) => console.error(colors.red('error:'), ...msg),
		start: (...msg) => console.log(colors.bold('start:'), ...msg),
		done: (...msg) => console.log(colors.green('done: '), ...msg),
		warn: (...msg) => console.log(colors.yellow('warn: '), ...msg),
	};
}
/**
 * On fatal error occurred
 * @returns {never}
 */
function onFatal(...error) {
	log.error(...error);
	return process.exit(1);
}
function noop() {
}
