export function openConsolePage() {
	openExtensionInternalURI('dist/console/index.html', { active: false })
		.then(tab => {
			chrome.windows.create({
				tabId: tab.id,
				type: 'popup', focused: true, width: 800, height: 400,
			}, (win) => { });
		});
}

export function openSettingsPage() { openExtensionInternalURI(`dist/settings/index.html`); }
export function openHelpPage() { openExtensionInternalURI(`dist/help/index.html`); }

/**
 * @param {string} uri
 * @param {chrome.tabs.CreateProperties} [options]
 * @returns {Promise<chrome.tabs.Tab>}
 */
export function openExtensionInternalURI(uri, options) {
	// chrome.tabs.create({ url: `chrome://extensions/?options=${chrome.runtime.id}` });
	const url = chrome.extension.getURL(uri);
	return new Promise(resolve => {
		chrome.tabs.query({ url }, tabs => {
			if (tabs.length > 0) {
				const tab = tabs[0];
				chrome.tabs.update(tab.id, { active: true }, resolve);
				return;
			}
			chrome.tabs.create(Object.assign({ url }, options || {}), resolve);
		});
	})
}
