import helper from "./inject_utils";

export function getInjectScript(errorStr, paramters) {
	const injectHelperName = 'chromeAvgleHelper';

	return `
		${helper.getInjectCodes(injectHelperName)};
		(${inject2player.toString()})(
			${injectHelperName},
			${JSON.stringify(errorStr)},
			${JSON.stringify(paramters)}
		);`;
}

function inject2player(utilsContext, errorStr, paramters = {}) {
	let tabURL = String(paramters.tabURL || ''),
		m3u8URLBase64 = String(paramters.m3u8URLBase64 || '');


	let videoTitleDOM = document.querySelector('.container .row .col-lg-12 h1');

	let command = '';

	// add car number for main title
	for (let node of videoTitleDOM.childNodes) {
		if (node.nodeType == Node.TEXT_NODE) {
			let videoTitle = node.textContent;

			let carNumber = utilsContext.parseCarNumber(videoTitle);
			if (!carNumber) {
				let avgleId = tabURL.match(/\/video\/(\w+)\//);
				carNumber = `avgle-${avgleId ? avgleId[1] : 'unknown'}`;
			} else if (!document.querySelector('.chrome-avgle-extension.car-number')) {
				// if has not insert car number badge
				let carNumDOM = document.createElement('b');
				carNumDOM.className = 'text-success chrome-avgle-extension car-number';
				carNumDOM.innerText = carNumber;
				carNumDOM.style.margin = '0 .5em';
				node.parentNode.insertBefore(carNumDOM, node);
			}

			command = [
				`mkdir ${carNumber};`,
				`cd ${carNumber};`,
				`AvgleDownloader ${carNumber} ${m3u8URLBase64};`,
				`Avgle; // combine video files`
			].join('\n');
			break;
		}
	}

	let injectDiv = document.createElement('div');
	injectDiv.className = 'col-lg-12';
	if (errorStr) {
		injectDiv.className += " alert-danger";
		injectDiv.innerHTML = `
			Get Download Command Failed:
			<pre><code>${errorStr}</code></pre>
		`;
	} else {
		injectDiv.innerHTML = `
			Download Command:<br/>
			<pre><code>${command}</code></pre>
		`;
	}

	let injectContainer = videoTitleDOM.parentNode.parentNode; // .row
	injectContainer.appendChild(injectDiv);


	let videoColumn = document.querySelector('.video-container').parentNode.parentNode;
	videoColumn.className = "col-lg-12 col-md-12 col-sm-12";
}
