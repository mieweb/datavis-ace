import { assert } from 'chai';
import { loadFruitData, loadRandom100, loadDataFile, getDataAsync, resetAndGetData, CONFIG_OPTS } from './lib/setup.js';
import { groupIndex, aggResult, toNumber } from './lib/nav.js';
describe('ComputedView — Aggregates', function () {
	var view;

	before(async function () {
		var env = await loadFruitData();
		view = env.view;
	});

	afterEach(async function () {
		await resetAndGetData(view);
	});

	describe('count aggregate', function () {
		it('counts rows per group when grouped by Category', async function () {
			view.setGroup({ fieldNames: ['Category'] }, { updateData: false, sendEvent: false, savePrefs: false });
			view.setAggregate({
				group: [{ fun: 'count' }],
				pivot: [{ fun: 'count' }],
				cell: [{ fun: 'count' }],
				all: [{ fun: 'count' }]
			}, { updateData: false, sendEvent: false, savePrefs: false });
			var data = await getDataAsync(view);

			var groupNames = data.rowVals.map(function (rv) { return rv[0]; });
			var fruitIdx = groupNames.indexOf('Fruit');
			var vegIdx = groupNames.indexOf('Vegetables');

			assert.equal(data.agg.results.group[0][fruitIdx], 146);
			assert.equal(data.agg.results.group[0][vegIdx], 67);
		});

		it('counts total rows with the all aggregate', async function () {
			view.setGroup({ fieldNames: ['Category'] }, { updateData: false, sendEvent: false, savePrefs: false });
			view.setAggregate({
				group: [{ fun: 'count' }],
				pivot: [{ fun: 'count' }],
				cell: [{ fun: 'count' }],
				all: [{ fun: 'count' }]
			}, { updateData: false, sendEvent: false, savePrefs: false });
			var data = await getDataAsync(view);

			assert.equal(data.agg.results.all[0], 213);
		});
	});

	describe('countDistinct aggregate', function () {
		it('counts distinct products per Category group', async function () {
			view.setGroup({ fieldNames: ['Category'] }, { updateData: false, sendEvent: false, savePrefs: false });
			view.setAggregate({
				group: [{ fun: 'countDistinct', fields: ['Product'] }],
				pivot: [{ fun: 'count' }],
				cell: [{ fun: 'count' }],
				all: [{ fun: 'count' }]
			}, { updateData: false, sendEvent: false, savePrefs: false });
			var data = await getDataAsync(view);

			var groupNames = data.rowVals.map(function (rv) { return rv[0]; });
			var fruitIdx = groupNames.indexOf('Fruit');
			var vegIdx = groupNames.indexOf('Vegetables');

			// Fruit: Banana, Apple, Orange, Mango = 4 distinct
			assert.equal(data.agg.results.group[0][fruitIdx], 4);
			// Vegetables: Carrots, Broccoli, Beans = 3 distinct
			assert.equal(data.agg.results.group[0][vegIdx], 3);
		});
	});

	describe('sum aggregate', function () {
		it('sums Amount per Category group', async function () {
			view.setGroup({ fieldNames: ['Category'] }, { updateData: false, sendEvent: false, savePrefs: false });
			view.setAggregate({
				group: [{ fun: 'sum', fields: ['Amount'] }],
				pivot: [{ fun: 'count' }],
				cell: [{ fun: 'count' }],
				all: [{ fun: 'sum', fields: ['Amount'] }]
			}, { updateData: false, sendEvent: false, savePrefs: false });
			var data = await getDataAsync(view);

			var groupNames = data.rowVals.map(function (rv) { return rv[0]; });
			var fruitIdx = groupNames.indexOf('Fruit');
			var vegIdx = groupNames.indexOf('Vegetables');

			var fruitSum = Number(data.agg.results.group[0][fruitIdx]);
			var vegSum = Number(data.agg.results.group[0][vegIdx]);
			var totalSum = Number(data.agg.results.all[0]);

			// Both sums should be positive
			assert.isAbove(fruitSum, 0);
			assert.isAbove(vegSum, 0);

			// Group sums should add up to the total
			assert.approximately(fruitSum + vegSum, totalSum, 0.01);
		});
	});

	describe('average aggregate', function () {
		it('computes average Amount per Category group', async function () {
			view.setGroup({ fieldNames: ['Category'] }, { updateData: false, sendEvent: false, savePrefs: false });
			view.setAggregate({
				group: [{ fun: 'sum', fields: ['Amount'] }, { fun: 'average', fields: ['Amount'] }, { fun: 'count' }],
				pivot: [{ fun: 'count' }],
				cell: [{ fun: 'count' }],
				all: [{ fun: 'count' }]
			}, { updateData: false, sendEvent: false, savePrefs: false });
			var data = await getDataAsync(view);

			var groupNames = data.rowVals.map(function (rv) { return rv[0]; });
			var fruitIdx = groupNames.indexOf('Fruit');
			var vegIdx = groupNames.indexOf('Vegetables');

			// average should equal sum / count
			var fruitSum = Number(data.agg.results.group[0][fruitIdx]);
			var fruitAvg = Number(data.agg.results.group[1][fruitIdx]);
			var fruitCount = data.agg.results.group[2][fruitIdx];

			assert.approximately(fruitAvg, fruitSum / fruitCount, 0.01);

			var vegSum = Number(data.agg.results.group[0][vegIdx]);
			var vegAvg = Number(data.agg.results.group[1][vegIdx]);
			var vegCount = data.agg.results.group[2][vegIdx];

			assert.approximately(vegAvg, vegSum / vegCount, 0.01);
		});
	});

	describe('min aggregate', function () {
		it('finds the minimum Amount per Category group', async function () {
			view.setGroup({ fieldNames: ['Category'] }, { updateData: false, sendEvent: false, savePrefs: false });
			view.setAggregate({
				group: [{ fun: 'min', fields: ['Amount'] }],
				pivot: [{ fun: 'count' }],
				cell: [{ fun: 'count' }],
				all: [{ fun: 'min', fields: ['Amount'] }]
			}, { updateData: false, sendEvent: false, savePrefs: false });
			var data = await getDataAsync(view);

			var groupNames = data.rowVals.map(function (rv) { return rv[0]; });
			var fruitIdx = groupNames.indexOf('Fruit');
			var vegIdx = groupNames.indexOf('Vegetables');

			var fruitMin = Number(data.agg.results.group[0][fruitIdx]);
			var vegMin = Number(data.agg.results.group[0][vegIdx]);
			var overallMin = Number(data.agg.results.all[0]);

			// Minimums should be positive (all amounts are positive in fruit.csv)
			assert.isAbove(fruitMin, 0);
			assert.isAbove(vegMin, 0);

			// Overall min should be the lesser of the two group mins
			assert.equal(overallMin, Math.min(fruitMin, vegMin));
		});
	});

	describe('max aggregate', function () {
		it('finds the maximum Amount per Category group', async function () {
			view.setGroup({ fieldNames: ['Category'] }, { updateData: false, sendEvent: false, savePrefs: false });
			view.setAggregate({
				group: [{ fun: 'max', fields: ['Amount'] }],
				pivot: [{ fun: 'count' }],
				cell: [{ fun: 'count' }],
				all: [{ fun: 'max', fields: ['Amount'] }]
			}, { updateData: false, sendEvent: false, savePrefs: false });
			var data = await getDataAsync(view);

			var groupNames = data.rowVals.map(function (rv) { return rv[0]; });
			var fruitIdx = groupNames.indexOf('Fruit');
			var vegIdx = groupNames.indexOf('Vegetables');

			var fruitMax = Number(data.agg.results.group[0][fruitIdx]);
			var vegMax = Number(data.agg.results.group[0][vegIdx]);
			var overallMax = Number(data.agg.results.all[0]);

			// Overall max should be the greater of the two group maxes
			assert.equal(overallMax, Math.max(fruitMax, vegMax));
		});
	});

	describe('multiple aggregates simultaneously', function () {
		it('computes count and sum at the same time', async function () {
			view.setGroup({ fieldNames: ['Category'] }, { updateData: false, sendEvent: false, savePrefs: false });
			view.setAggregate({
				group: [{ fun: 'count' }, { fun: 'sum', fields: ['Amount'] }],
				pivot: [{ fun: 'count' }],
				cell: [{ fun: 'count' }],
				all: [{ fun: 'count' }, { fun: 'sum', fields: ['Amount'] }]
			}, { updateData: false, sendEvent: false, savePrefs: false });
			var data = await getDataAsync(view);

			var groupNames = data.rowVals.map(function (rv) { return rv[0]; });
			var fruitIdx = groupNames.indexOf('Fruit');

			// First aggregate (index 0) is count
			assert.equal(data.agg.results.group[0][fruitIdx], 146);

			// Second aggregate (index 1) is sum — should be a positive number
			var fruitSum = Number(data.agg.results.group[1][fruitIdx]);
			assert.isAbove(fruitSum, 0);

			// All aggregates
			assert.equal(data.agg.results.all[0], 213);
			assert.isAbove(Number(data.agg.results.all[1]), 0);
		});
	});

	describe('pivot cell aggregates', function () {
		it('computes count per pivot cell', async function () {
			view.setGroup({ fieldNames: ['Country'] }, { updateData: false, sendEvent: false, savePrefs: false });
			view.setPivot({ fieldNames: ['Category'] }, { updateData: false, sendEvent: false, savePrefs: false });
			view.setAggregate({
				group: [{ fun: 'count' }],
				pivot: [{ fun: 'count' }],
				cell: [{ fun: 'count' }],
				all: [{ fun: 'count' }]
			}, { updateData: false, sendEvent: false, savePrefs: false });
			var data = await getDataAsync(view);

			assert.isTrue(data.isPivot);

			// Verify cell results exist and are a 2D structure
			assert.isArray(data.agg.results.cell[0]);

			// Sum all cell counts — should equal 213
			var totalFromCells = 0;
			for (var r = 0; r < data.rowVals.length; r++) {
				for (var c = 0; c < data.colVals.length; c++) {
					var cellCount = data.agg.results.cell[0][r][c];
					if (cellCount != null) {
						totalFromCells += cellCount;
					}
				}
			}
			assert.equal(totalFromCells, 213);

			// Verify pivot (column) totals — Fruit: 146, Vegetables: 67
			var pivotCols = data.colVals.map(function (cv) { return cv[0]; });
			var fruitColIdx = pivotCols.indexOf('Fruit');
			var vegColIdx = pivotCols.indexOf('Vegetables');

			assert.equal(data.agg.results.pivot[0][fruitColIdx], 146);
			assert.equal(data.agg.results.pivot[0][vegColIdx], 67);
		});
	});

	describe('aggregates with Product grouping', function () {
		it('counts rows for each product', async function () {
			view.setGroup({ fieldNames: ['Product'] }, { updateData: false, sendEvent: false, savePrefs: false });
			view.setAggregate({
				group: [{ fun: 'count' }],
				pivot: [{ fun: 'count' }],
				cell: [{ fun: 'count' }],
				all: [{ fun: 'count' }]
			}, { updateData: false, sendEvent: false, savePrefs: false });
			var data = await getDataAsync(view);

			// Sum of all group counts should be 213
			var totalCount = 0;
			for (var i = 0; i < data.rowVals.length; i++) {
				totalCount += data.agg.results.group[0][i];
			}
			assert.equal(totalCount, 213);
		});
	});
});

