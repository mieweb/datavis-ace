import { assert } from 'chai';
import { loadFruitData, getDataAsync, resetAndGetData } from './helpers/setup.js';

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
