import { assert } from 'chai';
import { loadRandom100, resetAndGetData, sortBy, filterBy } from './lib/setup.js';
import { cell, cellNumber, cellOrig } from './lib/nav.js';
import { types } from '../../index.js';

// Port of GLIDE's type pages.  random100.json stores each logical column in
// several representations: integers and floats appear as primitive / numeral /
// bignumber, currency and the temporal types appear in several display
// formats.  Every representation of a given logical column holds the same
// value, so decoding, ordering, and equality filtering must behave identically
// across them.
//
// NOTE: the `time` type is intentionally excluded — its representations decode
// inconsistently (bare clock string vs. ISO moment), which breaks comparison
// and filtering.  See "Suspected bugs" in plans/unit-tests.md.
describe('ComputedView — Type representations (random100)', function () {
	var view;

	before(async function () {
		var env = await loadRandom100();
		view = env.view;
	});

	afterEach(async function () {
		await resetAndGetData(view);
	});

	// Filter each field by $eq using a per-field literal, returning the sorted
	// rowId array matched by each.
	async function eqRowSets(fields, literalFor) {
		var sets = [];
		for (var i = 0; i < fields.length; i++) {
			var field = fields[i];
			var spec = {};
			spec[field] = { $eq: literalFor(field) };
			var filtered = await filterBy(view, spec);
			sets.push(filtered.data.map(function (row) { return row.rowData['rowId'].value; }).sort(function (a, b) { return a - b; }));
			await resetAndGetData(view);
		}
		return sets;
	}

	function assertSameNonEmptySets(sets, fields) {
		assert.isAbove(sets[0].length, 0, 'at least one matching row');
		for (var k = 1; k < sets.length; k++) {
			assert.deepEqual(sets[k], sets[0], fields[k] + ' matched a different row set');
		}
	}

	// Numeric families hold the same value across internal representations and
	// decode to a comparable JavaScript number.
	var numericFamilies = [
		{ name: 'integer (primitive / numeral / bignumber)', fields: ['int1', 'int4', 'int7'], delta: 0 },
		{ name: 'float (primitive / numeral / bignumber)', fields: ['float1', 'float4', 'float7'], delta: 1e-6 },
		{ name: 'currency (number / grouped / symbol formats)', fields: ['currency1', 'currency2', 'currency3'], delta: 0 }
	];

	numericFamilies.forEach(function (fam) {
		describe(fam.name, function () {
			it('decodes every row to the same value across representations', async function () {
				var data = await resetAndGetData(view);
				for (var i = 0; i < data.data.length; i++) {
					var expected = cellNumber(data, fam.fields[0], i);
					for (var j = 1; j < fam.fields.length; j++) {
						assert.approximately(cellNumber(data, fam.fields[j], i), expected, fam.delta, fam.fields[j] + ' row ' + i);
					}
				}
			});

			it('induces the same ordering across representations', async function () {
				for (var s = 0; s < fam.fields.length; s++) {
					var data = await sortBy(view, fam.fields[s], 'ASC');
					fam.fields.forEach(function (checkField) {
						var prev = -Infinity;
						for (var i = 0; i < data.data.length; i++) {
							var v = cellNumber(data, checkField, i);
							assert.isAtLeast(v, prev, 'sort by ' + fam.fields[s] + ', column ' + checkField + ' not monotonic at row ' + i);
							prev = v;
						}
					});
				}
			});

			it('matches the same rows for $eq across representations', async function () {
				var data = await resetAndGetData(view);
				var literal = cellNumber(data, fam.fields[0], 0);
				var matchedSets = await eqRowSets(fam.fields, function () { return literal; });
				assertSameNonEmptySets(matchedSets, fam.fields);
			});
		});
	});

	// Temporal families share one internal representation (moment) but appear in
	// several display formats.  Absolute decoded instants differ by the format's
	// timezone handling, so equivalence is asserted through ordering and
	// equality filtering rather than raw value comparison.
	var formatFamilies = [
		{ name: 'date (ISO / long / slash formats)', fields: ['date1', 'date2', 'date3'] },
		{ name: 'datetime (ISO / long / slash formats)', fields: ['datetime1', 'datetime2', 'datetime3'] }
	];

	formatFamilies.forEach(function (fam) {
		describe(fam.name, function () {
			it('produces identical row ordering across formats', async function () {
				var reference = null;
				for (var s = 0; s < fam.fields.length; s++) {
					var data = await sortBy(view, fam.fields[s], 'ASC');
					var seq = data.data.map(function (row) { return row.rowData['rowId'].value; });
					if (reference == null) {
						reference = seq;
					}
					else {
						assert.deepEqual(seq, reference, 'sort by ' + fam.fields[s] + ' ordered rows differently');
					}
					await resetAndGetData(view);
				}
			});

			it('matches the same rows for $eq across formats', async function () {
				var data = await resetAndGetData(view);
				// Filters are always specified in ISO format (this is how the UI
				// sets them), so use the ISO-formatted variant's value as the
				// single operand for every display format in the family.
				var isoLiteral = cellOrig(data, fam.fields[0], 0);
				var matchedSets = await eqRowSets(fam.fields, function () { return isoLiteral; });
				assertSameNonEmptySets(matchedSets, fam.fields);
			});
		});
	});

	// Single-representation ordering self-consistency for the remaining temporal
	// types, checked with the type's own comparator.
	describe('temporal ordering self-consistency', function () {
		var cases = [
			{ field: 'date1', type: 'date' },
			{ field: 'datetime1', type: 'datetime' },
			{ field: 'duration1', type: 'duration' },
			{ field: 'duration2', type: 'duration' },
			{ field: 'duration3', type: 'duration' }
		];

		cases.forEach(function (c) {
			it('sorts ' + c.field + ' monotonically', async function () {
				var compare = types.registry.get(c.type).compare;
				var data = await sortBy(view, c.field, 'ASC');
				for (var i = 1; i < data.data.length; i++) {
					assert.isAtMost(compare(cell(data, c.field, i - 1).value, cell(data, c.field, i).value), 0, c.field + ' not sorted at row ' + i);
				}
			});
		});
	});

	describe('duration equality', function () {
		it('filters duration1 by $eq to a non-empty, consistent set', async function () {
			var data = await resetAndGetData(view);
			var compare = types.registry.get('duration').compare;
			var filtered = await filterBy(view, { duration1: { $eq: cellOrig(data, 'duration1', 0) } });
			assert.isAbove(filtered.data.length, 0, 'duration1 $eq matched no rows');
			filtered.data.forEach(function (row) {
				assert.equal(compare(row.rowData['duration1'].value, cell(data, 'duration1', 0).value), 0, 'duration1 matched a different value');
			});
		});
	});
});
