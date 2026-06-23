import { assert } from 'chai';
import { loadFruitData, loadRandom100, getDataAsync, resetAndGetData, filterBy, countRows } from './lib/setup.js';
import { cellValue } from './lib/nav.js';
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

// Port of GLIDE's tests/selenium/filter.js number/string sections, run against
// random100.json.  The int1..int9 columns hold the same logical integers in
// different source/internal representations, as do float1..float9, so a single
// filter value exercises every representation.
describe('ComputedView — Filtering (random100 types)', function () {
	var view;

	before(async function () {
		var env = await loadRandom100();
		view = env.view;
	});

	afterEach(async function () {
		await resetAndGetData(view);
	});

	describe('string $in / $nin on country', function () {
		it('filters one value in (10 of 100)', async function () {
			var data = await filterBy(view, { country: { $in: ['Canada'] } });
			assert.equal(countRows(data), 10);
			assert.equal(cellValue(data, 'country', 0), 'Canada');
			assert.equal(cellValue(data, 'country', -1), 'Canada');
		});

		it('filters one value not-in (90 of 100)', async function () {
			var data = await filterBy(view, { country: { $nin: ['Canada'] } });
			assert.equal(countRows(data), 90);
		});

		it('filters multiple values in (20 of 100)', async function () {
			var data = await filterBy(view, { country: { $in: ['Canada', 'Japan'] } });
			assert.equal(countRows(data), 20);
			data.data.forEach(function (row) {
				assert.include(['Canada', 'Japan'], row.rowData['country'].value);
			});
		});

		it('filters multiple values not-in (80 of 100)', async function () {
			var data = await filterBy(view, { country: { $nin: ['Canada', 'Japan'] } });
			assert.equal(countRows(data), 80);
		});
	});

	describe('numeric operators across int representations', function () {
		// Expected counts from GLIDE's filter.js for the shared integer value 6311.
		var intExpected = {
			$eq: 1, $ne: 99, $lt: 61, $gt: 38, $lte: 62, $gte: 39
		};
		var intFields = ['int1', 'int2', 'int3', 'int4', 'int5', 'int6', 'int7', 'int8', 'int9'];

		intFields.forEach(function (field) {
			Object.keys(intExpected).forEach(function (op) {
				it(field + ' ' + op + ' 6311 -> ' + intExpected[op] + ' rows', async function () {
					var spec = {};
					spec[field] = {};
					spec[field][op] = 6311;
					var data = await filterBy(view, spec);
					assert.equal(countRows(data), intExpected[op]);
				});
			});
		});
	});

	describe('numeric operators across float representations', function () {
		// Full-precision floats (float1/2/4/5/7/8) never exactly equal 8443.374;
		// the comma-formatted, rounded floats (float3/6/9) do.
		var floatFull = {
			fields: ['float1', 'float2', 'float4', 'float5', 'float7', 'float8'],
			expected: { $eq: 0, $ne: 100, $lt: 77, $gt: 23, $lte: 77, $gte: 23 }
		};
		var floatFixed = {
			fields: ['float3', 'float6', 'float9'],
			expected: { $eq: 1, $ne: 99, $lt: 77, $gt: 22, $lte: 78, $gte: 23 }
		};

		[floatFull, floatFixed].forEach(function (group) {
			group.fields.forEach(function (field) {
				Object.keys(group.expected).forEach(function (op) {
					it(field + ' ' + op + ' 8443.374 -> ' + group.expected[op] + ' rows', async function () {
						var spec = {};
						spec[field] = {};
						spec[field][op] = 8443.374;
						var data = await filterBy(view, spec);
						assert.equal(countRows(data), group.expected[op]);
					});
				});
			});
		});
	});
});
