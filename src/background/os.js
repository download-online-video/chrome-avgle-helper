/// <reference path="../index.d.ts" />

/** @type {SystemInfo} */
let infoCache = null;

/**
 * @param {(info: SystemInfo) => any} callback
 */
export function getSystemInfo(callback) {
	if (infoCache)
		return callback(infoCache);

	Promise.all([
		getPlatformInfo(),
		getLanguageInfo(),
	]).then(results => {
		const [info, languages] = results;

		let isWin = true;
		if (info && !/win/i.test(info.os))
			isWin = false;

		let is64bit = false;
		if (info && /64/.test(info.arch) || /64/.test(info.nacl_arch))
			is64bit = true;

		/** @type {'en'|'zh-Hans'|'zh-Hant'} */
		let defaultLanguage = 'en';
		if (languages && languages[0]) {
			const lang = String(languages[0]).toLowerCase();
			if (lang === 'zh') {
				defaultLanguage = 'zh-Hans';
			} else if (lang.indexOf('zh-') >= 0) {
				defaultLanguage = /-(?:tw|hk|hant)/.test(lang) ? 'zh-Hant' : 'zh-Hans';
			}
		}

		infoCache = { isWin, is64bit, defaultLanguage };
		callback(infoCache);
	});
}

function getLanguageInfo() {
	return new Promise(resolve => {
		chrome.i18n.getAcceptLanguages(resolve);
	});
}

function getPlatformInfo() {
	return new Promise(resolve => {
		chrome.runtime.getPlatformInfo(resolve);
	});
}
