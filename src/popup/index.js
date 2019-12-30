// eslint-disable-next-line no-unused-vars
import { ContextModules } from '../background/types';

(function main() {
	const background = chrome.extension.getBackgroundPage();
	const context = background && background.__avgle_helper_context;
	if (!context) return;

	/** @type {ContextModules} */
	const modules = context.modules;

	const $header = $('#header');
	const $status = $('#status');

	/** @type {chrome.tabs.Tab} */
	let tab = null;
	let tabInfo = null;

	getCurrentTabStorage()
		.then(() => bindErrorNotification())
		.then(() => bindItemClickListener())
		.then(() => showMenu());

	function getCurrentTabStorage() {
		return getCurrentTab().then(_tab => {
			if (!_tab) return;
			tab = _tab;
			tabInfo = context.queryTabStorage(tab.id);
			if (tabInfo.carNumber) {
				$header.className += ' matched';
				$status.innerText = tabInfo.carNumber;
				$('#groupMatchedVideo').style.display = 'block';
			} else {
				$('#noVideoDetetced').style.display = 'block';
			}
		});
	}
	function getCurrentTab() {
		return new Promise(resolve =>
			chrome.tabs.query({ active: true, currentWindow: true }, tabs =>
				resolve(tabs[0])));
	}

	function bindErrorNotification() {
		const errors = modules.log.getErrorLogItems();
		if (!errors.length) return;

		const $error = $('#hasError');
		$error.style.display = 'block';
		$error.innerText = `${errors.length} internal error have occurred`;
		$error.addEventListener('click', () => modules.pages.openConsolePage());
	}
	function bindItemClickListener() {
		$$('.menuOption').forEach(item => {
			item.addEventListener('click', onClickItem);
		});
	}

	function showMenu() {
		$('#main').style.opacity = 1;
	}

	/**
	 * @this {HTMLElement}
	 * @param {Event} event
	 */
	function onClickItem(event) {
		const itemId = this.getAttribute('data-id');
		switch (itemId) {
			case 'download': context.downloadVideoFile(tabInfo, 'downloader'); break;
			case 'download-segment-list': context.downloadVideoFile(tabInfo, 'segment-list'); break;
			case 'console': modules.pages.openConsolePage(); break;
			case 'help': modules.pages.openHelpPage(); break;
			case 'settings': modules.pages.openSettingsPage(); break;
			default:
		}
	}
})();


/**
 * @param {string} selector
 * @param {HTMLElement | Document} element
 * @return {HTMLElement}
 */
function $(selector, element) {
	return (element || document).querySelector(selector);
}
/**
 * element.querySelectorAll (result be converted to an array)
 * @param {string} selector
 * @param {HTMLElement|Document} [element]
 * @returns {HTMLElement[]}
 */
function $$(selector, element) {
	return Array.from((element || document).querySelectorAll(selector) || []);
}
