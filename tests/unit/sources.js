import { assert } from 'chai';
import { loadHttpData, loadRandom100, countRows } from './lib/setup.js';
import { cellOrig } from './lib/nav.js';

// Source format decoding (Phase 8).  The same random100 dataset is served as
// JSON and as CSV through a stubbed HTTP source, confirming that the source
// layer decodes each wire format into the same set of rows.
//
// XML is intentionally not exercised: the XML branch of the source parser
// requires a DOM (`DOMParser` / `Document`), which is not available in the
// headless Node environment.
describe('Source — format decoding', function () {

	it('decodes the JSON wire format into 100 typed rows', async function () {
		var env = await loadHttpData('random100.json', 'json');
		assert.equal(countRows(env.data), 100);
	});

	it('decodes the CSV wire format into 100 rows', async function () {
		var env = await loadHttpData('random100.csv', 'csv');
		assert.equal(countRows(env.data), 100);
	});

	it('produces matching field values across JSON, CSV, and the local source', async function () {
		var jsonEnv = await loadHttpData('random100.json', 'json');
		var csvEnv = await loadHttpData('random100.csv', 'csv');
		var localEnv = await loadRandom100();
		var localData = await new Promise(function (resolve, reject) {
			localEnv.view.getData(function (ok, data) { ok ? resolve(data) : reject(new Error('getData failed')); });
		});

		// Compare the original (pre-decode) cell text across all three loaders
		// for a representative spread of field types.
		var fields = ['rowId', 'string1', 'fruit', 'int1', 'float1', 'date1'];
		for (var r = 0; r < 100; r++) {
			fields.forEach(function (field) {
				var jsonVal = String(cellOrig(jsonEnv.data, field, r));
				var csvVal = String(cellOrig(csvEnv.data, field, r));
				var localVal = String(cellOrig(localData, field, r));
				assert.equal(csvVal, jsonVal, 'CSV vs JSON mismatch at row ' + r + ' field ' + field);
				assert.equal(localVal, jsonVal, 'local vs JSON mismatch at row ' + r + ' field ' + field);
			});
		}
	});
});
