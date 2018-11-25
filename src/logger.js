//@ts-check
/// <reference path="./index.d.ts" />

const MAX_HISTORY = 1000;
const AVG_HISTORY = 700;

/** @type {LogItem[]} */
let history = [];
/** @type {Function} */
let logCallback = undefined;


/**
 * @param {string} content
 */
function push2history(content, type ="info") {
	let ctx = { t: Date.now(), c: content, type};
	if (history.length >= MAX_HISTORY)
		history = history.slice(MAX_HISTORY - AVG_HISTORY);
	history.push(ctx);
	if (logCallback)
		logCallback(logItem2html(ctx));
	return ctx;
}

let escapeMap = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;',
	'/': '&#x2F;',
	'`': '&#x60;',
	'=': '&#x3D;'
};
let escape = text => text.replace(/[&<>"'`=\/]/g, matched => escapeMap[matched]);

export function bindLogCallback(callback) { logCallback = callback; }
export function unbindLogCallback() { logCallback = undefined; }

/**
 * @param {LogItem} item
 */
function logItem2html(item) {
	let d = new Date(item.t);
	let part = item.c.split(/(https?:\/\/\S+)/).map(ctx => ctx.match(/^https?:\/\//)
		? `<a href="${encodeURI(ctx)}" target="_blank">${escape(decodeURI(ctx))}</a>`
		: escape(ctx));
	return `<div class="${item.type}">
		<span class="prefix">${escape(d.toLocaleDateString() + " " + d.toLocaleTimeString())}</span>
		${part.join('')}
	</div>`;
}


/**
 * @param {string} content
 */
export function info(content, type = "info") {
	console.log(content);
	push2history(content, type);
}

/**
 * @param {string} content
 */
export function error(content) {
	console.error(content);
	push2history(content, "error");
}

export function clearLogHistory() {
	history = [];
}

export function getLogHistoryHTML() { return history.map(logItem2html).join('\n'); }
