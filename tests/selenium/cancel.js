const {assert} = require('chai');
const _ = require('lodash');
const Grid = require('../lib/grid.js');
const {setupServer, sleep, isVisible, createDriver} = require('../lib/util.js');

const {By, until} = require('selenium-webdriver');

describe('Source Cancel', function () {
	setupServer();
	let driver;
	let grid;

	before(async function () {
		driver = await createDriver();
		await driver.get('http://localhost:3000/tests/pages/grid/source/cancel.html');
		grid = new Grid(driver);
	});

	after(async function () {
		if (driver != null) {
			await driver.quit();
		}
	});

	describe('Cancellable source', function () {
		it('should show "not loaded" when cancel button clicked', async function () {
			await sleep(0.5);
			assert.equal(await isVisible(grid.ui.sourceCancelBtn), true);
			await grid.ui.sourceCancelBtn.click();
			await sleep(0.5);

			const titleText = await driver.findElement(By.css('.wcdv_grid_titlebar .headingInfo')).getText();
			const numRows = await grid.getNumRows();

			assert.include(titleText.toLowerCase(), 'not loaded');
			assert.equal(numRows, 0);
		});

		it('should load 1000 rows when show/hide button clicked', async function () {
			await grid.ui.showHideGridBtn.click();
			await grid.waitForIdle({timeout: 7000});

			const numRows = await grid.getNumRows();
			assert.equal(numRows, 100);
		});
	});
});
