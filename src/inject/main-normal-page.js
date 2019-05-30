///
/// This file will be injected into normal pages by Chrome.
/// because this file be registered in manifest.json
///

import helper from "./utils";

const { el, parseCarNumber } = helper;

// display car number
document.querySelectorAll('.video-title').forEach(e => {
	const car = parseCarNumber(e.innerText);

	e.parentNode.appendChild(
		el('div',
			{
				color: car ? '#77b300' : '#888',
				fontSize: '14px',
				lineHeight: '1.5',
			},
			null,
			el('b', null, null, car || 'Unknown')
		)
	);
});
