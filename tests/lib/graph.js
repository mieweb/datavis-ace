/**
 * Contains classes and methods for directly interacting with a DataVis graph on a page.
 */

const _ = require('lodash');
const Promise = require("bluebird");
const {By, Key} = require('selenium-webdriver');
const until = require('selenium-webdriver/lib/until');
const {selectByText, hover, check, uncheck, sleep} = require('./util.js');

const {Type: LoggingType} = require('selenium-webdriver/lib/logging');

class GraphUi {
	constructor(driver, id = 'grid') {
		this.driver = driver;
		this.id = id;
	}
	get root() {
		return this.driver.findElement(By.id(this.id));
	}
	get graph() {
		return this.root.findElement(By.css('div.wcdv_graph_render'));
	}
	get graphTypeDropdown() {
		return this.root.findElement(By.css('div.wcdv_grid_toolbar > div.wcdv_toolbar_section:nth-of-type(2) > select:nth-of-type(1)'));
	}
	get aggregateDropdown() {
		return this.root.findElement(By.css('div.wcdv_grid_toolbar > div.wcdv_toolbar_section:nth-of-type(2) > select:nth-of-type(2)'));
	}
	get stackCheckbox() {
		return this.root.findElement(By.css('div.wcdv_grid_toolbar > div.wcdv_toolbar_section:nth-of-type(1) input[type="checkbox"]'));
	}
}

class GoogleChart {
	constructor(ui) {
		this.ui = ui;
	}
	get title() {
		return this.ui.graph.findElement(By.css('svg > g:nth-of-type(1)')).getText();
	}
	get bars() {
		return this.ui.graph.findElements(By.css('svg > g:nth-of-type(3) > g[clip-path] > g:nth-of-type(2) > rect'));
	}
	get tooltip() {
		return this.ui.graph.findElements(By.css('svg > g:nth-of-type(5) > g.google-visualization-tooltip > g'));
	}
}

/**
 * @class
 * Provides a convenient way of interacting with a graph.
 */

class Graph {
	constructor(driver, id = 'graph') {
		this.driver = driver;
		this.id = id;
		this.ui = new GraphUi(this.driver, this.id);
		this.ui.chart = new GoogleChart(this.ui);
	}

	/**
	 * Print out console messages from the browser.  Prints all the messages that were produced since
	 * the last time this method was called.
	 */

	async dumpLogs() {
		(await this.driver.manage().logs().get(LoggingType.BROWSER)).forEach((l) => {
			console.log(l.message.replace(/\\u003C/g, '<'));
		});
	}

	async setStacked(f) {
		return (f ? check : uncheck)(this.ui.stackCheckbox);
	}

	async setGraphType(s) {
		return selectByText(this.ui.graphTypeDropdown, s);
	}

	async setAggregate(s) {
		return selectByText(this.ui.aggregateDropdown, s);
	}

	async getTooltip(rvi, cvi) {
		const bars = await this.ui.chart.bars;
		let bar;
		let result = {};
		if (cvi == null) {
			bar = bars[rvi];
		}
		else {
			bar = bars[rvi + (cvi * 2)];
		}
		await hover(this.driver, bar);
		const t = await this.ui.chart.tooltip;
		if (t.length === 1) {
			const info = (await t[0].getText()).split(':');
			result.group = info[0].trim();
			result.value = info[1].trim();
		}
		else if (t.length === 2) {
			result.group = await t[0].getText();
			const info = (await t[1].getText()).split(':');
			result.pivot = info[0].trim();
			result.value = info[1].trim();
		}
		return result;
	}
}

module.exports = Graph;
