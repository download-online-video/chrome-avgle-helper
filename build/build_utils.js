#!/usr/bin/env node
/**
 * @license Apache-2.0
 * 
 * frontend build scripts
 * version: 1.0.3-alpha
 * date: 2017-10-16 02:15
 */
const a = '1.0.3-alpha';
require('colors');
let b = require('glob'),
c = require('fs-extra'),
d = require('js-yaml'),
{ dirname: e } = require('path');
const f = (...a) => void a;
let g = (a = '', b = null) => {
	console.error(`  error: ${a}`.red),
	b && console.error(b.stack || b);
};
module.exports = {
	EMPTY_CALLBACK: f,
	error: g,
	globFiles: l,
	readFile: j,
	writeFileWithMkdirsSync: k,
	getHelp: m,
	startTask: h,
	loadYAMLFiles: i,
	exit: (a = 0, b = '') => {
		b && console.log(b), process.exit(a);
	},
	isPugFile: (a) => a.endsWith('.pug') || a.endsWith('.jade') };
function h(a) {
	return console.log(`# ${a} `.bold + `...`), {
		done: () => console.log(` ${a} done`.green),
		fail: (b, c = "") => console.error(` ${a} fail: ${c}`.red + `\n`, b && (b.stack || b)) };
}
function i(a) {
	let b = {};
	return (a || []).map((a) => {try {let c = d.safeLoad(j(a) + '');b = Object.assign(b, c);} catch (a) {return null;}}), b;
}
function j(a, b = null) {
	return b ? c.readFile(a, 'utf8', b) : c.readFileSync(a, 'utf8');
}
function k(a = '', b = '') {
	let d = e(a);
	c.existsSync(d) || c.mkdirsSync(d),
	c.writeFileSync(a, b);
}
function l(a, c) {
	let d = [];
	return a.map((a) => {try {d = d.concat(b.sync(a, c));} catch (a) {g(`invalid glob: ${b}`);}}), d;
}
function m() {
	return [
	`Usage: build.js [options] [configName]\n`,
	`Version: ${a}`,
	`Front-end build scripts pack\n`,
	`Options:`,
	`  -V --version  output the version info`,
	`  -h --help     output this help info`,
	`  -w --watch    turn on the watch building mode\n`,
	`ConfigName:`,
	`  [default]     build.config.yaml`,
	`  dev           build.dev.config.yaml`,
	`  prod          build.prod.config.yaml`,
	`  <fileName>    load config from fileName you given`].
	map((a) => '  ' + a).join('\n');
}