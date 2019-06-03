(function main() {
	const background = chrome.extension.getBackgroundPage();
	const context = background && background.__avgle_helper_context;
	if (!context) return;

	const $header = $('#header');
	const $status = $('#status');

	/** @type {chrome.tabs.Tab} */
	let tab = null;
	let tabInfo = null;

	getCurrentTabStorage();
	bindItemClickListener();
	showContents();

	function getCurrentTabStorage() {
		chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
			if (tabs.length <= 0) return;

			tab = tabs[0];
			tabInfo = context.queryTabStorage(tab.id);
			if (tabInfo.carNumber) {
				$header.className += ' matched';
				$status.innerText = tabInfo.carNumber;
				$('#groupMatchedVideo').style.display = 'block';
			}
		});
	}

	function bindItemClickListener() {
		$$('.menuOption').forEach(item => {
			item.addEventListener('click', onClickItem);
		});

	}

	function showContents() {
		setTimeout(() => $('#main').style.opacity = 1, 200);
	}

	/**
	 * @this {HTMLElement}
	 * @param {Event} event
	 */
	function onClickItem(event) {
		const itemId = this.getAttribute('data-id');
		switch (itemId) {
			case 'download': context.downloadVideoDownloaderScript(tabInfo); break;
			case 'console': context.openConsolePage(); break;
			case 'settings': context.openSettingsPage(); break;
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
