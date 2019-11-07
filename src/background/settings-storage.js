///
/// https://developers.chrome.com/extensions/storage
///
/// chrome.storage.sync
///   QUOTA_BYTES: 102,400 (100k)
///   QUOTA_BYTES_PER_ITEM: 8,192 (8k)
///   MAX_ITEMS: 512
///   MAX_WRITE_OPERATIONS_PER_HOUR: 1,800

import * as os from "./os";
import * as log from "./logger";

export const settingDefaultValues = {
	language: () => new Promise(resolve => os.getSystemInfo(info => resolve(info.defaultLanguage))),
	concurrentDownloads: '5',
	deleteTempFiles: 'ask',
	deleteDownloader: 'ask',
	proxy: '',
};
export const settingKeyNames = Object.keys(settingDefaultValues);
export const settingKeyNameSet = new Set(settingKeyNames);


class SettingsStorage {
	constructor() {
		this._settings = null;
	}
	init() { return this.get(true); }
	get(reload = false) {
		if (!reload && this._settings)
			return Promise.resolve(this._settings);
		return Promise.all([
			getDefaultSettings(),
			new Promise(resolve => chrome.storage.sync.get(settingKeyNames, resolve)),
		]).then(args => {
			const [defaultSettings, settings] = args;
			const fullSettings = Object.assign({}, defaultSettings, settings);
			this._settings = fullSettings;

			console.log(fullSettings);
			return fullSettings;
		}).catch(error => {
			log.error(`Load settings from chrome.storage.sync failed: ${error.message || error}`);
			return {};
		});
	}
	save(newSettings) {
		const validKeys = Object.keys(newSettings)
			.filter(it => settingKeyNameSet.has(it))
			.filter(it => it !== 'language'); // setting `language` is managed by Chrome

		const update = {};
		for (const key of validKeys) {
			const value = newSettings[key];
			if (value === this._settings[key])
				continue;
			update[key] = value;
		}
		if (!Object.keys(update).length)
			return Promise.resolve([]);

		return new Promise(resolve => {
			chrome.storage.sync.set(update, () => {
				if (chrome.runtime.lastError) {
					log.error('Save settings to chrome.storage.sync failed: ' +
						chrome.runtime.lastError.message);
				}
				this.init().then(() => resolve(Object.keys(update)));
			})
		});
	}
}

export const storage = new SettingsStorage();
export function getDefaultSettings() {
	const result = {};

	let thenable = Promise.resolve(true);
	settingKeyNames.forEach(key => {
		let value = settingDefaultValues[key];
		if (typeof value === 'function')
			value = value();
		if (value && typeof value.then === 'function')
			thenable = thenable.then(() => value).then(realValue => result[key] = realValue);
		else
			result[key] = value;
	});

	return thenable.then(() => result);
}
