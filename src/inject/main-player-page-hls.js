import injectUtils from "./utils";

export function getInjectScript(paramters) {
	const injectHelperName = 'chromeAvgleHelper';
	const coreCode = `
		(function core() {
			${injectUtils.getInjectUtilsScript(injectHelperName)};
			(${main.toString()})(${injectHelperName},${JSON.stringify(paramters)});
		})();
	`;
	const wrapCode = `
		const s = document.createElement('script');
		s.textContent = ${JSON.stringify(coreCode)};
		document.documentElement.appendChild(s);
		document.documentElement.removeChild(s);
	`;
	return wrapCode;
}

/**
 * This function will be invoked after the player page be loaded
 *
 * @param {injectUtils} utils
 * @param {any} parameters
 */
function main(utils, parameters = {}) {
	// https://github.com/download-online-video/chrome-avgle-helper/issues/21
	waitForVideoJS(100, () => {
		const player = videojs('video-player');
		player.on('loadedmetadata', () => {
			logInfo(`Detected the hls.js loadedmetadata event!`);

			const arr = [];
			try {
				const segments = player.tech_.hls.playlists.media_.segments;
				segments.forEach(x => arr.push({ uri: x.resolvedUri }));
				arr.forEach(videojs.Hls.xhr.beforeRequest);
				arr.forEach(x => typeof x.decryptURI === 'function' && x.decryptURI());
			} catch (error) {
				return logError(error);
			}

			if (arr.length <= 0)
				return logError(`Invalid hls.js segments: length <= 0`);
			const invalidItemIndex = arr.findIndex(x => !x.uri);
			if (invalidItemIndex >= 0)
				return logError(`Invalid hls.js segments: segments[${invalidItemIndex}] doesn't have 'uri'`);

			const uris = arr.map(x => x.uri);
			sendMessage({ segments: uris });
		});
	});


	// console.log(`parameters=`, parameters)
	const { $, el } = utils;
	const classes = {
		commandBox: 'chrome-avgle-extension-inject-box',
		videoNumberTag: 'chrome-avgle-extension-player-car-number',
	};

	const videoTitleDOM = $('.container .row .col-lg-12 h1');
	const pageType = 'avgle';

	let tipTitle = 'Download This Video:';
	let command = '';
	let videoNumber = getDefaultCarNumber();

	const info = getVideoInfo();
	if (info && info.number) {
		videoNumber = utils.buildVideoFullName({ videoNumber: info.number, episode: info.episode });
		const { insertPoint } = info;
		utils.removeElement($(`.${classes.videoNumberTag}`, insertPoint.parentNode));
		insertPoint.parentNode.insertBefore(createCarNumberElement(videoNumber), insertPoint);
	}

	command = 'Click the "Download Video" item in the extension popup menu';

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
	sendMessage({ carNumber: videoNumber, wait: 'segments' });

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

		if (injectContainer)
			utils.removeElement($(`.${classes.commandBox}`, injectContainer));
		return injectContainer;
	}
	function getDefaultCarNumber() {
		const tabURL = String(location.href || '');
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

	/**
	 * Get video info from title element
	 * @returns {{title:string;number:string;episode:string;insertPoint:Node}}
	 */
	function getVideoInfo() {
		if (!videoTitleDOM) return;
		let title = '', episode = '', number = '', insertPoint, hasOtherEpisodes = false;
		const nodes = Array.from(videoTitleDOM.childNodes);
		for (let i = 0; i < nodes.length; i++) {
			const node = nodes[i];
			if (!title && node.nodeType === Node.TEXT_NODE) {
				title = String(node.textContent || '').trim();
				number = utils.parseCarNumber(title);
				insertPoint = node;
				const mtx = title.match(/^[\s\S]+-\s+(\d+)$/);
				if (mtx && mtx[1]) episode = mtx[1];
				continue;
			}
			// This node is HTML tag
			if (node.nodeType === Node.ELEMENT_NODE) {
				// This node is a link tag and it is after title node.
				// So means this video has more than one episode.
				if (node.tagName === 'A' && title) {
					hasOtherEpisodes = true;
					continue;
				}
			}
		}
		if (!hasOtherEpisodes) episode = '';
		return { title, number, episode, insertPoint };
	}
	//#endregion

	/**
	 * @param {number} timeout
	 * @param {Function} callback
	 */
	function waitForVideoJS(timeout, callback) {
		if (typeof videojs !== 'function') {
			if(timeout <= 0)
				return console.log('videojs is undefined!');
			return setTimeout(waitForVideoJS.bind(this, timeout - 1, callback), 100);
		}
		callback();
	}

	function sendMessage(message) {
		chrome.runtime.sendMessage(parameters.extensionId,
			Object.assign(message, { code: parameters.security }));
	}
	function logInfo(log) { console.log(`Avgle Helper:`, log); sendMessage({ log }); }
	function logError(log) { console.error(`Avgle Helper:`, log); sendMessage({ logError });}
}

