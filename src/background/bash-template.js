export class BashTemplate {

	/**
	 * @param {string} templateUri
	 */
	constructor(templateUri, ) {
		this.uri = templateUri;
		this.ok = false;
		this.error = null;
		this.bashTemplate = '';
	}

	/**
	 * @param {(bashTemplate: string) => any} [onInit]
	 */
	init(onInit) {
		this.ok = false;
		fetch(this.uri)
			.then(response => {
				if (response.status !== 200)
					throw new Error(`Response status code is ${response.status} (${this.uri})`);
				return response.text();
			}).then(bashTemplate => {
				this.ok = true;
				this.error = null;
				this.bashTemplate = bashTemplate;

				if(typeof onInit === 'function')
					setTimeout(onInit, 0, bashTemplate);
			}).catch(error => {
				this.ok = false;
				this.error = error;
			});
	}

	compile(context) {
		if (!this.ok) {
			if (this.error)
				throw this.error;
			throw new Error(`Request ${this.uri} not yet finished`);
		}
		return this.bashTemplate.replace(/\{\{\s+(\w+)\s+\}\}/g, replacer.bind(context));
	}

	/**
	 * @param {RegExp} regex
	 * @param {number} [groupId]
	 * @returns {string}
	 */
	matchString(regex, groupId = 0) {
		if (!this.ok) return '';
		if (!this.bashTemplate) return '';

		const matched = this.bashTemplate.match(regex);
		if (!matched) return '';
		return matched[groupId] || '';
	}

}

function replacer(matched, varName) {
	const value = String(this && this[varName] || '');
	return value.replace(/'/g, "'\\''");
}

function noop() { }
