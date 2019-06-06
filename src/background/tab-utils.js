/**
 * @param {(tab: chrome.tabs.Tab) => any} listener
 */
export function addOnTabFocusChangedListener(listener) {
	chrome.tabs.onActivated.addListener(info => {
		chrome.tabs.get(info.tabId, tab => listener(tab));
	});

	chrome.windows.onFocusChanged.addListener(windowId => {
		chrome.tabs.query({ active: true, windowId }, tabs => {
			listener(tabs.length > 0 ? tabs[0] : null);
		});
	});
}


class TabStorage {
	constructor() { this.map = new Map(); }

	init() {
		if (this.init) return;
		this.init = true;

		chrome.tabs.onRemoved.addListener(tabId => this.delete(tabId));
	}

	delete(tabId) { this.map.delete(tabId); }
	get(tabId) { return this.map.get(tabId) || {}; }
	update(tabId, object) {
		const oldObject = this.map.get(tabId);
		object = Object.assign(oldObject || {}, object);
		this.map.set(tabId, object);
	}
}
export const tabStorage = new TabStorage();

