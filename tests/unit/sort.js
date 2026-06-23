import { assert } from 'chai';
import { loadRandom100, sortBy, groupBy, getDataAsync, fieldTypes, CONFIG_OPTS } from './lib/setup.js';
import { cellOrig, groupCount } from './lib/nav.js';
import { types } from '../../index.js';

// Port of GLIDE's tests/selenium/sort.js, rewritten to inspect getData() output
// instead of rendered table cells.  Sorting correctness is verified by checking
// that the decoded values come out monotonically ordered according to the same
// comparator the view itself uses (types.registry.get(type).compare), so the
// test exercises every internal representation (primitive / numeral / bignumber
// / moment) the way GLIDE's per-type pages did.

describe('ComputedView — Sorting', function () {
	var view;
	var typeOf = fieldTypes('random100.json');

	before(async function () {
		var env = await loadRandom100();
		view = env.view;
	});

	afterEach(function () {
		view.reset(CONFIG_OPTS);
	});

	function comparatorFor(field) {
		return types.registry.get(typeOf[field]).compare;
	}

	function assertMonotonic(data, field, dir) {
		var cmp = comparatorFor(field);
		var rows = data.data;
		for (var i = 0; i < rows.length - 1; i += 1) {
			var a = rows[i].rowData[field].value;
			var b = rows[i + 1].rowData[field].value;
			var c = cmp(a, b);
			if (dir === 'ASC') {
				assert.isAtMost(c, 0, 'ascending: row ' + i + ' should be <= row ' + (i + 1) + ' for field ' + field);
			}
			else {
				assert.isAtLeast(c, 0, 'descending: row ' + i + ' should be >= row ' + (i + 1) + ' for field ' + field);
			}
		}
	}

	// Fields covering each type and each internal representation variant.  Every
	// one of these must come out perfectly ordered by the view's own comparator.
	var monotonicFields = [
		'rowId', 'string1',
		'int1', 'int2', 'int3', 'int4', 'int5', 'int6', 'int7', 'int8', 'int9',
		'float1', 'float2', 'float3', 'float4', 'float5', 'float6', 'float7', 'float8', 'float9',
		'currency1', 'currency2', 'currency3',
		'date1', 'date2', 'date3',
		'time1', 'time2', 'time3', 'time4', 'time5', 'time6',
		'datetime1', 'datetime2', 'datetime3',
		'duration1', 'duration2', 'duration3'
	];

	describe('plain output — ordering is correct for every type/representation', function () {
		monotonicFields.forEach(function (field) {
			it('sorts ' + field + ' (' + typeOf[field] + ') ascending and descending', async function () {
				var rowCount = (await getDataAsync(view)).data.length;

				var asc = await sortBy(view, field, 'ASC');
				assert.equal(asc.data.length, rowCount, 'sorting must preserve row count');
				assertMonotonic(asc, field, 'ASC');
				var ascFirst = cellOrig(asc, field, 0);
				var ascLast = cellOrig(asc, field, -1);

				var desc = await sortBy(view, field, 'DESC');
				assert.equal(desc.data.length, rowCount, 'sorting must preserve row count');
				assertMonotonic(desc, field, 'DESC');

				// The extreme values must swap ends between ascending and descending.
				assert.deepEqual(cellOrig(desc, field, 0), ascLast, field + ' descending first == ascending last');
				assert.deepEqual(cellOrig(desc, field, -1), ascFirst, field + ' descending last == ascending first');
			});
		});
	});

	describe('plain output — known min/max endpoints (oracle from GLIDE)', function () {
		// These deterministic extremes match GLIDE's sort.js expectations once
		// formats are normalized.  They lock in correctness against an external
		// oracle, not just internal self-consistency.
		var endpoints = [
			['int1', 18, 9882],
			['int4', 18, 9882],
			['int7', 18, 9882],
			['float1', 11.427050324968356, 9961.582135696373],
			['currency1', 11.43, 9961.58],
			['currency3', '$11.43', '$9,961.58'],
			['string1', 'abidal', 'zigzagged'],
			['date1', '1901-11-30', '2094-01-10'],
			['duration1', '1y 304d 6h 44m 21s 163t 245u', '989y 29d 21h 10m 54s 165t 350u']
		];

		endpoints.forEach(function (spec) {
			var field = spec[0], min = spec[1], max = spec[2];
			it('sorts ' + field + ' so endpoints are ' + min + ' .. ' + max, async function () {
				var asc = await sortBy(view, field, 'ASC');
				assert.deepEqual(cellOrig(asc, field, 0), min);
				assert.deepEqual(cellOrig(asc, field, -1), max);
			});
		});
	});

	describe('group output — sorting grouped data', function () {
		// random100 fruit distribution (derived from the data, not GLIDE's 1000-row counts).
		var fruitOrderAsc = ['Banana', 'Blueberry', 'Cherry', 'Grape', 'Kiwi', 'Mango', 'Orange', 'Pineapple', 'Strawberry'];

		beforeEach(function () {
			view.setGroup({ fieldNames: ['fruit'] }, CONFIG_OPTS);
			view.setAggregate({
				group: [{ fun: 'count' }],
				pivot: [{ fun: 'count' }],
				cell: [{ fun: 'count' }],
				all: [{ fun: 'count' }]
			}, CONFIG_OPTS);
		});

		it('sorts groups by the group field ascending and descending', async function () {
			view.setSort({ vertical: { field: 'fruit', dir: 'ASC' } }, CONFIG_OPTS);
			var asc = await getDataAsync(view);
			var ascNames = asc.rowVals.map(function (rv) { return rv[0]; });
			assert.deepEqual(ascNames, fruitOrderAsc);

			view.setSort({ vertical: { field: 'fruit', dir: 'DESC' } }, CONFIG_OPTS);
			var desc = await getDataAsync(view);
			var descNames = desc.rowVals.map(function (rv) { return rv[0]; });
			assert.deepEqual(descNames, fruitOrderAsc.slice().reverse());
		});

		it('sorts groups by the count aggregate', async function () {
			view.setSort({ vertical: { aggType: 'group', aggNum: 0, dir: 'ASC' } }, CONFIG_OPTS);
			var asc = await getDataAsync(view);
			var ascCounts = asc.rowVals.map(function (rv) { return groupCount(asc, rv); });
			for (var i = 0; i < ascCounts.length - 1; i += 1) {
				assert.isAtMost(ascCounts[i], ascCounts[i + 1], 'group counts ascending');
			}

			view.setSort({ vertical: { aggType: 'group', aggNum: 0, dir: 'DESC' } }, CONFIG_OPTS);
			var desc = await getDataAsync(view);
			var descCounts = desc.rowVals.map(function (rv) { return groupCount(desc, rv); });
			for (var j = 0; j < descCounts.length - 1; j += 1) {
				assert.isAtLeast(descCounts[j], descCounts[j + 1], 'group counts descending');
			}
		});

		it('preserves the expected per-fruit row counts', async function () {
			var data = await getDataAsync(view);
			assert.equal(groupCount(data, ['Grape']), 23);
			assert.equal(groupCount(data, ['Kiwi']), 25);
			assert.equal(groupCount(data, ['Strawberry']), 1);
			assert.equal(groupCount(data, ['Banana']), 4);
		});
	});

	describe('multi-field grouping spot-check', function () {
		it('groups by fruit then country with rowvals of length 2', async function () {
			var data = await groupBy(view, ['fruit', 'country']);
			assert.isTrue(data.isGroup);
			data.rowVals.forEach(function (rv) {
				assert.equal(rv.length, 2);
			});
		});
	});
});
