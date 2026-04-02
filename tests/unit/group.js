import { assert } from 'chai';
import { loadFruitData, getDataAsync, resetAndGetData } from './helpers/setup.js';

describe('ComputedView — Grouping', function () {
	var view;

	before(async function () {
		var env = await loadFruitData();
		view = env.view;
	});

	afterEach(async function () {
		await resetAndGetData(view);
	});

	describe('single-field grouping', function () {
		it('groups by Category into Fruit and Vegetables', async function () {
			view.setGroup({ fieldNames: ['Category'] }, { updateData: false, sendEvent: false, savePrefs: false });
			var data = await getDataAsync(view);

			assert.isTrue(data.isGroup);
			assert.isFalse(data.isPlain);
			assert.isFalse(data.isPivot);

			// Should have 2 groups: Fruit and Vegetables
			assert.equal(data.rowVals.length, 2);

			var groupNames = data.rowVals.map(function (rv) { return rv[0]; });
			assert.includeMembers(groupNames, ['Fruit', 'Vegetables']);

			// Verify row counts per group
			var fruitIdx = groupNames.indexOf('Fruit');
			var vegIdx = groupNames.indexOf('Vegetables');

			assert.equal(data.data[fruitIdx].length, 146);
			assert.equal(data.data[vegIdx].length, 67);
		});

		it('groups by Country into 7 groups', async function () {
			view.setGroup({ fieldNames: ['Country'] }, { updateData: false, sendEvent: false, savePrefs: false });
			var data = await getDataAsync(view);

			assert.isTrue(data.isGroup);
			assert.equal(data.rowVals.length, 7);

			var countries = data.rowVals.map(function (rv) { return rv[0]; });
			assert.includeMembers(countries, [
				'United States', 'United Kingdom', 'Canada', 'Germany',
				'France', 'Australia', 'New Zealand'
			]);
		});

		it('groups by Product into 7 groups', async function () {
			view.setGroup({ fieldNames: ['Product'] }, { updateData: false, sendEvent: false, savePrefs: false });
			var data = await getDataAsync(view);

			assert.isTrue(data.isGroup);
			assert.equal(data.rowVals.length, 7);

			var products = data.rowVals.map(function (rv) { return rv[0]; });
			assert.includeMembers(products, [
				'Banana', 'Apple', 'Orange', 'Mango',
				'Carrots', 'Broccoli', 'Beans'
			]);
		});

		it('preserves all data rows across groups', async function () {
			view.setGroup({ fieldNames: ['Category'] }, { updateData: false, sendEvent: false, savePrefs: false });
			var data = await getDataAsync(view);

			var totalRows = 0;
			for (var i = 0; i < data.data.length; i++) {
				totalRows += data.data[i].length;
			}
			assert.equal(totalRows, 213);
		});
	});

	describe('multi-field grouping', function () {
		it('groups by Category then Country', async function () {
			view.setGroup({ fieldNames: ['Category', 'Country'] }, { updateData: false, sendEvent: false, savePrefs: false });
			var data = await getDataAsync(view);

			assert.isTrue(data.isGroup);
			assert.equal(data.groupFields.length, 2);

			// Each rowVal should have 2 elements: [Category, Country]
			data.rowVals.forEach(function (rv) {
				assert.equal(rv.length, 2);
			});

			// Total rows across all groups should still be 213
			var totalRows = 0;
			for (var i = 0; i < data.data.length; i++) {
				totalRows += data.data[i].length;
			}
			assert.equal(totalRows, 213);
		});

		it('creates the expected number of Category x Country combinations', async function () {
			view.setGroup({ fieldNames: ['Category', 'Country'] }, { updateData: false, sendEvent: false, savePrefs: false });
			var data = await getDataAsync(view);

			// 2 categories x 7 countries = at most 14 combos, but all should be present in the data
			assert.isAbove(data.rowVals.length, 2);
			assert.isAtMost(data.rowVals.length, 14);
		});
	});

	describe('groupMetadata', function () {
		it('has a metadata structure with children', async function () {
			view.setGroup({ fieldNames: ['Category'] }, { updateData: false, sendEvent: false, savePrefs: false });
			var data = await getDataAsync(view);

			assert.isObject(data.groupMetadata);
			assert.isObject(data.groupMetadata.children);
			assert.property(data.groupMetadata, 'numRows');
			assert.equal(data.groupMetadata.numRows, 213);
		});
	});

	describe('clearGroup', function () {
		it('returns data to plain (ungrouped) state', async function () {
			view.setGroup({ fieldNames: ['Category'] }, { updateData: false, sendEvent: false, savePrefs: false });
			var grouped = await getDataAsync(view);
			assert.isTrue(grouped.isGroup);

			view.clearGroup({ updateData: false, sendEvent: false, savePrefs: false });
			var plain = await getDataAsync(view);
			assert.isTrue(plain.isPlain);
			assert.isFalse(plain.isGroup);
			assert.equal(plain.data.length, 213);
		});
	});

	describe('grouping with active filter', function () {
		it('groups only the filtered rows', async function () {
			view.setFilter({ Category: { $eq: 'Fruit' } }, null, { updateData: false, sendEvent: false, savePrefs: false });
			view.setGroup({ fieldNames: ['Product'] }, { updateData: false, sendEvent: false, savePrefs: false });
			var data = await getDataAsync(view);

			assert.isTrue(data.isGroup);

			// Only fruit products should be present
			var products = data.rowVals.map(function (rv) { return rv[0]; });
			assert.includeMembers(products, ['Banana', 'Apple', 'Orange', 'Mango']);
			assert.notInclude(products, 'Carrots');
			assert.notInclude(products, 'Broccoli');
			assert.notInclude(products, 'Beans');

			// Total grouped rows should equal filtered count
			var totalRows = 0;
			for (var i = 0; i < data.data.length; i++) {
				totalRows += data.data[i].length;
			}
			assert.equal(totalRows, 146);
		});
	});
});
