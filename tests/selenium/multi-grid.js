const {assert} = require('chai');
const _ = require('lodash');
const Grid = require('../lib/grid.js');
const {setupServer, sleep, isVisible, createDriver} = require('../lib/util.js');

const {By, until} = require('selenium-webdriver');

describe('Multi Grid', function () {
	setupServer();
	let driver;
	let grid1, grid2;

	before(async function () {
		driver = await createDriver();
	});

	after(async function () {
		if (driver != null) {
			await driver.quit();
		}
	});

	describe('multi-grid-single-view.html', function () {
		before(async function () {
			await driver.get('http://localhost:3000/tests/pages/grid/multi-grid-single-view.html');
			
			grid1 = new Grid(driver, 'multi-grid-1');
			grid2 = new Grid(driver, 'multi-grid-2');
			
			await grid1.waitForIdle();
			await grid2.waitForIdle();
		});

		it('should have 213 rows in first grid', async function () {
			const numRows = await grid1.getNumRecords();
			assert.equal(numRows, 213);
		});

		it('should have 213 rows in second grid', async function () {
			const numRows = await grid2.getNumRecords();
			assert.equal(numRows, 213);
		});
	});

	describe('multi-grid-multi-view.html', function () {
		before(async function () {
			await driver.get('http://localhost:3000/tests/pages/grid/multi-grid-multi-view.html');
			
			grid1 = new Grid(driver, 'multi-grid-1');
			grid2 = new Grid(driver, 'multi-grid-2');
			
			await grid1.waitForIdle();
			await grid2.waitForIdle();
		});

		it('should have 213 rows in first grid', async function () {
			const numRows = await grid1.getNumRecords();
			assert.equal(numRows, 213);
		});

		it('should have 213 rows in second grid', async function () {
			const numRows = await grid2.getNumRecords();
			assert.equal(numRows, 213);
		});
	});
});
