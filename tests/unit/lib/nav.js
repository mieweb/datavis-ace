/**
 * Navigation and assertion helpers for inspecting the result of
 * `ComputedView.getData()` in unit tests.  These translate the browser-DOM
 * oriented helpers from GLIDE's `tests/lib/grid.js` (getCell, getNumRows,
 * getAggResult, ...) into pure data-structure navigation.
 */

/**
 * Resolve a possibly-negative row index against a length, mirroring GLIDE's
 * `getCell(field, -1)` convention where -1 is the last row.
 */
function resolveIndex(idx, len) {
	return idx < 0 ? len + idx : idx;
}

/**
 * Get the cell object ({ value, orig, formatted, type }) for a field in a plain
 * (ungrouped) data result.  Supports negative indices.
 */
export function cell(data, field, idx) {
	const rows = data.data;
	const i = resolveIndex(idx, rows.length);
	const row = rows[i];
	if (row == null) {
		return null;
	}
	return row.rowData[field];
}

/** Get the decoded `.value` of a cell. */
export function cellValue(data, field, idx) {
	const c = cell(data, field, idx);
	return c == null ? undefined : c.value;
}

/** Get the original (pre-decode) `.orig` of a cell. */
export function cellOrig(data, field, idx) {
	const c = cell(data, field, idx);
	return c == null ? undefined : c.orig;
}

/** Get the `.formatted` representation of a cell. */
export function cellFormatted(data, field, idx) {
	const c = cell(data, field, idx);
	return c == null ? undefined : c.formatted;
}

/**
 * Extract a comparable JavaScript number from a decoded DataVis value, handling
 * the various internal representations DataVis uses (primitive number, numeral,
 * BigNumber, moment).  Returns NaN for values that have no natural numeric form
 * (e.g. durations, strings).
 */
export function toNumber(v) {
	if (v == null) {
		return v;
	}
	if (typeof v === 'number') {
		return v;
	}
	if (typeof v.toNumber === 'function') {		// BigNumber
		return v.toNumber();
	}
	if (typeof v.value === 'function') {		// numeral
		return v.value();
	}
	if (typeof v.valueOf === 'function' && typeof v.valueOf() === 'number') {	// moment
		return v.valueOf();
	}
	return Number(v);
}

/**
 * Like {@link toNumber}, but reads the decoded `.value` of a cell first.
 */
export function cellNumber(data, field, idx) {
	return toNumber(cellValue(data, field, idx));
}

/** Shallow array equality used to match rowVals/colVals. */
function arraysEqual(a, b) {
	if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
		return false;
	}
	for (let i = 0; i < a.length; i += 1) {
		if (a[i] !== b[i]) {
			return false;
		}
	}
	return true;
}

/** Find the index of a group whose rowVal matches the given array. */
export function groupIndex(data, rowVal) {
	return data.rowVals.findIndex((rv) => arraysEqual(rv, rowVal));
}

/**
 * Get the array of data rows belonging to the group whose rowVal matches the
 * given array.  Returns null if no such group exists.
 */
export function groupRows(data, rowVal) {
	const idx = groupIndex(data, rowVal);
	return idx < 0 ? null : data.data[idx];
}

/** Number of rows in the group whose rowVal matches the given array. */
export function groupCount(data, rowVal) {
	const rows = groupRows(data, rowVal);
	return rows == null ? 0 : rows.length;
}

/** Find the index of a pivot column whose colVal matches the given array. */
export function pivotIndex(data, colVal) {
	return data.colVals.findIndex((cv) => arraysEqual(cv, colVal));
}

/**
 * Index into the aggregate results.  `scope` is one of 'group', 'pivot',
 * 'cell', or 'all'.  Indices beyond what a scope needs are ignored:
 *   - all:   results.all[aggIdx]
 *   - group: results.group[aggIdx][rowIdx]
 *   - pivot: results.pivot[aggIdx][colIdx]
 *   - cell:  results.cell[aggIdx][rowIdx][colIdx]
 */
export function aggResult(data, scope, aggIdx, rowIdx, colIdx) {
	const results = data.agg.results[scope];
	switch (scope) {
	case 'all':
		return results[aggIdx];
	case 'group':
		return results[aggIdx][rowIdx];
	case 'pivot':
		return results[aggIdx][colIdx];
	case 'cell':
		return results[aggIdx][rowIdx][colIdx];
	default:
		throw new Error('Unknown aggregate scope: ' + scope);
	}
}
