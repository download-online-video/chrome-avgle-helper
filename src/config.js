/**
 * This URL pattern array is used for catching video playlist request
 * 用于拦截视频列表 m3u8 文件请求的 URL Pattern 数组
 */
export const M3U8_PATTERN_ARRAY = [
	// 1. Normal m3u8 file
	'*://*/*.m3u8',
	'*://*/*.m3u8?*',

	// 2. Base64 encoded m3u8 file
	'*://gooqlevideo.xyz/playback/*',
	/*
	Description:
	<https://redirect.avgle.com/videoplayback
	    ?sparams=clen,dur,ei,expire,gir,hcs,id,ip,ipbits,ipbypass,
	    itag,lmt,mime,mm,mn,ms,mv,pl,ratebypass,requiressl,shardbypass,
	    source,upn&ip=xx.xx.xx.xx ...>
	=== Then redirect to ==>
	<https://gooqlevideo.xyz/playback ...>
	*/
];

export const PROCESSABLE_M3U8_PATTERN = [
	// { pattern: /\.adcdn\.com\// },
	// { pattern: /\.ahcdn\.com\// },
	{ pattern: /\.\w+cdn\.com\// },
	{ pattern: /\.cdn\.qooqlevideo\.com\// },
	{ pattern: /\/playback\//, base64Encoded: true },
	{ pattern: /\w+\.xvideos-cdn\.com/ }, // https://hls-hw.xvideos-cdn.com
]

/**
 * URL pattern of Avgle video player page
 * Avgle 视频播放页面的 URL Pattern
 */
export const VIDEO_PAGE_PATTERN = [
	{ pattern: /^(https|http):\/\/avgle.com\/video\/\w+/, type: 'avgle' },
	{ pattern: /^(https|http):\/\/(?:www\.)xvideos.com\/video\w+/, type: 'xvideos' },
];
