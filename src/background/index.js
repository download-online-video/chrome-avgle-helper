//@ts-check
/// <reference path="../index.d.ts" />

import { M3U8_PATTERN_ARRAY, VIDEO_PAGE_PATTERN, PROCESSABLE_M3U8_PATTERN } from "../config";
import { getInjectScript } from "../inject/main-player-page";
import { BashTemplate } from "./bash-template";
import { uuid } from "./uuid";
import * as tabUtils from "./tab-utils";
import * as settings from "./settings-storage";
import * as pages from "./open-pages";
import * as log from "../logger";

log.info('Chrome Avgle Helper background script started!');
log.info(`Extension id: ${chrome.runtime.id}`);

const { tabStorage } = tabUtils;

// Export functions to global context used for invoking from popup page
const exportToGloabl = (name, value) => global[name] = value;
exportToGloabl('__avgle_helper_context', {
	queryTabStorage,
	downloadVideoDownloaderScript,

	// export modules
	modules: {
		tabUtils,
		settings,
		log,
		pages,
	},
});

const bashTemplate = new BashTemplate(chrome.extension.getURL('dist/downloader.sh'));
const getBashTemplateUpdateAt = () => bashTemplate.matchString(/UPDATE_AT=['"](\S+)['"]/, 1);
bashTemplate.init(() => log.info(`Loaded bash template (update at: ${getBashTemplateUpdateAt()})`));

settings.storage.init();
tabStorage.init();

registerLoggerConnectForConsolePage();
registerDownloadCommandMessageListener();


// Listening onBeforeSendHeaders for capture m3u8 playlist request
chrome.webRequest.onBeforeRequest.addListener(details => {
	// Ignore extension itself
	if (details.tabId < 0)
		return;

	log.info([
		`Captured m3u8 request`,
		`  tabId: ${details.tabId}`,
		`  ${details.method} ${details.url}`
	].join('\n'));

	chrome.tabs.get(details.tabId, tab => {
		if (!tab)
			return log.error(`Cannot find tab with id ${details.tabId}`);

		log.info(`Tab title: ${tab.title}`);
		log.info(`Tab URL: ${tab.url}`);

		let matchedPage = VIDEO_PAGE_PATTERN.find(it => it.pattern.test(tab.url));
		if (!matchedPage)
			return log.info(`Ignore: URL of tab is not matched in VIDEO_PAGE_PATTERN`);

		let m3u8URL = details.url;
		let m3u8URLBase64 = btoa(m3u8URL);

		let matchedProcesser = PROCESSABLE_M3U8_PATTERN.find(it => it.pattern.test(m3u8URL));
		if (!matchedProcesser)
			return log.info(`Ignore: URL of m3u8 request is not matched with any pattern in PROCESSABLE_M3U8_PATTERN`);

		const context = {
			m3u8URL,
			m3u8URLBase64,
			tabURL: tab.url,
			pageType: matchedPage.type,
			needDecode: matchedProcesser.base64Encoded
		};
		tabStorage.update(tab.id, context);

		if (tab.active)
			setBrowserAction(true);

		injectScript(null, context);
		function injectScript(error, parameters = {}) {
			if (error) {
				if (typeof error != 'string')
					error = 'message' in error ? `${error.message}\n${error.stack}` : String(error);
				parameters.error = error;
			}

			chrome.tabs.executeScript(details.tabId, {
				code: getInjectScript(parameters)
			}, () => { log.info('Inject script success!'); });
		}
	});

}, { urls: M3U8_PATTERN_ARRAY });

tabUtils.addOnTabFocusChangedListener(tab =>
	setBrowserAction(tab ? queryTabStorage(tab.id).carNumber : false));

/**
 * Listen a virtual port named "console" in chrome.
 * It is used for communicate with console window (log transfer)
 */
function registerLoggerConnectForConsolePage() {
	chrome.runtime.onConnect.addListener(port => {
		if (port.name != "console") {
			log.error(`unknown connection with name: ${port.name}`);
			return port.disconnect();
		}
		log.info('log connection established', 'muted');

		log.bindLogCallback(log => port.postMessage(log));
		port.postMessage(log.getLogHistoryHTML());
		port.onMessage.addListener(msg => {
			if (msg == 'clear-log') {
				log.clearLogHistory();
				log.info('log cleared', 'muted');
				return;
			}
		});
		port.onDisconnect.addListener(() => {
			log.unbindLogCallback();
			log.info('log connection disconnected', 'muted');
		});
	});
}

/**
 * Listen a message listener for receive download command from video page.
 */
function registerDownloadCommandMessageListener() {
	chrome.runtime.onMessage.addListener((message, sender, response) => {
		if (!message || !sender || !sender.tab || !sender.tab.id)
			return;
		const { tab } = sender;

		log.info(`Video name: ${message.carNumber}`);
		tabStorage.update(tab.id, { carNumber: message.carNumber });
	});
}

function queryTabStorage(tabId) {
	return tabStorage.get(tabId);
}

/** @param {boolean} detectedVideo */
function setBrowserAction(detectedVideo) {
	chrome.browserAction.setIcon({
		path: chrome.extension.getURL(detectedVideo ? 'icons/128.png' : 'icons/128-disabled.png'),
	});
}

function downloadVideoDownloaderScript(tabInfo) {
	if (!tabInfo)
		return;
	if (['carNumber', 'm3u8URLBase64', 'pageType'].find(it => typeof tabInfo[it] === 'undefined'))
		return;

	settings.storage.get().then(settingValues => {
		const context = {
			CFG_RANDOM_ID: uuid(),
			CFG_VIDEO_NAME: tabInfo.carNumber,
			CFG_M3U8_URL: tabInfo.m3u8URL,
			CFG_DECODE_M3U8: tabInfo.needDecode ? 'true' : 'false',
			CFG_PAGE_TYPE: tabInfo.pageType,
			CFG_MAX_CONCURRENT_DL: 5,
			CFG_USER_AGENT: navigator.userAgent,
			CFG_PROXY: settingValues.proxy || '',
		};
		compileAndDownload(context);
	});

	function compileAndDownload(context) {
		const fileName = `download-${tabInfo.carNumber}.sh`;
		const bash = bashTemplate.compile(context);
		const blob = new Blob([bash], { type: 'text/x-shellscript' });
		const url = URL.createObjectURL(blob);
		chrome.downloads.download({ url, saveAs: true, filename: fileName });
	}
}
