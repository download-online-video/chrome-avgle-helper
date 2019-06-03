///
/// Reference StackOverflow:
///   https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript/2117523#2117523


let hasCryptoModule = typeof crypto !== 'undefined'
	&& typeof crypto.getRandomValues === 'function';
export const uuid = hasCryptoModule ? crypto_getRandomValues : math_random;

function math_random() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
		const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
		return v.toString(16);
	});
}

function crypto_getRandomValues() {
	return String([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
		(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
	);
}
