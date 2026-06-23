import { assert } from 'chai';
import { loadInlineData, resetAndGetData, filterBy, setCurrentDate, clearCurrentDate, countRows } from './lib/setup.js';

// Port of GLIDE's tests/selenium/date_filter.js (and its date.html fixture).
// Six fixed dates are filtered with exact, range, and relative operators.  The
// relative operators ($this / $last) are evaluated against a pinned current
// date so the expected counts are deterministic.
describe('ComputedView — Date filtering', function () {
	var view;

	// The fixture from date.html.  Each comment records the role a date plays
	// relative to the pinned current date 2024-06-27.
	var dates = [
		'2024-06-27',	// current date
		'2024-06-26',	// current week & last date
		'2024-06-19',	// current month & last week
		'2024-05-15',	// current quarter & last month
		'2024-02-13',	// current year & last quarter
		'2023-10-13'	// last year
	];

	// GLIDE exercises three internal representations of the same dates.
	var internalTypes = ['string', 'moment', 'native'];

	internalTypes.forEach(function (internalType) {
		describe('internal representation = ' + internalType, function () {
			var field = 'date_' + internalType;

			before(async function () {
				var data = dates.map(function (d) {
					var row = {};
					row[field] = d;
					return row;
				});
				var typeInfo = [{ field: field, type: 'date', internalType: internalType }];
				setCurrentDate('2024-06-27');
				var env = await loadInlineData(data, typeInfo, 'DateFilter_' + internalType);
				view = env.view;
			});

			after(function () {
				clearCurrentDate();
			});

			afterEach(async function () {
				await resetAndGetData(view);
			});

			function filterDate(op, operand) {
				var spec = {};
				spec[field] = {};
				spec[field][op] = operand;
				return filterBy(view, spec);
			}

			it('filters an exact date ($eq)', async function () {
				var data = await filterDate('$eq', '2024-05-15');
				assert.equal(countRows(data), 1);
			});

			it('filters dates on or before a date ($lte)', async function () {
				var data = await filterDate('$lte', '2024-05-15');
				assert.equal(countRows(data), 3);
			});

			it('filters dates on or after a date ($gte)', async function () {
				var data = await filterDate('$gte', '2024-05-15');
				assert.equal(countRows(data), 4);
			});

			describe('current period ($this)', function () {
				var expected = { DATE: 1, WEEK: 2, MONTH: 3, QUARTER: 4, YEAR: 5 };
				Object.keys(expected).forEach(function (granularity) {
					it('filters the current ' + granularity.toLowerCase(), async function () {
						var data = await filterDate('$this', granularity);
						assert.equal(countRows(data), expected[granularity]);
					});
				});
			});

			describe('previous period ($last)', function () {
				['DATE', 'WEEK', 'MONTH', 'QUARTER', 'YEAR'].forEach(function (granularity) {
					it('filters the previous ' + granularity.toLowerCase(), async function () {
						var data = await filterDate('$last', granularity);
						assert.equal(countRows(data), 1);
					});
				});
			});
		});
	});
});
