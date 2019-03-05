const assert = require('assert');
const _ = require('lodash');
const Grid = require('../lib/grid.js');
const {sleep} = require('../lib/util.js');

const {Builder, Browser, By, Key, until} = require('selenium-webdriver');
const {Preferences: LoggingPrefs, Type: LoggingType, Level: LoggingLevel} = require('selenium-webdriver/lib/logging');

describe('Sort', function() {
	const logging = new LoggingPrefs();
	logging.setLevel(LoggingType.BROWSER, LoggingLevel.ALL);
	let driver;
	let grid;
	
	before(async function () {
		driver = new Builder().forBrowser('chrome').setLoggingPrefs(logging).build();
		await driver.get('https://zeus.med-web.com/~tvenable/datavis/tests/grid/default.html');
		grid = new Grid(driver);
		await grid.waitForIdle();
	});

	after(async function () {
		if (driver != null) {
			driver.quit();
		}
	});

	const sortInfo = [
		['string1', 'Erotes', 'zigzagged', 'random dictionary word'],
		['int1', '18', '9882', 'integer (number → number)'],
		['int2', '18', '9882', 'integer (string → number)'],
		['int3', '18', '9882', 'integer (string → numeral)'],
		['int4', '18', '9882', 'integer (number → numeral)'],
		['int5', '18', '9882', 'integer (string → numeral)'],
		['int6', '18', '9882', 'integer (string → numeral)'],
		['int7', '18', '9882', 'integer (number → bignumber)'],
		['int8', '18', '9882', 'integer (string → bignumber)'],
		['int9', '18', '9882', 'integer (string → bignumber)'],
		['float1', '11.427050324968356', '9961.582135696373', 'float (number → number)'],
		['float2', '11.427050324968356', '9961.582135696373', 'float (string → number)'],
		['float3', '11.427', '9961.582', 'float (string w/ commas → number)'],
		['float4', '11.427050324968356', '9961.582135696373', 'float (number → numeral)'],
		['float5', '11.427050324968356', '9961.582135696373', 'float (string → numeral)'],
		['float6', '11.427', '9961.582', 'float (string w/ commas → numeral)'],
		['float7', '11.427050324968356', '9961.582135696373', 'float (number → bignumber)'],
		['float8', '11.427050324968356', '9961.582135696373', 'float (string → bignumber)'],
		['float9', '11.427', '9961.582', 'float (string w/ commas → bignumber)'],
		['currency1', '$11.43', '$9,961.58', 'currency (number : currency → number)'],
		['currency2', '$11.43', '$9,961.58', 'currency (string : currency → number)'],
		['currency3', '$11.43', '$9,961.58', 'currency (string : currency → numeral)'],
		['currency4', '$11.43', '$9,961.58', 'currency (string : string → numeral)'],
		['date1', 'November 30, 1901', 'January 10, 2094', 'date (string → string)'],
		['date2', 'November 30, 1901', 'January 10, 2094', 'date (string → moment)'],
		['date3', 'November 30, 1901', 'January 10, 2094', 'date (string → moment)']
	];

	_.each(sortInfo, async (si) => {
		const [field, min, max, desc] = si;

		it(`${field}, ${desc}`, async function () {
			await grid.sortBy(field, `${field}, Ascending`);
			await grid.waitForIdle();
			assert.equal(await grid.getCell(field, 0), min);
			assert.equal(await grid.getCell(field, -1), max);

			await grid.sortBy(field, `${field}, Descending`);
			await grid.waitForIdle();
			assert.equal(await grid.getCell(field, 0), max);
			assert.equal(await grid.getCell(field, -1), min);
		});
	});
});
