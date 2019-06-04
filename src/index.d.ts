type SystemInfo = {
	isWin: boolean;
	is64bit: boolean;
	defaultLanguage: 'en' | 'zh-Hans' | 'zh-Hant';
};

type LogItem = {
	/**
	 * @type {number} timestamp
	 */
	t: number;

	/**
	 * @type {string} content
	 */
	c: string;

	type: string;
};
