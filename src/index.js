//@ts-check
/// <reference path="./index.d.ts" />

import { M3U8_PATTERN_ARRAY, VIDEO_PAGE_PATTERN } from "./config";
import { getInjectScript } from "./inject_to_player";
import { info, getLogHistoryHTML, error, bindLogCallback, unbindLogCallback, clearLogHistory } from "./logger";

info('Chrome Avgle Helper background script started!');
info(`Extension id: ${chrome.runtime.id}`);

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

chrome.webRequest.onBeforeRequest.addListener(details => {
	// Ignore extension itself
	if (details.tabId < 0)
		return;

	info(`Captured m3u8 request (method: ${details.method}) from tab(id: ${details.tabId}):` +
		`\n${details.url}`);

	chrome.tabs.get(details.tabId, tab => {
		info(`Tab title: ${tab.title}`);
		info(`Tab URL: ${tab.url}`);
		if (!tab.url.match(VIDEO_PAGE_PATTERN))
			return info("Ignore this tab!");

		let m3u8URL = details.url;
		let m3u8URLBase64 = btoa(m3u8URL);

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
