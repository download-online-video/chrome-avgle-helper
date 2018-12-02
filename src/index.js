//@ts-check
/// <reference path="./index.d.ts" />

import { M3U8_PATTERN_ARRAY, VIDEO_PAGE_PATTERN, PROCESSABLE_M3U8_PATTERN } from "./config";
import { getInjectScript } from "./inject_to_player";
import { info, getLogHistoryHTML, error, bindLogCallback, unbindLogCallback, clearLogHistory } from "./logger";

info('Chrome Avgle Helper background script started!');
info(`Extension id: ${chrome.runtime.id}`);

// Listening a virtual port named "popup" in chrome.
//   It is used for communicate with popup window (log transfer)
chrome.runtime.onConnect.addListener(port => {
	if (port.name != "popup") {
		error(`unknown connection with name: ${port.name}`);
		return port.disconnect();
	}
	info('log connection established', 'muted');

	bindLogCallback(log => port.postMessage(log));
	port.postMessage(getLogHistoryHTML());

	port.onMessage.addListener(msg => {
		if (msg == 'clear-log') {
			clearLogHistory();
			info('log cleared', 'muted');
			return;
		}
	});
	port.onDisconnect.addListener(() => {
		unbindLogCallback();
		info('log connection disconnected', 'muted');
	});
});

// Listening onBeforeSendHeaders for capture m3u8 playlist request
chrome.webRequest.onBeforeRequest.addListener(details => {
	// Ignore extension itself
	if (details.tabId < 0)
		return;

	info([
		`Captured m3u8 request`,
		`  tabId: ${details.tabId}`,
		`  ${details.method} ${details.url}`
	].join('\n'));

	chrome.tabs.get(details.tabId, tab => {
		info(`Tab title: ${tab.title}`);
		info(`Tab URL: ${tab.url}`);
		if (!tab.url.match(VIDEO_PAGE_PATTERN))
			return info(`Ignore: URL of tab is not matched with ${String(VIDEO_PAGE_PATTERN)}`);

		let m3u8URL = details.url;
		let m3u8URLBase64 = btoa(m3u8URL);

		let matchedProcesser = null;
		for (const processer of PROCESSABLE_M3U8_PATTERN) {
			if (processer.pattern.test(m3u8URL)) {
				matchedProcesser = processer;
				break;
			}
		}

		if (!matchedProcesser)
			return info(`Ignore: URL of m3u8 request is not matched with any pattern in PROCESSABLE_M3U8_PATTERN`);


		// let xhr = new XMLHttpRequest();
		// xhr.open('GET', m3u8URL);
		// xhr.onload = () => {
		// 	if (xhr.readyState != 4 || xhr.status != 200)
		// 		return onXHRError();
		// };
		// xhr.onerror = onXHRError;
		// xhr.send();

		injectScript(null, { m3u8URLBase64, tabURL: tab.url });

		function injectScript(err, parameters = {}) {
			if (err && (typeof err != 'string'))
				err = 'message' in err ? `${err.message}\n${err.stack}` : String(err);

			chrome.tabs.executeScript(details.tabId, {
				code: getInjectScript(err, parameters)
			}, () => { info('Inject script success!'); });
		}

		// /** @param {ErrorEvent} [errorEvent]  */
		// function onXHRError(errorEvent) {
		// 	let message = ['Request m3u8 file failed!'];
		// 	if (errorEvent) message.push(`  ErrorType: ${errorEvent.type}`);
		// 	message.push(`  URL: ${m3u8URL}`);
		// 	message.push(`  ReadyState: ${xhr.readyState}`);
		// 	message.push(`  Status: ${xhr.status} (${xhr.statusText})`);

		// 	let response = String(xhr.responseText), responseLength = response.length;
		// 	if (response.length > 100)
		// 		response = response.slice(0, 100) + `... (length: ${responseLength})`;
		// 	message.push(`  Response: ${response}`);
		// 	return injectScript(message.join('\n'), {});
		// }
	});

}, { urls: M3U8_PATTERN_ARRAY });

// Add listener for opening console
// https://developer.chrome.com/extensions/browserAction#event-onClicked
chrome.browserAction.onClicked.addListener(() => {
	const url = chrome.extension.getURL('dist/popup.html');
	chrome.tabs.query({ url }, tabs => {
		// console window is existed
		if (tabs.length > 0) {
			const tab = tabs[0];
			chrome.tabs.update(tab.id, { active: true }, noop);
			return;
		}
		// create new one
		chrome.tabs.create({ url, active: false }, tab => {
			chrome.windows.create({
				tabId: tab.id,
				type: 'popup', focused: true, width: 800, height: 400,
			}, noop);
		});
	});
});

/** An empty callback */
function noop() { }
