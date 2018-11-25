let exportFunctions = {
	getInjectCodes,
	parseCarNumber
};
export default exportFunctions;

function getInjectCodes(wrapperName) {
	let result = `window.${wrapperName} = {};`;
	result += Object.keys(exportFunctions).map(funcName => {
		let funcBody = exportFunctions[funcName].toString();
		return `${wrapperName}.${funcName} = ${funcBody};`
	}).join('');
	return result;
}

function parseCarNumber(str = '') {
	const matchers = [
		//LOVE series ...
		[/LOVE[-\s](\d{3,4})/i, match => `LOVE-${match[1]}`],

		//10musume 123117_01 ...
		[/10musume[-_\s](\d{6})[-_\s](\d{2})/i, match => `10musume-${match[1]}-${match[2]}`],

		// fc2-ppv-10045 or fc2ppv-10056 ...
		[/fc2[\s\-_]?ppv[\s\-_]?(\d+)/i, match => `FC2-PPV-${match[1]}` ],

		// S-Cute Ava #1
		[/S-Cute\s+(\w+)\s+#(\d+)/i, match => `S-Cute-${match[1]}-${match[2]}`],

		//Heydouga
		[/Heydouga[-_\s]?(\d+)[-_\s]?(\d+)/i, match => `Heydouga-${match[1]}-${match[2]}`],

		//heyzo
		[/heyzo[-_\s]?(\d+)/i, match => `heyzo-${match[1]}`],

		//Caribbean
		[/(\d+)[-_\s](\d+)[-_\s]Carib(?:bean(?:com)?)?/i, match => `carib-${match[1]}-${match[2]}`],
		[/Carib(?:bean(?:com)?)?[-_\s]?(\d+)[-_\s]?(\d+)/i, match => `carib-${match[1]}-${match[2]}`],

		//xxx-010 ...
		/\w+-\d+/i,

		//xxxxx-01223-123
		[/(\w{8,})[-_\s](\d{5,})[-_\s](\d{3,})/, match => `${match[1]}-${match[2]}-${match[3]}`]
	];

	for (let matcher of matchers) {
		// isArray with result convertor
		if (Array.isArray(matcher)) {
			let result = str.match(matcher[0]);
			if (result)
				return matcher[1](result);
		} else {
			let result = str.match(matcher);
			if (result)
				return result[0];
		}
	}

	return null;
}
