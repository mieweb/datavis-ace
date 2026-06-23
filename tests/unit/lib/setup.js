import './env.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';
import { Source, ComputedView } from '../../../index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRUIT_CSV_PATH = path.resolve(__dirname, '../../data/third-party/fruit.csv');
const DATA_DIR = path.resolve(__dirname, '../../data');

var sourceCounter = 0;

/**
 * Build a LocalSource + ComputedView around an in-memory data object of the
 * form { data: [...], typeInfo: [...] }, stashing it on globalThis.window so
 * the LocalSource can read it.  Shared by all data loaders.
 *
 * @param {{data: Array, typeInfo: Array}} payload
 * @param {string} name - base name used for the source/view
 * @returns {Promise<{source: Source, view: ComputedView}>}
 */
function buildView(payload, name) {
	var varName = '__datavisTestData' + (sourceCounter++);
	globalThis.window[varName] = payload;

	var source = new Source(
		{ type: 'local', varName: varName, conversion: [] },
		[],
		null,
		{ name: name + 'Source', deferDecoding: false }
	);
	if (process.env.DATAVIS_LOGGING != '1') {
		source.disableLogging();
	}

	var view = new ComputedView(source, {
		name: name + 'View',
		saveViewConfig: false
	});
	if (process.env.DATAVIS_LOGGING != '1') {
		view.disableLogging();
	}

	return getDataAsync(view).then(function () {
		return { source: source, view: view };
	});
}

/**
 * Parse fruit.csv and return raw row data (array of plain objects with string values)
 * along with typeInfo definitions.
 */
function parseFruitCsv() {
	var csvText = fs.readFileSync(FRUIT_CSV_PATH, 'utf-8');
	var parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
	return parsed.data;
}

var fruitTypeInfo = [
	{ field: 'Order ID', type: 'number' },
	{ field: 'Product', type: 'string' },
	{ field: 'Category', type: 'string' },
	{ field: 'Amount', type: 'currency' },
	{ field: 'Date', type: 'date', format: 'M/D/YYYY', internalType: 'moment' },
	{ field: 'Country', type: 'string' }
];

/**
 * Set up a Source backed by fruit.csv data and return a ComputedView wrapping it.
 * Mocks globalThis.window so LocalSource can read the data.
 *
 * @returns {Promise<{source: Source, view: ComputedView}>}
 */
export function loadFruitData() {
	var data = parseFruitCsv();

	return buildView({ data: data, typeInfo: fruitTypeInfo }, 'FruitTest');
}

/**
 * Load a generated JSON data file (e.g. random100.json) that embeds both a
 * `data` array and a `typeInfo` array, returning a Source + ComputedView.
 *
 * @param {string} fileName - file name relative to tests/data (e.g. 'random100.json')
 * @returns {Promise<{source: Source, view: ComputedView}>}
 */
export function loadJsonData(fileName) {
	if (fileName == null) {
		throw new Error('loadJsonData requires a file name');
	}
	var filePath = path.resolve(DATA_DIR, fileName);
	var payload = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
	var baseName = path.basename(fileName, path.extname(fileName));
	return buildView(payload, baseName);
}

/**
 * Convenience wrapper that loads the shared random100.json fixture.
 *
 * @returns {Promise<{source: Source, view: ComputedView}>}
 */
export function loadRandom100() {
	return loadJsonData('random100.json');
}

/**
 * Build a Source + ComputedView around an in-memory { data, typeInfo } payload.
 * Used for small bespoke fixtures (e.g. the date-filter dataset) that are not
 * stored as generated files.
 *
 * @param {Array} data - array of plain row objects
 * @param {Array} typeInfo - array of { field, type, ... } descriptors
 * @param {string} name - base name for the source/view
 * @returns {Promise<{source: Source, view: ComputedView}>}
 */
export function loadInlineData(data, typeInfo, name) {
	return buildView({ data: data, typeInfo: typeInfo }, name || 'InlineTest');
}

/**
 * Build an HTTP Source + ComputedView that reads a generated data file as if it
 * were fetched over the network, exercising the source layer's format decoding
 * (JSON / CSV).  `globalThis.fetch` is temporarily replaced with a stub that
 * serves the file's contents, then restored once the data has been loaded.
 *
 * @param {string} fileName - file name relative to tests/data (e.g. 'random100.csv')
 * @param {string} dataType - 'json' or 'csv'
 * @param {string} [name] - base name for the source/view
 * @returns {Promise<{source: Source, view: ComputedView, data: object}>}
 */
