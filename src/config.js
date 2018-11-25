/**
 * This URL pattern array is used for catching video playlist request
 * 用于拦截视频列表 m3u8 文件请求的 URL Pattern 数组
 */
export const M3U8_PATTERN_ARRAY = [
	'*://*.ahcdn.com/*.m3u8',
	'*://*.cdn.qooqlevideo.com/*.m3u8'
];

/**
 * URL pattern of Avgle video player page
 * Avgle 视频播放页面的 URL Pattern
 */
export const VIDEO_PAGE_PATTERN = /(https|http):\/\/avgle.com\/video\/\w+/;
