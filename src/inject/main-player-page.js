import injectUtils from "./utils";

export function getInjectScript(paramters) {
	const injectHelperName = 'chromeAvgleHelper';
	return `
		${injectUtils.getInjectUtilsScript(injectHelperName)};
		(${main.toString()})(
			${injectHelperName},
			${JSON.stringify(paramters)}
		);`;
}

/**
 * @param {injectUtils} utils
 * @param {any} paramters
 */
function main(utils, paramters = {}) {
	const { $, el } = utils;
	const injectBoxClassName = 'chrome-avgle-extension-inject-box';
	const injectCarNumberClassName = 'chrome-avgle-extension-player-car-number';

	/** @type {'avgle'|'xvideos'} */
	const pageType = paramters.pageType;
	const tabURL = String(paramters.tabURL || '');
	const m3u8URLBase64 = String(paramters.m3u8URLBase64 || '');

	let videoTitleDOM = $('.container .row .col-lg-12 h1');

	let tipTitle = 'Download Commands:';
	if (pageType === 'avgle') tipTitle = 'Avgle Download Commands:';
	else if (pageType === 'xvideos') tipTitle = 'XVIDEOS Download Commands:';

	let command = '';
	let carNumber = getDefaultCarNumber();
	let downloaderOpts = [];

	if (pageType === 'avgle') {
		// add car number for main title
		const node = Array.from(videoTitleDOM.childNodes).find(it => it.nodeType === Node.TEXT_NODE);
		let videoTitle = node.textContent;
		let _carNumber = utils.parseCarNumber(videoTitle);
		if (_carNumber)
			node.parentNode.insertBefore(createCarNumberElement(carNumber = _carNumber), node);
	}

	if (pageType === 'xvideos') downloaderOpts.push('type=xvideos');
	if (paramters.needDecode) downloaderOpts.push('decode=true');
	downloaderOpts.push(`name=${carNumber}`);
	downloaderOpts.push(`url=${m3u8URLBase64}`);

	command = [
		`AvgleDownloader ${downloaderOpts.join(' ')};`,
		`Avgle ${carNumber}; # combine video files`
	].join('\n');

	// make video component wider
	if (pageType === 'avgle') {
		const videoColumn = $('.video-container').parentNode.parentNode;
		videoColumn.className = "col-lg-12 col-md-12 col-sm-12";
	}

	// inject download tip box
	const injectContainer = getInjectContainer();
	if (injectContainer) {
		const injectBox = el('div',
			{
				display: 'flex', flexDirection: 'column',
				color: '#282828', backgroundColor: '#f7f7f7',
				border: '1px solid #ccc', borderRadius: '4px',
			},
			{ class: injectBoxClassName },
			[
				el('div',
					{ padding: '5px 0 0 10px', fontSize: '15px', color: '#888' },
					null,
					tipTitle),
				el('pre',
					{
						padding: '5px 15px 9px 15px', margin: '0',
						fontSize: '13px', lineHeight: '1.5',
						wordBreak: 'break-all', wordWrap: 'break-word',
						border: 'none',
					},
					null,
					el('code',
						{
							padding: 0, fontSize: '13px',
							color: '#222222', backgroundColor: 'transparent',
							whiteSpace: 'pre-wrap',
						},
						null,
						command)
				)
			]
		);
		injectContainer.appendChild(injectBox);
	}

	chrome.runtime.sendMessage({ carNumber });

	// End of injection process
	// =======================================
	//#region Helper function

	function getInjectContainer() {
		let injectContainer;
		if (pageType === 'avgle') {
			injectContainer = videoTitleDOM.parentNode.parentNode;
		} else if (pageType === 'xvideos') {
			injectContainer = $('.video-metadata.video-tags-list');
		}

		if (injectContainer) {
			const oldBox = $(`.${injectBoxClassName}`, injectContainer);
			if (oldBox)
				oldBox.parentNode.removeChild(oldBox);
		}
		return injectContainer;
	}
	function getDefaultCarNumber() {
		if (pageType === 'avgle') {
			const avgleId = tabURL.match(/\/video\/(\w+)\//);
			return `avgle-${avgleId ? avgleId[1] : 'unknown'}`;
		}
		if (pageType === 'xvideos') {
			const videoId = tabURL.match(/\/(video\w+)\//);
			return `xvideos-${videoId ? videoId[1] : 'unknown'}`;
		}
		return 'unknown';
	}
	function createCarNumberElement(carNumber) {
		return el('b',
			{ color: '#77b300', margin: '0 0.5em', fontSize: '18px' },
			{ class: injectCarNumberClassName },
			carNumber);
	}
	//#endregion
}
