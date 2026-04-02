import { assert } from 'chai';
import { loadFruitData, getDataAsync, resetAndGetData } from './helpers/setup.js';

describe('ComputedView — Filtering', function () {
	var view;

	before(async function () {
		var env = await loadFruitData();
		view = env.view;
	});

	afterEach(async function () {
		await resetAndGetData(view);
	});

	describe('$in operator', function () {
		it('filters to rows matching a single value', async function () {
			view.setFilter({ Category: { $in: ['Fruit'] } }, null, { updateData: false, sendEvent: false, savePrefs: false });
			var data = await getDataAsync(view);

			assert.equal(data.data.length, 146);
			data.data.forEach(function (row) {
				assert.equal(row.rowData['Category'].value, 'Fruit');
			});
		});

		it('filters to rows matching multiple values', async function () {
			view.setFilter({ Country: { $in: ['Canada', 'France'] } }, null, { updateData: false, sendEvent: false, savePrefs: false });
			var data = await getDataAsync(view);

			var countries = data.data.map(function (row) { return row.rowData['Country'].value; });
			var unique = [...new Set(countries)];
			assert.includeMembers(unique, ['Canada', 'France']);
			assert.equal(unique.length, 2);
		});

		it('returns no rows when filtering for a value that does not exist', async function () {
			view.setFilter({ Country: { $in: ['Japan'] } }, null, { updateData: false, sendEvent: false, savePrefs: false });
			var data = await getDataAsync(view);

			assert.equal(data.data.length, 0);
		});
	});

	describe('$nin operator', function () {
		it('excludes rows matching a single value', async function () {
			view.setFilter({ Category: { $nin: ['Fruit'] } }, null, { updateData: false, sendEvent: false, savePrefs: false });
			var data = await getDataAsync(view);

			assert.equal(data.data.length, 67);
			data.data.forEach(function (row) {
				assert.equal(row.rowData['Category'].value, 'Vegetables');
			});
		});

		it('excludes rows matching multiple values', async function () {
			view.setFilter({ Country: { $nin: ['Canada', 'France'] } }, null, { updateData: false, sendEvent: false, savePrefs: false });
			var data = await getDataAsync(view);

			data.data.forEach(function (row) {
				assert.notInclude(['Canada', 'France'], row.rowData['Country'].value);
			});
		});
	});

	describe('$eq operator', function () {
		it('filters to exact match', async function () {
			view.setFilter({ Product: { $eq: 'Banana' } }, null, { updateData: false, sendEvent: false, savePrefs: false });
			var data = await getDataAsync(view);

			assert.isAbove(data.data.length, 0);
			data.data.forEach(function (row) {
				assert.equal(row.rowData['Product'].value, 'Banana');
			});
		});
	});

	describe('$ne operator', function () {
		it('excludes exact match', async function () {
			view.setFilter({ Product: { $ne: 'Banana' } }, null, { updateData: false, sendEvent: false, savePrefs: false });
			var data = await getDataAsync(view);

			data.data.forEach(function (row) {
				assert.notEqual(row.rowData['Product'].value, 'Banana');
			});
		});
	});

	describe('$contains operator', function () {
		it('matches rows containing the substring (case-insensitive)', async function () {
			view.setFilter({ Product: { $contains: 'an' } }, null, { updateData: false, sendEvent: false, savePrefs: false });
			var data = await getDataAsync(view);

			var products = [...new Set(data.data.map(function (row) { return row.rowData['Product'].value; }))];

			// Banana, Orange, Mango, Beans all contain 'an'
			assert.isAbove(data.data.length, 0);
			products.forEach(function (product) {
				assert.match(product.toLowerCase(), /an/);
			});
		});
	});

	describe('$notcontains operator', function () {
		it('excludes rows containing the substring', async function () {
			view.setFilter({ Product: { $notcontains: 'an' } }, null, { updateData: false, sendEvent: false, savePrefs: false });
			var data = await getDataAsync(view);

			var products = [...new Set(data.data.map(function (row) { return row.rowData['Product'].value; }))];

			// Apple, Carrots, Broccoli do NOT contain 'an'
			assert.isAbove(data.data.length, 0);
			products.forEach(function (product) {
				assert.notMatch(product.toLowerCase(), /an/);
			});
		});
	});

	describe('multi-field filter', function () {
		it('applies AND logic across fields', async function () {
			view.setFilter({
				Category: { $eq: 'Fruit' },
				Country: { $eq: 'France' }
			}, null, { updateData: false, sendEvent: false, savePrefs: false });
			var data = await getDataAsync(view);

			assert.isAbove(data.data.length, 0);
			data.data.forEach(function (row) {
				assert.equal(row.rowData['Category'].value, 'Fruit');
				assert.equal(row.rowData['Country'].value, 'France');
			});
		});

		it('narrows results compared to single-field filter', async function () {
			view.setFilter({ Category: { $eq: 'Fruit' } }, null, { updateData: false, sendEvent: false, savePrefs: false });
			var fruitData = await getDataAsync(view);
			var fruitCount = fruitData.data.length;

			await resetAndGetData(view);

			view.setFilter({
				Category: { $eq: 'Fruit' },
				Country: { $eq: 'France' }
			}, null, { updateData: false, sendEvent: false, savePrefs: false });
			var fruitFranceData = await getDataAsync(view);

			assert.isBelow(fruitFranceData.data.length, fruitCount);
		});
	});

	describe('clearFilter', function () {
		it('restores all rows after clearing', async function () {
			view.setFilter({ Category: { $in: ['Fruit'] } }, null, { updateData: false, sendEvent: false, savePrefs: false });
			var filteredData = await getDataAsync(view);
			assert.equal(filteredData.data.length, 146);

			view.clearFilter({ updateData: false, sendEvent: false, savePrefs: false });
			var allData = await getDataAsync(view);
			assert.equal(allData.data.length, 213);
		});
	});

	describe('isFiltered', function () {
		it('returns true when a filter is active', function () {
			view.setFilter({ Category: { $eq: 'Fruit' } }, null, { updateData: false, sendEvent: false, savePrefs: false });
			assert.isTrue(view.isFiltered());
		});

		it('returns false when no filter is set', function () {
			view.clearFilter({ updateData: false, sendEvent: false, savePrefs: false });
			assert.isFalse(view.isFiltered());
		});
	});

	describe('$exists operator', function () {
		it('matches rows where the field has a value', async function () {
			view.setFilter({ Product: { $exists: true } }, null, { updateData: false, sendEvent: false, savePrefs: false });
			var data = await getDataAsync(view);

			// All rows in fruit.csv have a Product value
			assert.equal(data.data.length, 213);
		});
	});
});
