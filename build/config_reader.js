#!/usr/bin/env node
/**
 * @license Apache-2.0
 * 
 * frontend build scripts
 * version: 1.0.3-alpha
 * date: 2017-10-16 02:15
 */
const a = '1.0.3-alpha';
(function () {
	function a(a) {throw i(a, 'String');}
	function b(a) {throw i(a, 'Object');}
	function c(a) {throw i(a, 'Boolean');}
	function d(a) {throw i(a, 'String[]');}
	function e(a) {throw i(a, 'Any[]');}
	function f(a) {throw i(a, 'String/String[]');}
	function g(a) {throw i(a, 'Hook Name Sting');}
	function h(a) {throw i(a, 'True/Undefined (Not allow false)');}
	function i(a, b) {
		return new Error(`Config is incomplete. "config.${a}" is not a ${b}!`);
	}const j = { WATCHIFY: { delay: 100, ignoreWatch: ['**/node_modules/**'], poll: !1 }, BROWSERIFY: { transform: [] } },k = ['before_all', 'after_build'],l = 'async_',m = k.map((a) => l + a),n = [].concat(m, k),o = { null: (a) => !a && 'object' == typeof a, object: (a) => a && 'object' == typeof a, string: (a) => 'string' == typeof a, boolean: (a) => 'boolean' == typeof a, array: (a) => Array.isArray(a), stringOrStringArray: (a) => o.string(a) || o.stringArray(a), stringArray: (a) => {if (!Array.isArray(a)) return !1;for (let b of a) if ('string' != typeof b) return !1;return !0;}, objectHasEnableField: (a) => o.object(a) && o.boolean(a.enable) },p = (a, b) => a && Object.keys(a).map((c) => b(c, a[c]));let q = require('js-yaml'),{ readFileSync: r } = require('fs-extra'),{ join: s } = require('path');
	module.exports = { read: function (i) {let k = r(i, 'utf8'),m = q.safeLoad(k);o.string(m.name) || a(`name`), o.object(m.src) || b(`src`), o.object(m.dist) || b(`dist`), o.null(m.src.scripts) && (m.src.scripts = []), o.null(m.src.styles) && (m.src.styles = []), o.null(m.src.assets) && (m.src.assets = []), o.null(m.src.pages) && (m.src.pages = []), o.null(m.src.concat) && (m.src.concat = {}), o.null(m.hook) && (m.hook = {}), o.string(m.src.base) || a(`src.base`), o.stringOrStringArray(m.src.scripts) || f(`src.scripts`), o.stringOrStringArray(m.src.styles) || f(`src.styles`), o.stringOrStringArray(m.src.assets) || f(`src.assets`), o.stringOrStringArray(m.src.pages) || f(`src.pages`), p(m.src.concat, (a, b) => o.stringArray(b) || d(`src.concat["${a}"]`)), p(m.hook, (a) => 0 <= n.indexOf(a) || g(`hook["${a}"]`)), p(m.hook, (b, c) => o.string(c) || a(`hook["${b}"]`)), o.string(m.dist.base) || a(`dist.base`), o.boolean(m.dist.clean) || c(`dist.clean`);let t = process.cwd(),u = s(t, m.dist.base),v = s(t, m.src.base),w = {};w.name = m.name, w.src = v, w.dist = u, w.clean_dist = !!m.dist.clean;let x = m.src.assets;w.src_assets = (o.string(x) ? [x] : x).map((a) => ({ name: a, from: s(v, a), to: s(u, a) }));let y = m.src.pages;w.src_globs = o.string(y) ? [y] : y;let z = m.src.scripts;w.src_script_globs = o.string(z) ? [z] : z;let A = m.src.styles;w.src_styles_globs = o.string(A) ? [A] : A;let B = m.src.concat || {};w.concat = Object.keys(B).map((a) => ({ name: a, to: s(u, a), from: B[a].map((a) => s(v, a)) }));let C = m.hook || {},D = {};Object.keys(C).map((a) => {D[a.replace(l, '')] = { command: C[a], asynchronous: a.startsWith(l) };}), w.hook = D;let E = {},F = m.processor || {};E.watchify = Object.assign({}, j.WATCHIFY, F.watchify || {}), E.browserify = F.browserify || j.BROWSERIFY;let { transform: G } = E.browserify;return o.array(G) || e('processor.browserify.transform'), E.browserify.transform = G.map((a) => o.string(a) ? { name: a + '' } : a), ['watchify', 'browserify'].map((a) => !1 === E[a].enable ? h(`processor.${a}.enable`) : a).map((a) => delete E[a + ''].enable), ['sass', 'less', 'autoprefixer', 'ejs', 'ejs_variables', 'ejs_template_tags', 'pug', 'html_minifier', 'babel', 'source_map', 'browser_sync'].map((a) => ({ name: a, config: F[a] })).map(({ name: a, config: b }) => E[a] = o.objectHasEnableField(b) ? b : { enable: !!b }), w.processor = E, w;} };
})();