// Port of GLIDE's tests/selenium/aggregate.js Group section, grouped by fruit on
// random100.json.  The numeric oracle arrays are GLIDE's, aligned to the
// alphabetical fruit order; value-list aggregates are checked against data
// computed independently from the raw file.
describe('ComputedView — Aggregates (random100)', function () {
	var view;
	// Alphabetical fruit order, matching the view's default group ordering and the
	// order of GLIDE's oracle arrays below.
	var fruits = ['Banana', 'Blueberry', 'Cherry', 'Grape', 'Kiwi', 'Mango', 'Orange', 'Pineapple', 'Strawberry'];
	var counts = [4, 11, 9, 23, 25, 17, 7, 3, 1];
	var intSums = [13235, 64040, 41184, 150370, 132879, 61900, 34549, 18485, 1494];
	var intMins = [18, 1471, 230, 2334, 1031, 540, 1020, 4260, 1494];
	var intMaxs = [8086, 9298, 9861, 9882, 9769, 9031, 9052, 7815, 1494];
	var intAvgs = [3308.75, 5821.818181818182, 4576, 6537.826086956522, 5315.16, 3641.176470588235, 4935.571428571428, 6161.666666666667, 1494];
	var floatSums = [25256.941694891266, 73079.95424647664, 55761.26734643026, 142747.91542607444, 128604.97102449852, 98297.13477028029, 31771.824698853292, 20767.12095699954, 9327.40540844484];
	var floatMins = [2438.8648579944324, 823.6475089782774, 2385.9206702235865, 804.3777397068015, 140.40295994002554, 11.427050324968356, 2604.662611609202, 2756.0655789999596, 9327.40540844484];
	var floatMaxs = [9096.552813426433, 9826.871974900494, 9020.757338445388, 9665.097071339816, 9229.901315761948, 9637.421621192036, 6183.071597756641, 9961.582135696373, 9327.40540844484];

	// Raw int1 values per fruit, computed independently from the data file.
	var rawByFruit = {};
	(function () {
		var payload = loadDataFile('random100.json');
		payload.data.forEach(function (row) {
			var f = row.fruit;
			if (rawByFruit[f] == null) {
				rawByFruit[f] = [];
			}
			rawByFruit[f].push(row.int1);
		});
	})();

	before(async function () {
		var env = await loadRandom100();
		view = env.view;
	});

	afterEach(async function () {
		await resetAndGetData(view);
	});

	// Configure a fruit grouping with the given group aggregates and return data.
	function groupAgg(groupAggs) {
		view.setGroup({ fieldNames: ['fruit'] }, CONFIG_OPTS);
		view.setAggregate({
			group: groupAggs,
			pivot: [{ fun: 'count' }],
			cell: [{ fun: 'count' }],
			all: [{ fun: 'count' }]
		}, CONFIG_OPTS);
		return getDataAsync(view);
	}

	// Assert that group aggregate `aggIdx` matches `expected` (aligned to `fruits`).
	function assertPerFruit(data, aggIdx, expected, opts) {
		opts = opts || {};
		fruits.forEach(function (fruit, i) {
			var gi = groupIndex(data, [fruit]);
			var actual = toNumber(aggResult(data, 'group', aggIdx, gi));
			if (opts.delta != null) {
				assert.approximately(actual, expected[i], opts.delta, fruit + ' aggregate ' + aggIdx);
			}
			else {
				assert.equal(actual, expected[i], fruit + ' aggregate ' + aggIdx);
			}
		});
	}

	it('counts rows per fruit', async function () {
		var data = await groupAgg([{ fun: 'count' }]);
		assertPerFruit(data, 0, counts);
	});

	it('sums int1 per fruit, identically across all int representations', async function () {
		var intFields = ['int1', 'int2', 'int3', 'int4', 'int5', 'int6', 'int7', 'int8', 'int9'];
		var data = await groupAgg(intFields.map(function (f) { return { fun: 'sum', fields: [f] }; }));
		intFields.forEach(function (f, aggIdx) {
			assertPerFruit(data, aggIdx, intSums, { delta: 0.0001 });
		});
	});

	it('computes min / max / average of int1 per fruit', async function () {
		var data = await groupAgg([
			{ fun: 'min', fields: ['int1'] },
			{ fun: 'max', fields: ['int1'] },
			{ fun: 'average', fields: ['int1'] }
		]);
		assertPerFruit(data, 0, intMins);
		assertPerFruit(data, 1, intMaxs);
		assertPerFruit(data, 2, intAvgs, { delta: 0.0001 });
	});

	it('computes sum / min / max of float1 per fruit', async function () {
		var data = await groupAgg([
			{ fun: 'sum', fields: ['float1'] },
			{ fun: 'min', fields: ['float1'] },
			{ fun: 'max', fields: ['float1'] }
		]);
		assertPerFruit(data, 0, floatSums, { delta: 0.0001 });
		assertPerFruit(data, 1, floatMins, { delta: 1e-9 });
		assertPerFruit(data, 2, floatMaxs, { delta: 1e-9 });
	});

	it('countDistinct of int1 equals the row count when all values are distinct', async function () {
		var data = await groupAgg([{ fun: 'countDistinct', fields: ['int1'] }]);
		assertPerFruit(data, 0, counts);
	});

	it('countDistinct of duration3 matches the number of distinct durations', async function () {
		var data = await groupAgg([{ fun: 'countDistinct', fields: ['duration3'] }]);
		// duration3 has only four possible values, so groups collapse.
		assertPerFruit(data, 0, [3, 4, 3, 4, 4, 4, 2, 3, 1]);
	});

	it('values of int1 lists exactly the group\'s values', async function () {
		var data = await groupAgg([{ fun: 'values', fields: ['int1'] }, { fun: 'distinctValues', fields: ['int1'] }]);
		fruits.forEach(function (fruit) {
			var gi = groupIndex(data, [fruit]);
			var valuesStr = aggResult(data, 'group', 0, gi);
			var listed = valuesStr.split(', ').map(Number).sort(function (a, b) { return a - b; });
			var expected = rawByFruit[fruit].map(Number).sort(function (a, b) { return a - b; });
			assert.deepEqual(listed, expected, 'values for ' + fruit);

			// distinctValues should be the unique subset, matching countDistinct.
			var distinctStr = aggResult(data, 'group', 1, gi);
			var distinct = distinctStr.split(', ');
			assert.equal(distinct.length, new Set(expected).size, 'distinctValues count for ' + fruit);
		});
	});

	it('valuesWithCounts of duration3 has counts summing to the group size', async function () {
		var data = await groupAgg([{ fun: 'valuesWithCounts', fields: ['duration3'] }]);
		fruits.forEach(function (fruit, i) {
			var gi = groupIndex(data, [fruit]);
			var str = aggResult(data, 'group', 0, gi);
			// Each entry looks like "<value> (<count>)"; counts must sum to the group size.
			var total = 0;
			str.split(', ').forEach(function (entry) {
				var m = entry.match(/\((\d+)\)\s*$/);
				if (m != null) {
					total += Number(m[1]);
				}
			});
			assert.equal(total, counts[i], 'valuesWithCounts total for ' + fruit);
		});
	});

	it('all-rows count equals 100', async function () {
		var data = await groupAgg([{ fun: 'count' }]);
		assert.equal(aggResult(data, 'all', 0), 100);
	});
});
