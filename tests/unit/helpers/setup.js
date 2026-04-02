import './env.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';
import { Source, ComputedView } from '../../../index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRUIT_CSV_PATH = path.resolve(__dirname, '../../data/third-party/fruit.csv');

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

	globalThis.window.__fruitTestData = {
		data: data,
		typeInfo: fruitTypeInfo
	};

	var source = new Source(
		{ type: 'local', varName: '__fruitTestData', conversion: [] },
		[],
		null,
		{ name: 'FruitTestSource', deferDecoding: false }
	);

	var view = new ComputedView(source, {
		name: 'FruitTestView',
		saveViewConfig: false
	});

	return getDataAsync(view).then(function () {
		return { source: source, view: view };
	});
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
