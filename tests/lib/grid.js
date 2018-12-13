const _ = require('lodash');
const {By} = require('selenium-webdriver');
const {asyncMap, asyncFilter} = require('./util.js');
const child_process = require('child_process');

const {Type: LoggingType} = require('selenium-webdriver/lib/logging');

class Grid {
	constructor(driver) {
		this.driver = driver;
	}

	async dumpLogs() {
		(await this.driver.manage().logs().get(LoggingType.BROWSER)).forEach((l) => {
			console.log(l.message.replace(/\\u003C/g, '<'));
		});
	}

	async waitForIdle(opts = {}) {
		_.defaultsDeep(opts, {
			showLogs: false,
			timeout: 2000
		});
		let attempt = 1;
		process.stdout.write('Waiting for idle');
		await this.driver.wait(async () => {
			process.stdout.write('.');
			const x = await this.driver.executeScript(`console.log('### IDLE [${attempt}]'); return MIE.WC_DataVis.grids.grid.isIdle()`);
			attempt += 1;
			if (opts.showLogs) {
				await this.dumpLogs();
			}
			return x;
		}, opts.timeout);
	}

	// FIXME: For some reason, this takes longer and longer each time you call it.

	async sortBy(column, ordering) {
		const start = new Date();
		const header = await this.driver.findElement(By.xpath(`//span[@data-wcdv-field="${column}"]/../div`)).click();
		const sortMenus = await asyncFilter(await this.driver.findElements(By.className('context-menu-root')), (elt) => elt.isDisplayed());
		const sortItems = await sortMenus[0].findElements(By.className('context-menu-item'));
		const validSortItems = await asyncFilter(sortItems, async (elt) => await elt.getText() !== '');
		// data:[Promise<WebElement>], predicate:(WebElement)->Promise<bool>
		const orderingOptions = await asyncFilter(validSortItems, async (elt) => await elt.getText() === ordering);
		const end = new Date();

		console.log(`Took ${end.valueOf() - start.valueOf()}ms to find sort menu item.`);

		if (orderingOptions.length !== 1) {
			throw new Error(`Invalid ordering "${ordering}", found: ${JSON.stringify(await asyncMap(validSortItems, (elt) => elt.getText()))}`);
		}

		return await orderingOptions[0].click();
	}

	async getCell(column, row) {
		const table = await this.driver.findElement(By.css('div.wcdv_grid div.wcdv_grid_table > table'));
		const headers = await table.findElements(By.css('thead > tr > th'));
		const th = await asyncFilter(headers, async (elt) => await elt.getText() === column, {reportPosition: true});
		if (th.length === 0) {
			throw new Error(`No such column: ${column}`);
		}
		// Using the 'data-row-num' attribute here to prevent counting the "show more rows" TR.
		const trs = await table.findElements(By.css('tbody > tr[data-row-num]'));
		const tr = trs[row >= 0 ? row : trs.length + row];
		if (tr == null) {
			throw new Error(`No such row: ${row}`);
		}
		const tds = await tr.findElements(By.css('td'));
		const td = tds[th[0].pos];
		return await td.getText();
	}
}

module.exports = Grid;
