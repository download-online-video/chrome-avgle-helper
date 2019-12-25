// eslint-disable-next-line no-unused-vars
import { ContextModules } from '../background/types';

(function main() {
	return;
	// const background = chrome.extension.getBackgroundPage();
	// const context = background && background.__avgle_helper_context;
	// if (!context) return;

	// let animationTimer = 0;

	// /** @type {ContextModules} */
	// const modules = context.modules;

	// modules.settings.storage.get().then(values => {
	// 	$$('[data-bind]').forEach(el => {
	// 		const bindName = el.getAttribute('data-bind');
	// 		const value = values[bindName];
	// 		if (typeof value !== 'undefined')
	// 			el.value = value;
	// 	});
	// 	$('#main').style.opacity = '1';
	// });

	// $('#btnSave').addEventListener('click', () => {
	// 	const values = {};
	// 	$$('[data-bind]').forEach(el => {
	// 		const bindName = el.getAttribute('data-bind');
	// 		const value = el.value;
	// 		if (typeof value !== 'undefined')
	// 			values[bindName] = value;
	// 	});
	// 	console.log(values);
	// 	modules.settings.storage.save(values).then(updated => {
	// 		showSavedNotification(null, updated);
	// 	})
	// });

	// function showSavedNotification(error, updated) {
	// 	clearTimeout(animationTimer);
	// 	const $notification = $('#notificationSave');
	// 	const style = $notification.style;
	// 	$notification.innerText = `Success: ${updated.length} settings!`;

	// 	style.opacity = '1';
	// 	animationTimer = setTimeout(() => { style.opacity = '0'; }, 2000);
	// }
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
