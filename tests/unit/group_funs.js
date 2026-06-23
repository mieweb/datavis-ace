import { assert } from 'chai';
import { loadRandom100, getDataAsync, resetAndGetData, CONFIG_OPTS } from './lib/setup.js';
import { groupIndex, aggResult } from './lib/nav.js';

// Port of GLIDE's tests/selenium/group-funs.js.  Groups random100.json by a
// temporal field with a grouping function (year, quarter, month, day_of_week,
// ...) and asserts the per-group row counts.  Because the date* and datetime*
// fields hold the same instants in different internal representations, every
// field must yield identical group counts.
describe('ComputedView — Group Functions (random100)', function () {
	var view;

	// GLIDE oracle: expected row counts keyed by group label, for each fun.
	var expected = {
		year: { '1901': 1, '2094': 1, '1978': 3 },
		quarter: { 'Q1': 27, 'Q2': 30, 'Q3': 21, 'Q4': 22 },
		month: {
			'Jan': 13, 'Feb': 5, 'Mar': 9, 'Apr': 9, 'May': 14, 'Jun': 7,
			'Jul': 8, 'Aug': 8, 'Sep': 5, 'Oct': 4, 'Nov': 9, 'Dec': 9
		},
		day_of_week: { 'Mon': 12, 'Tue': 13, 'Wed': 11, 'Thu': 14, 'Fri': 21, 'Sat': 13, 'Sun': 16 }
	};

	var dateFields = ['date1', 'date2', 'date3', 'datetime1', 'datetime2', 'datetime3'];

	before(async function () {
		var env = await loadRandom100();
		view = env.view;
		view.setAggregate({
			group: [{ fun: 'count' }],
			pivot: [{ fun: 'count' }],
			cell: [{ fun: 'count' }],
			all: [{ fun: 'count' }]
		}, CONFIG_OPTS);
	});

	afterEach(async function () {
		await resetAndGetData(view);
	});

	// Group by `field` with grouping function `fun` and return the data.
	function groupByFun(field, fun) {
		view.setGroup({ fieldNames: [{ field: field, fun: fun }] }, CONFIG_OPTS);
		return getDataAsync(view);
	}

	Object.keys(expected).forEach(function (fun) {
		describe(fun, function () {
			dateFields.forEach(function (field) {
				it('produces correct group counts for ' + field, async function () {
					var data = await groupByFun(field, fun);
					Object.keys(expected[fun]).forEach(function (label) {
						var gi = groupIndex(data, [label]);
						assert.isAtLeast(gi, 0, field + '/' + fun + ': missing group ' + label);
						var count = aggResult(data, 'group', 0, gi);
						assert.equal(count, expected[fun][label], field + '/' + fun + ' count for ' + label);
					});
				});
			});
		});
	});

	it('year groups span 1901 through 2094', async function () {
		var data = await groupByFun('date1', 'year');
		var years = data.rowVals.map(function (rv) { return Number(rv[0]); });
		assert.equal(Math.min.apply(null, years), 1901);
		assert.equal(Math.max.apply(null, years), 2094);
	});

	it('all group functions partition every row', async function () {
		var funs = ['year', 'quarter', 'month', 'day_of_week'];
		for (var i = 0; i < funs.length; i++) {
			var data = await groupByFun('date1', funs[i]);
			var total = data.rowVals.reduce(function (sum, rv, idx) {
				return sum + data.agg.results.group[0][idx];
			}, 0);
			assert.equal(total, 100, funs[i] + ' total');
		}
	});
});
