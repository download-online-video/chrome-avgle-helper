#!/usr/bin/env node
/**
 * @license Apache-2.0
 * 
 * frontend build scripts
 * version: 1.0.3-alpha
 * date: 2017-10-16 02:15
 */
const a = '1.0.3-alpha',
b = `${__dirname}/build.config.yaml`;
let c = (a) => `build.${a}.config.yaml`;
require('colors');
let d = require('fs-extra'),
e = require('js-yaml'),
f = require('postcss'),
g = require('browserify'),
{ join: h, dirname: i, basename: j, isAbsolute: k } = require('path'),
{ exec: l } = require('child_process'),
m = require('async'),
{ read: n } = require('./config_reader'),
{
	globFiles: o,
	readFile: p,
	writeFileWithMkdirsSync: q,
	error: r, exit: s, getHelp: t, startTask: u,
	isPugFile: v,
	loadYAMLFiles: w,
	EMPTY_CALLBACK: x } =
require('./build_utils'),
y = null,
z = null,
A = null,
B = null,
C = null,
D = null,
E = null,
F = null,
G = null,
H = null,
I = null;
function J(a) {
	let b = N;
	b.source_map.enable && b.source_map.js && (I = require('convert-source-map')),
	b.sass.enable && (B = require('node-sass')),
	b.less.enable && console.log('LESS is TODO...'),
	b.autoprefixer.enable && (C = require('autoprefixer')),
	b.babel.enable && (A = require('babel-core')),
	b.html_minifier.enable && (E = require('html-minifier')),
	b.ejs.enable && (y = require('ejs')),
	b.ejs_template_tags.enable && (D = require('cheerio')),
	b.pug.enable && (z = require('pug')),
	a.watch && (
	G = require('watch'),
	H = require('watchify'),
	b.browser_sync.enable && (F = require('browser-sync')));
}
let K = 0,
L = !1,
M = null,
N = null,
O = null,
P = {},
Q = {},
R = (a) => {K++, O && O.reload(a);};
['html', 'css', 'js'].map((a) => Q[a] = () => R(`*.${a}`));
function S() {
	let a = ka(),
	b = la(a.mode);return (
		L = a.watch, b ? void (
		console.log(`  config: ${b.bold}`),
		M = n(b),
		N = M.processor,
		J(a),
		ma('before_all', (b) => {
			if (b) return s(11);
			M.clean_dist && (T() || s(1)),
			U() || s(2),
			M.concat && M.concat.length && V((a) => a && s(3)), (
			N.ejs.enable || N.ejs_template_tags.enable) && (
			y.fileLoader = Y),
			N.ejs_variables.enable && (X() || s(4));
			let c = u('first build');
			m.parallel([Z, ba, fa],
			(a) => a ?
			c.fail(a) : void (
			K++,
			ma('after_build', (a) => a ? s(10) : c.done()))),
			a.watch ? (console.log("# Watch mode is on".bold), ja()) :
			console.log("  Tip: -w option could turn on the watch mode".grey);
		})) : (r(`could not load config: ${a.mode}`), s(32)));
}
function T() {
	let a = u('clean target folder');
	try {d.removeSync(M.dist);} catch (b) {return a.fail(b), !1;}
	return a.done(), !0;
}
function U() {
	let a = u(`copy asset files`);
	console.log(`asset folders: ${M.src_assets.map((a) => a.name).join(', ')}`);
	try {
		M.src_assets.map((a) => d.copySync(a.from, a.to));
	} catch (b) {
		return a.fail(b), !1;
	}
	return a.done(), !0;
}
function V(a = x) {
	let b = u(`concat files`);
	m.map(M.concat, (a, b) => {
		console.log(`concatenating file ${a.name} `),
		m.parallel(a.from.map((a) => (b) => p(a, b)), (c, d) =>
		c ? (
		r(`read source file for concatenating failed!`), b(c)) : (
		q(a.to, d.join('\n')), b()));
	}, (c) => c ? (b.fail(c), a(c)) : (b.done(), a()));
}
function W(a) {return { basedir: M.src, filename: j(a) };}
function X() {
	let a = u("load ejs variables");return (
		P = w(M.processor.ejs_variables.files), P ? (
		a.done(), !0) : (a.fail(`load ejs variable failed (invalid yaml)`), !1));
}
function Y(a) {return (
		v(a) ?
		N.pug.enable ?
		z.compileFile(a, W(a))(P) : (
		r(`You had not turn on the pug processor in config file!`), "") :
		!d.existsSync(a) && (
		a.endsWith('.ejs') && (a = a.replace(/\.ejs$/, '.html')),
		!d.existsSync(a)) ? (
		r(`The include page is not existed! (${a})`), "") :
		p(a));
}
function Z(a) {
	let b = u('render pages'),
	c = o(M.src_globs, { cwd: M.src });
	console.log(` pages count: ${c.length}`),
	m.map(c, (a, b) => {
		function c(c, e) {
			if (c) return b({ path: d, err: c });
			if (N.ejs_template_tags.enable && (e = _(e)), N.html_minifier.enable)
				try {e = E.minify(e, N.html_minifier);}
				catch (a) {return b({ path: d, err: a });}
			q(`${M.dist}/${a}`, e),
			b(null, !0);
		}let d = h(M.src, a);return v(a) && N.pug.enable ? c(null, z.compileFile(d, W(d))(P)) : N.ejs.enable ? y.renderFile(d, P, { root: M.src }, c) : void p(d, c);
	}, (c) => {
		c ? b.fail(c.err, c.path) : b.done(),
		a && a(c);
	});
}
const $ = 'script[type="text/template"]';
function _(a) {
	let b = N.ejs_template_tags.selector || $;
	console.log(`  selector: ${b}`);
	let c = [],
	e = parseInt(1e4 * Math.random() + ''),
	f = `ejstagcache_${e}_`,
	g = `${f}start`,h = `${f}end`,
	j = new RegExp(`${g}(\\d*)${h}`, 'g');
	try {
		let e = D.load(a),
		f = e(b);
		for (var k = 0; k < f.length; k++) {
			let a = f.eq(k),b = d.readFileSync(`${M.src}/${a.attr('src')}`, 'utf8');
			N.html_minifier.enable && (
			b = E.minify(b, N.html_minifier)),
			a.html(b.replace(/<%([\s\S]*?)%>/g, (a) => (
			c.push(a), `${g}${c.length - 1}${h}`))),
			a.removeAttr('src');
		}
		let i = e.html({ decodeEntities: !1 });
		return i.replace(j, (a, b) => c[b]);
	} catch (b) {
		return console.error(`  error: render ejs template tags`.red, '\n', b.stack), a;
	}
}
let aa = !1;
function ba(a) {
	if (aa)
	throw `buildScripts could be only called one time!`;
	aa = !0;
	let b = u('handler scripts'),
	{ src: c, dist: d } = M,
	e = o(M.src_script_globs, { cwd: c });
	m.map(e, (a, b) =>
	ca(h(c, a), h(d, ia(a)), b),
	() => (b.done(), a && a()));
}
function ca(a, c, e) {
	function f(a, b) {
		if (a) return console.error(`  error: browserify ${h}`.red, "\n", a), l();
		let e = b + '',
		f = null;
		if (k && (f = JSON.parse(I.fromSource(e).toJSON()), e = I.removeMapFileComments(e)), N.babel.enable) {
			let a = ea(da(), h, e, f);
			if (a.err) return l(a.err);
			e = a.code, f = a.map;
		}
		try {
			q(c, e),
			k && d.writeFileSync(`${c}.map`, JSON.stringify(f, null, '\t'));
		} catch (a) {
			return console.error(`  error: write codes and sources map to target file failed!`.red, "\n", a.stack || a), l(a);
		}
		return l();
	}let h = j(c),k = N.source_map.enable && N.source_map.js,l = e,m = g([a], { extensions: ['.jsx'], debug: k, basedir: i(c), cache: {}, packageCache: {} });N.browserify.transform.map(({ name: a, options: b }) => m.transform(a, b)), L && (m.plugin(H, N.watchify), m.on('update', () => {l = () => (console.log(`${a} updated!`), Q.js()), m.bundle(f);})), m.bundle(f);
}
function da() {
	let a = N.babel.babelrc;
	if (a && !k(a)) return h(process.cwd(), a);
}
function ea(a, b, c, d = null) {
	try {
		let e = d ? { sourceMaps: !0, inputSourceMap: d } : {};a && (
		e.extends = a);
		let f = A.transform(c, e);
		return {
			code: d ? `${f.code}\n//# sourceMappingURL=${b}.map` : f.code,
			map: f.map };
	} catch (a) {
		return r(`babel transform ${b}`, a), { err: a };
	}
}
function fa(a) {
	let b = u('handler styles'),
	{ src: c, dist: d } = M,
	e = o(M.src_styles_globs, { cwd: c });
	m.map(e, (a, b) =>
	ga(h(c, a), h(d, ia(a)), b),
	() => (b.done(), a && a()));
}
function ga(a, b, c) {
	if (a.endsWith('less')) throw new Error('TODO: support less');return (
		a.endsWith('.sass') || a.endsWith('.scss') ?
		ha(a, b, a.endsWith('.sass'), c) :
		a.endsWith('.css') ?
		d.copy(a, b, (b) => (b && console.error(`  error: copy css file: ${a}`)) + c()) : void (
		console.error(`  warning: unknown style file format: ${a}`),
		c()));
}
function ha(a, b, c, e) {
	let g = j(a),
	h = N.source_map.enable && N.source_map.css,
	i = `${b}.map`;
	B.render({
		file: a,
		indentedSyntax: c,
		outputStyle: 'compressed',
		outFile: b,
		sourceMap: h ? i : void 0 },
	(a, c) => a ? (
	console.error(`  error: sass compile ${g}`.red, '\n', a), e()) : void
	f(C ? [C] : []).process(c.css, {
		from: g,
		to: j(b),
		map: h ? { inline: !1, prev: JSON.parse(c.map.toString()) } : void 0 }).
	then((a) => {
		let c = a.warnings();
		0 < c.length && (
		console.log(`warn: auto prefixer ${g}`.yellow.bold),
		c.forEach((a) => console.log(`  ${a.toString()}`.yellow))),
		q(b, a.css),
		h && d.writeFileSync(i, JSON.stringify(a.map, null, '\t')),
		e();
	}).catch((a) => {
		r(`auto prefixer ${g}`, a),
		e();
	}));
}
function ia(a = '') {return (
		a.endsWith('.jsx') ? a.replace(/\.jsx$/, '.js') :
		a.replace(/\.s[ca]ss$/, '.css'));
}
function ja() {
	N.browser_sync.enable && (
	O = F.create(),
	O.init(N.browser_sync)),
	G.unwatchTree(M.src),
	G.watchTree(M.src, { interval: 0.5 }, function (a, b, c) {
		if ("object" != typeof a || null !== c || null !== b) {
				let b = a + '';return (
					console.log("watch >".bold, b),
					b.endsWith('.yaml') ? (
					X(), Z(Q.html)) :
					b.endsWith('.html') || b.endsWith('.ejs') || v(b) ?
					Z(Q.html) :
					b.endsWith('.css') || b.endsWith('.sass') ||
					b.endsWith('.scss') || b.endsWith('.less') ?
					fa(Q.css) : void 0);}
	});
}
function ka() {
	function b(...a) {
		for (let b of a) if (0 <= c.indexOf(b)) return !0;return !1;
	}let c = process.argv.slice(2),d = !1,e = '';b('-h', '--help') && s(0, t()), b('-V', '--version') && s(0, a), b('-w', '--watch') && (d = !0);for (let a of c) if (!a.match(/^\-{1,}/)) {e = a;break;}return { watch: d, mode: e };
}
function la(a = '') {
	let e = '';return a ?
	d.existsSync(e = h(__dirname, a)) ? e :
	d.existsSync(e = h(__dirname, c(a))) ? e :
	'' : b;
}
function ma(a, b = x) {
	let c = M.hook[a];
	if (!c) return b();
	let { command: d, asynchronous: e } = c,
	f = u(`hook ${a}`);
	l(`${d} "${K}"`, { cwd: __dirname, encoding: 'utf8' },
	(c, d, g) => {d &&
		d.trim().split('\n').map((a) => `hook out: ${a}`).map((a) => console.log(a)), g &&
		g.trim().split('\n').map((a) => `hook err: ${a}`).map((a) => console.error(a)),
		c ? f.fail(c, `executing hook script "${a}" failed!`) : f.done(), e || (
		c ? b(c) : b());
	}), e &&
	b();
}
S();