//@ts-check
/// <reference path="../index.d.ts" />

import { M3U8_PATTERN_ARRAY, VIDEO_PAGE_PATTERN, PROCESSABLE_M3U8_PATTERN } from "../config";
import { getInjectScript as getInjectScript4Original } from "../inject/main-player-page";
import { getInjectScript as getInjectScript4Hls } from "../inject/main-player-page-hls";
import { BashTemplate } from "./bash-template";
import { getSecurityCode, testMessageSecurityCode } from "./message-security";
import { uuid } from "./uuid";
import * as tabUtils from "./tab-utils";
import * as settings from "./settings-storage";
import * as pages from "./open-pages";
import * as log from "./logger";

log.info('Chrome Avgle Helper background script started!');
log.info(`Extension id: ${chrome.runtime.id}`);

// Export functions to global context used for invoking from popup page
global['__avgle_helper_context'] = {
	queryTabStorage,
	downloadVideoFile,

	// export modules
	modules: { tabUtils, settings, log, pages },
};

const { tabStorage } = tabUtils;
const bashTemplate = new BashTemplate(chrome.extension.getURL('dist/downloader.sh'));
const bashTemplate4hls = new BashTemplate(chrome.extension.getURL('dist/downloader-hls.sh'));

const getBashTemplateUpdateAt = (tmpl) => tmpl.matchString(/UPDATE_AT=['"](\S+)['"]/, 1);
bashTemplate.init(() => log.info(`Loaded bash template (update at: ${getBashTemplateUpdateAt(bashTemplate)})`));
bashTemplate4hls.init(() => log.info(`Loaded bash template for hls.js (update at: ${getBashTemplateUpdateAt(bashTemplate4hls)})`));

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

		const matchedPage = VIDEO_PAGE_PATTERN.find(it => it.pattern.test(tab.url));
		if (!matchedPage)
			return log.info(`Ignore: URL of tab is not matched in VIDEO_PAGE_PATTERN`);

		const pageType = matchedPage.type;
		const m3u8URL = details.url;
		const m3u8URLBase64 = btoa(m3u8URL);

		const matchedProcesser = PROCESSABLE_M3U8_PATTERN.find(it => it.pattern.test(m3u8URL));
		if (!matchedProcesser)
			return log.info(`Ignore: URL of m3u8 request is not matched with any pattern in PROCESSABLE_M3U8_PATTERN`);

		const context = {
			m3u8URL,
			m3u8URLBase64,
			tabURL: tab.url,
			pageType,
			needDecode: matchedProcesser.base64Encoded,
			extensionId: chrome.runtime.id,
			security: getSecurityCode(),
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

			let code = '';
			if (parameters.pageType === 'avgle') code = getInjectScript4Hls(parameters);
			else code = getInjectScript4Original(parameters);

			chrome.tabs.executeScript(details.tabId, { code }, () => { log.info('Inject script success!'); });
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
 * @see https://developer.chrome.com/apps/messaging
 */
function registerDownloadCommandMessageListener() {
	chrome.runtime.onMessage.addListener((message, sender, response) => {
		if (!checkMessage(message, sender, false)) return;
		onMessage(message, sender.tab.id);
	});
	chrome.runtime.onMessageExternal.addListener((message, sender, response) => {
		if (!checkMessage(message, sender)) return console.error('Invalid message');
		onMessage(message, sender.tab.id);
	});

	function checkMessage(message, sender, checkCode = true) {
		if (!message || !sender || !sender.tab || !sender.tab.id)
			return false;
		if (checkCode && !testMessageSecurityCode(message.code))
			return false;
		return true;
	}
	function onMessage(message, tabId) {
		if (message.log)
			return log.info(message.log);
		if (message.logError)
			return log.error(message.logError);

		if (message.carNumber) {
			log.info(`Video name: ${message.carNumber}`);
			tabStorage.update(tabId, { carNumber: message.carNumber, wait: message.wait });
			return;
		}
		if (message.segments) {
			log.info(`Segment Count: ${message.segments.length}`);
			tabStorage.update(tabId, { segments: message.segments });
			return;
		}
	}
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

/**
 * @param {{ carNumber?:string; segments?:string[]; wait?:string; [x:string]: any; }} tabInfo
 * @param {'downloader'|'segment-list'} [type]
 */
function downloadVideoFile(tabInfo, type = 'downloader') {
	if (!tabInfo)
		return;
	if (typeof tabInfo.carNumber === 'undefined')
		return;

	let downloaderType = 'normal';
	if (typeof tabInfo.segments !== 'undefined') {
		downloaderType = 'hls'
	} else if (tabInfo.wait === 'segments') {
		return alert(`Wait a moment, extension has not received video segments info.`);
	} else if (['m3u8URLBase64', 'pageType'].find(it => typeof tabInfo[it] === 'undefined')) {
		return;
	}

	settings.storage.get().then(settingValues => {
		console.log(settingValues);
		const context = {
			CFG_RANDOM_ID: uuid(),
			CFG_VIDEO_NAME: tabInfo.carNumber,
			CFG_M3U8_URL: tabInfo.m3u8URL,
			CFG_DECODE_M3U8: tabInfo.needDecode ? 'true' : 'false',
			CFG_PAGE_TYPE: tabInfo.pageType,
			CFG_MAX_CONCURRENT_DL: settingValues.concurrentDownloads || '5',
			CFG_USER_AGENT: navigator.userAgent,
			CFG_PROXY: settingValues.proxy || '',
			CFG_DELETE_TMP_FILES: normalizeYesNoAsk(settingValues.deleteTempFiles),
			CFG_DELETE_DOWNLOADER: normalizeYesNoAsk(settingValues.deleteDownloader),
		};
		if (downloaderType === 'hls') {
			Object.assign(context, {
				CFG_SEGMENTS: tabInfo.segments.join('\n'),
				CFG_SEGMENT_COUNT: tabInfo.segments.length,
			});
			if (type === 'segment-list')
				return downloadList(context);
		}
		if (type === 'downloader')
			downloadDownloader(context);
	});

	function downloadList(context) {
		const filename = `list-${tabInfo.carNumber}.txt`;
		const blob = new Blob([context.CFG_SEGMENTS], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		chrome.downloads.download({ url, saveAs: true, filename });
	}
	function downloadDownloader(context) {
		const filename = `download-${tabInfo.carNumber}.sh`;
		const bash = (downloaderType === 'hls' ? bashTemplate4hls : bashTemplate).compile(context);
		const blob = new Blob([bash], { type: 'text/x-shellscript' });
		const url = URL.createObjectURL(blob);
		chrome.downloads.download({ url, saveAs: true, filename });
	}
	function normalizeYesNoAsk(value) {
		if (/^(yes|true)$/i.test(value)) return 'yes';
		if (/^(no|false)$/i.test(value)) return 'no';
		return 'ask';
	}
}
