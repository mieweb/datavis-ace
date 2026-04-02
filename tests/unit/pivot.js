import { assert } from 'chai';
import { loadFruitData, getDataAsync, resetAndGetData } from './helpers/setup.js';

describe('ComputedView — Pivoting', function () {
	var view;

	before(async function () {
		var env = await loadFruitData();
		view = env.view;
	});

	afterEach(async function () {
		await resetAndGetData(view);
	});

	describe('basic pivot', function () {
		it('creates a 2D data structure when pivoting by Category', async function () {
			view.setGroup({ fieldNames: ['Country'] }, { updateData: false, sendEvent: false, savePrefs: false });
			view.setPivot({ fieldNames: ['Category'] }, { updateData: false, sendEvent: false, savePrefs: false });
			var data = await getDataAsync(view);

			assert.isTrue(data.isPivot);
			assert.isFalse(data.isPlain);

			// colVals should have 2 entries: Fruit, Vegetables
			assert.equal(data.colVals.length, 2);

			var pivotCols = data.colVals.map(function (cv) { return cv[0]; });
			assert.includeMembers(pivotCols, ['Fruit', 'Vegetables']);

			// rowVals should have 7 countries
			assert.equal(data.rowVals.length, 7);

			// data.data should be a 2D array: [rowValIndex][colValIndex] = array of rows
			assert.isArray(data.data);
			assert.equal(data.data.length, data.rowVals.length);
			data.data.forEach(function (rowEntry) {
				assert.isArray(rowEntry);
				assert.equal(rowEntry.length, data.colVals.length);
			});
		});

		it('preserves all data rows across pivot cells', async function () {
			view.setGroup({ fieldNames: ['Country'] }, { updateData: false, sendEvent: false, savePrefs: false });
			view.setPivot({ fieldNames: ['Category'] }, { updateData: false, sendEvent: false, savePrefs: false });
			var data = await getDataAsync(view);

			var totalRows = 0;
			for (var r = 0; r < data.data.length; r++) {
				for (var c = 0; c < data.data[r].length; c++) {
					if (data.data[r][c] != null) {
						totalRows += data.data[r][c].length;
					}
				}
			}
			assert.equal(totalRows, 213);
		});
	});

	describe('pivoting by a field with many values', function () {
		it('creates one pivot column per unique Country', async function () {
			view.setGroup({ fieldNames: ['Category'] }, { updateData: false, sendEvent: false, savePrefs: false });
			view.setPivot({ fieldNames: ['Country'] }, { updateData: false, sendEvent: false, savePrefs: false });
			var data = await getDataAsync(view);

			assert.isTrue(data.isPivot);

			// 7 countries as pivot columns
			assert.equal(data.colVals.length, 7);

			var pivotCols = data.colVals.map(function (cv) { return cv[0]; });
			assert.includeMembers(pivotCols, [
				'United States', 'United Kingdom', 'Canada', 'Germany',
				'France', 'Australia', 'New Zealand'
			]);

			// 2 row groups for Fruit/Vegetables
			assert.equal(data.rowVals.length, 2);
		});
	});

	describe('clearPivot', function () {
		it('returns data to grouped (non-pivot) state', async function () {
			view.setGroup({ fieldNames: ['Country'] }, { updateData: false, sendEvent: false, savePrefs: false });
			view.setPivot({ fieldNames: ['Category'] }, { updateData: false, sendEvent: false, savePrefs: false });
			var pivoted = await getDataAsync(view);
			assert.isTrue(pivoted.isPivot);

			view.clearPivot({ updateData: false, sendEvent: false, savePrefs: false });
			var grouped = await getDataAsync(view);

			assert.isTrue(grouped.isGroup);
			assert.isFalse(grouped.isPivot);
			assert.equal(grouped.rowVals.length, 7);
		});
	});

	describe('pivot without group', function () {
		it('does not allow pivoting without a group', function () {
			var result = view.setPivot(
				{ fieldNames: ['Category'] },
				{ updateData: false, sendEvent: false, savePrefs: false }
			);

			// setPivot should return false and not set the pivot
			assert.isFalse(result);
			assert.isNull(view.getPivot());
		});
	});

	describe('pivot preserves row values from group', function () {
		it('has the expected row values from the group', async function () {
			view.setGroup({ fieldNames: ['Country'] }, { updateData: false, sendEvent: false, savePrefs: false });
			view.setPivot({ fieldNames: ['Category'] }, { updateData: false, sendEvent: false, savePrefs: false });
			var data = await getDataAsync(view);

			var countries = data.rowVals.map(function (rv) { return rv[0]; });
			assert.includeMembers(countries, [
				'United States', 'United Kingdom', 'Canada', 'Germany',
				'France', 'Australia', 'New Zealand'
			]);
		});
	});
});
