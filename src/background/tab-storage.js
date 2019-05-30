
export class TabStorage {
	constructor() {
		this.map = new Map();
	}

	/**
	 * @param {number} tabId
	 */
	delete(tabId) {
		this.map.delete(tabId);
	}

	/**
	 * @param {number} tabId
	 * @param {any} object
	 */
	update(tabId, object) {
		const oldObject = this.map.get(tabId);
		object = Object.assign(oldObject || {}, object);
		this.map.set(tabId, object);
	}

	/**
	 * @param {number} tabId
	 */
	get(tabId) {
		return this.map.get(tabId) || {};
	}
}