export function loadHttpData(fileName, dataType, name) {
	if (fileName == null || dataType == null) {
		throw new Error('loadHttpData requires a file name and dataType');
	}
	var filePath = path.resolve(DATA_DIR, fileName);
	var text = fs.readFileSync(filePath, 'utf-8');
	var contentType = dataType === 'json' ? 'application/json' : 'text/plain';
	var baseName = name || path.basename(fileName, path.extname(fileName));

	var prevFetch = globalThis.fetch;
	globalThis.fetch = function () {
		return Promise.resolve({
			ok: true,
			headers: { get: function () { return contentType; } },
			json: function () { return Promise.resolve(JSON.parse(text)); },
			text: function () { return Promise.resolve(text); }
		});
	};

	var source = new Source(
		{ type: 'http', dataType: dataType, url: 'mock://' + fileName, conversion: [] },
		{},
		null,
		{ name: baseName + 'Source', deferDecoding: false }
	);
	if (process.env.DATAVIS_LOGGING != '1') {
		source.disableLogging();
	}

	var view = new ComputedView(source, {
		name: baseName + 'View',
		saveViewConfig: false
	});
	if (process.env.DATAVIS_LOGGING != '1') {
		view.disableLogging();
	}

	var restore = function () { globalThis.fetch = prevFetch; };
	return getDataAsync(view).then(function (data) {
		restore();
		return { source: source, view: view, data: data };
	}, function (err) {
		restore();
		throw err;
	});
}

/**
 * Read a generated data file's raw contents ({ data, typeInfo }) without
 * building a view.  Useful for deriving a field -> type map or computing
 * expected values independently of the view.
 *
 * @param {string} fileName - file name relative to tests/data
 * @returns {{data: Array, typeInfo: Array}}
 */
export function loadDataFile(fileName) {
	var filePath = path.resolve(DATA_DIR, fileName);
	return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/**
 * Build a map of field name -> type name from a data file's typeInfo.
 *
 * @param {string} fileName - file name relative to tests/data
 * @returns {Object.<string, string>}
 */
export function fieldTypes(fileName) {
	var payload = loadDataFile(fileName);
	var map = {};
	payload.typeInfo.forEach(function (ti) {
		map[ti.field] = ti.type;
	});
	return map;
}

/**
 * Override the "current" date/time used by relative date filters by setting
 * window.MIE.WC_DataVis.CURRENT_DATE.  Used to make relative date filters
 * ($this / $last) deterministic.
 *
 * @param {string} dateStr - e.g. '2024-06-27'
 */
export function setCurrentDate(dateStr) {
	if (dateStr == null) {
		throw new Error('setCurrentDate requires a date string');
	}
	var win = globalThis.window;
	if (win.MIE == null) {
		win.MIE = {};
	}
	if (win.MIE.WC_DataVis == null) {
		win.MIE.WC_DataVis = {};
	}
	win.MIE.WC_DataVis.CURRENT_DATE = dateStr;
}

/**
 * Clear any overridden current date set by setCurrentDate.
 */
export function clearCurrentDate() {
	var win = globalThis.window;
	if (win.MIE != null && win.MIE.WC_DataVis != null) {
		delete win.MIE.WC_DataVis.CURRENT_DATE;
	}
}

/**
 * Standard options for configuring a view in tests without triggering data
 * recomputation, events, or pref saves.  The data is recomputed explicitly via
 * getDataAsync once configuration is complete.
 */
export var CONFIG_OPTS = { updateData: false, sendEvent: false, savePrefs: false };

/**
 * Apply a single-field vertical sort, then return the recomputed data.
 *
 * @param {ComputedView} view
 * @param {string} field
 * @param {string} dir - 'ASC' or 'DESC'
 * @returns {Promise<object>}
 */
export function sortBy(view, field, dir) {
	view.setSort({ vertical: { field: field, dir: dir } }, CONFIG_OPTS);
	return getDataAsync(view);
}

/**
 * Group by one or more fields, then return the recomputed data.  Each entry of
 * `fieldNames` may be a string or a { field, fun } object (fun naming a
 * GroupFunction such as 'year').
 *
 * @param {ComputedView} view
 * @param {Array.<string|object>} fieldNames
 * @returns {Promise<object>}
 */
export function groupBy(view, fieldNames) {
	view.setGroup({ fieldNames: fieldNames }, CONFIG_OPTS);
	return getDataAsync(view);
}

/**
 * Apply a filter spec, then return the recomputed data.
 *
 * @param {ComputedView} view
 * @param {object} spec
 * @returns {Promise<object>}
 */
export function filterBy(view, spec) {
	view.setFilter(spec, null, CONFIG_OPTS);
	return getDataAsync(view);
}

/**
 * Promise wrapper for view.getData(cont) callback pattern.
 *
 * @param {ComputedView} view
 * @returns {Promise<object>} The data object from getData
 */
export function getDataAsync(view) {
	return new Promise(function (resolve, reject) {
		view.getData(function (ok, data) {
			if (ok) {
				resolve(data);
			}
			else {
				reject(new Error('getData failed'));
			}
		});
	});
}

/**
 * Get a fresh ComputedView with all config cleared.
 * Resets filter, group, pivot, aggregate without triggering data update,
 * then returns fresh data.
 *
 * @param {ComputedView} view
 * @returns {Promise<object>}
 */
export function resetAndGetData(view) {
	view.reset({ updateData: false, sendEvent: false, savePrefs: false });
	return getDataAsync(view);
}

/**
 * Count the total number of data rows, handling both plain and grouped data.
 */
export function countRows(data) {
	if (data.isPlain) {
		return data.data.length;
	}
	else if (data.isGroup && !data.isPivot) {
		var total = 0;
		for (var i = 0; i < data.data.length; i++) {
			total += data.data[i].length;
		}
		return total;
	}
	return data.data.length;
}
