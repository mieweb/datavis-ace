import { assert } from 'chai';
import { loadJsonData, loadInlineData, loadDataFile, resetAndGetData, sortBy, groupBy, filterBy, countRows, CONFIG_OPTS } from './lib/setup.js';

// Null / blank / empty-string handling.  There is no GLIDE oracle for these
// fixtures, so the expected values are derived directly from the raw data.
//
// NOTE: grouping by a field containing JSON `null` currently crashes the view
// (see "Suspected bugs" in plans/unit-tests.md), so the grouping assertion runs
// against blanks.json (empty strings) only.
describe('ComputedView — Null / blank handling', function () {

	function isEmpty(v) {
		return v == null || v === '';
	}

	function makeSpec(field, ops) {
		var spec = {};
		spec[field] = ops;
		return spec;
	}

	// Count rows in a raw data file whose `field` value is null or empty.
	function rawEmptyCount(fileName, field) {
		var payload = loadDataFile(fileName);
		return payload.data.filter(function (row) { return isEmpty(row[field]); }).length;
	}

	[
		// `numericNullable` marks fixtures whose empty numeric cells decode to a
		// missing value.  Empty *strings* in a numeric column (blanks.json) are
		// not treated as missing, so the numeric partition only applies to nulls.
		{ file: 'nulls.json', label: 'nulls.json (JSON null)', numericNullable: true },
		{ file: 'blanks.json', label: 'blanks.json (empty string)', numericNullable: false }
	].forEach(function (fixture) {
		describe(fixture.label, function () {
			var view;
			var stringField = 'fruit';
			var numberField = 'int1';
			var stringEmpties;
			var numberEmpties;
			var totalRows;

			before(async function () {
				stringEmpties = rawEmptyCount(fixture.file, stringField);
				numberEmpties = rawEmptyCount(fixture.file, numberField);
				totalRows = loadDataFile(fixture.file).data.length;
				var env = await loadJsonData(fixture.file);
				view = env.view;
			});

			afterEach(async function () {
				await resetAndGetData(view);
			});

			it('$notexists matches exactly the empty rows', async function () {
				var data = await filterBy(view, makeSpec(stringField, { $notexists: true }));
				assert.equal(countRows(data), stringEmpties);
			});

			it('$exists matches exactly the non-empty rows', async function () {
				var data = await filterBy(view, makeSpec(stringField, { $exists: true }));
				assert.equal(countRows(data), totalRows - stringEmpties);
			});

			if (fixture.numericNullable) {
				it('$exists / $notexists partition all rows for a numeric field', async function () {
					var present = await filterBy(view, makeSpec(numberField, { $exists: true }));
					assert.equal(countRows(present), totalRows - numberEmpties);
					await resetAndGetData(view);
					var absent = await filterBy(view, makeSpec(numberField, { $notexists: true }));
					assert.equal(countRows(absent), numberEmpties);
				});
			}

			it('sorts empty values together at one end', async function () {
				var data = await sortBy(view, stringField, 'ASC');
				var values = data.data.map(function (row) { return row.rowData[stringField].value; });
				var lead = 0;
				while (lead < values.length && isEmpty(values[lead])) {
					lead++;
				}
				var trail = 0;
				for (var i = values.length - 1; i >= 0 && isEmpty(values[i]); i--) {
					trail++;
				}
				assert.equal(lead + trail, stringEmpties, 'empties not all at one end');
				assert.isTrue(lead === stringEmpties || trail === stringEmpties, 'empties split across both ends');
			});
		});
	});

	// Grouping into a blank group (empty strings only — see the null-grouping bug
	// noted above), which also exercises aggregate handling of the blank group.
	describe('grouping into a blank group (blanks.json)', function () {
		var view;
		var blankCount;
		var totalRows;

		before(async function () {
			blankCount = rawEmptyCount('blanks.json', 'fruit');
			totalRows = loadDataFile('blanks.json').data.length;
			var env = await loadJsonData('blanks.json');
			view = env.view;
			view.setAggregate({ group: [{ fun: 'count' }], pivot: [{ fun: 'count' }], cell: [{ fun: 'count' }], all: [{ fun: 'count' }] }, CONFIG_OPTS);
		});

		it('places the empty-valued rows in a single blank group whose count is correct', async function () {
			var data = await groupBy(view, ['fruit']);
			var blankIndex = -1;
			data.rowVals.forEach(function (rv, i) {
				if (rv[0] == null || rv[0] === '') {
					blankIndex = i;
				}
			});
			assert.isAtLeast(blankIndex, 0, 'no blank group was produced');
			assert.equal(data.agg.results.group[0][blankIndex], blankCount);

			// Every row, blank-grouped or not, is accounted for.
			var summed = data.agg.results.group[0].reduce(function (a, b) { return a + b; }, 0);
			assert.equal(summed, totalRows);
		});
	});

	// The empty-string fixture stores every cell of several columns as "".  Its
	// rows are stored in array form, so they are mapped to field-keyed objects
	// before loading.
	describe('empty-string.json', function () {
		var view;
		var totalRows;

		before(async function () {
			var payload = loadDataFile('empty-string.json');
			totalRows = payload.data.length;
			var fields = payload.typeInfo.map(function (ti) { return ti.field; });
			var rows = payload.data.map(function (arr) {
				var row = {};
				fields.forEach(function (f, i) { row[f] = arr[i]; });
				return row;
			});
			var env = await loadInlineData(rows, payload.typeInfo, 'EmptyString');
			view = env.view;
		});

		afterEach(async function () {
			await resetAndGetData(view);
		});

		it('treats an all-empty string column as entirely non-existent', async function () {
			var present = await filterBy(view, makeSpec('string1', { $exists: true }));
			assert.equal(countRows(present), 0);
			await resetAndGetData(view);
			var absent = await filterBy(view, makeSpec('string1', { $notexists: true }));
			assert.equal(countRows(absent), totalRows);
		});
	});
});
