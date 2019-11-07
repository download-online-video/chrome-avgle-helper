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
 * This function will be invoked when a video m3u8 file be requested from the browser tab
 *
 * @param {injectUtils} utils
 * @param {any} paramters
 */
function main(utils, paramters = {}) {
	console.log(`parameters=`, paramters)
	const { $, el } = utils;
	const classes = {
		commandBox: 'chrome-avgle-extension-inject-box',
		videoNumberTag: 'chrome-avgle-extension-player-car-number',
	};

	/** @type {'avgle'|'xvideos'} */
	const pageType = paramters.pageType;
	const tabURL = String(paramters.tabURL || '');
	const m3u8URLBase64 = String(paramters.m3u8URLBase64 || '');

	const videoTitleDOM = $('.container .row .col-lg-12 h1');

	let tipTitle = 'Download Commands:';
	if (pageType === 'avgle') tipTitle = 'Avgle Download Commands:';
	else if (pageType === 'xvideos') tipTitle = 'XVIDEOS Download Commands:';

	let command = '';
	let videoNumber = getDefaultCarNumber();
	let downloaderOpts = [];

	if (pageType === 'avgle') {
		// add video number before main title
		const node = Array.from(videoTitleDOM.childNodes).find(it => it.nodeType === Node.TEXT_NODE);
		const videoTitle = node.textContent;
		const _videoNumber = utils.parseCarNumber(videoTitle);
		if (_videoNumber) {
			videoNumber = _videoNumber;
			node.parentNode.insertBefore(createCarNumberElement(videoNumber), node);
		}
	}

	if (pageType === 'xvideos') downloaderOpts.push('type=xvideos');
	if (paramters.needDecode) downloaderOpts.push('decode=true');
	downloaderOpts.push(`name=${videoNumber}`);
	downloaderOpts.push(`url=${m3u8URLBase64}`);

	command = [
		`AvgleDownloader ${downloaderOpts.join(' ')};`,
		`Avgle ${videoNumber}; # combine video files`
	].join('\n');

	// make video component wider
	if (pageType === 'avgle') {
		const videoColumn = $('.video-container').parentNode.parentNode;
		videoColumn.className = "col-lg-12 col-md-12 col-sm-12";
	}

	// inject download commands box
	const injectContainer = getInjectContainer();
	if (injectContainer) {
		const injectBox = el('div',
			{
				display: 'flex', flexDirection: 'column',
				color: '#282828', backgroundColor: '#f7f7f7',
				border: '1px solid #ccc', borderRadius: '4px',
			},
			{ class: classes.commandBox },
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

	// Send a message to extension backend. Tell it a video number be detected.
	// So after this message is arrvied you can see the video number in the extension popup menu
	chrome.runtime.sendMessage({ carNumber: videoNumber });
	// Injection process be finished
	return;


	//#region Helper function
	function getInjectContainer() {
		let injectContainer;
		if (pageType === 'avgle') {
			injectContainer = videoTitleDOM.parentNode.parentNode;
		} else if (pageType === 'xvideos') {
			injectContainer = $('.video-metadata.video-tags-list');
		}

		if (injectContainer) {
			const oldBox = $(`.${classes.commandBox}`, injectContainer);
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
			{ class: classes.videoNumberTag },
			carNumber);
	}
	//#endregion
}
