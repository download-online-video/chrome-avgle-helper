//@ts-check

let securityCode = '';
const characters = 'abcdefghijklmnopqrstuvwxyz1234567890';
const charactersLen = characters.length;

export function refreshMessageSecurityCode() {
	let code = '';
	for (let i = 0; i < 16; i++)
		code += characters.charAt(Math.floor(Math.random() * charactersLen));
	securityCode = code;
}

export function getSecurityCode() {
	if (!securityCode) refreshMessageSecurityCode();
	return securityCode;
}

/**
 * @param {string} code
 */
export function testMessageSecurityCode(code) {
	return securityCode && code === securityCode;
}
