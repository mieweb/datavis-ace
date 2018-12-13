const assert = require('assert');
const Grid = require('../lib/grid.js');
const {asyncEach} = require('../lib/util.js');
const child_process = require('child_process');

const {Builder, Browser, By, Key, until} = require('selenium-webdriver');
const {Preferences: LoggingPrefs, Type: LoggingType, Level: LoggingLevel} = require('selenium-webdriver/lib/logging');

describe('Kitchen Sink', function() {
	const logging = new LoggingPrefs();
	logging.setLevel(LoggingType.BROWSER, LoggingLevel.ALL);
	const driver = new Builder().forBrowser('chrome').setLoggingPrefs(logging).build();

	it('sorts', async function() {
		await driver.get('https://zeus.med-web.com/~tvenable/datavis/tests/grid/default.html');
		let grid = new Grid(driver);

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
			['float1', '11.42705032', '9961.5821357', 'float (number → number)'],
			['float2', '11.42705032', '9961.5821357', 'float (string → number)'],
			['float3', '11.427', '9961.582', 'float (string → numeral)'],
			['currency1', '$11.43', '$9,961.58', 'currency (number : currency → number)'],
			['currency2', '$11.43', '$9,961.58', 'currency (string : currency → number)'],
			['currency3', '$11.43', '$9,961.58', 'currency (string : currency → numeral)'],
			['currency4', '$11.43', '$9,961.58', 'currency (string : string → numeral)'],
			['date1', '1900-07-12', '2099-09-08', 'date (string → string)'],
			['date2', 'Jul 12, 1900', 'Sep 8, 2099', 'date (string → moment)'],
			['date3', '07/12/1900', '09/08/2099', 'date (string → moment)']
		];

		await grid.waitForIdle();

		return asyncEach(sortInfo, async (si) => {
			const [field, min, max] = si;

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

	after(() => driver && driver.quit());
});
