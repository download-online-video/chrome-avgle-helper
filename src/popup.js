//@ts-check
/// <reference path="./index.d.ts" />

window.addEventListener('load', () => {
	let consoleContainer = document.querySelector('#container');
	let port = chrome.runtime.connect({ name: "popup" });
	port.onMessage.addListener(logHtml => {
		consoleContainer.insertAdjacentHTML('beforeend', String(logHtml));
		consoleContainer.scrollTo(0, consoleContainer.scrollHeight);
	});
	document.querySelector('#clear').addEventListener('click', () => {
		consoleContainer.innerHTML = '';
		port.postMessage('clear-log');
	});
});
