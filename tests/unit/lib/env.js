/**
 * Minimal browser environment mock for running DataVis unit tests in Node.js.
 *
 * Provides stubs for `window`, `document`, `Element`, and `HTMLElement` so
 * browser-targeted dependencies (like json-formatter-js) can load without
 * errors.  Import this file before importing any library code.
 */

if (globalThis.window == null) {
	globalThis.window = Object.create(null);
}

// Provide enough of a window.location to prevent mocha from crashing
// when it detects window exists and tries to use window.location.href
if (globalThis.window.location == null) {
	globalThis.window.location = {
		href: 'file:///tests/',
		protocol: 'file:',
		host: '',
		pathname: '/tests/'
	};
}

// Copy common globals that browser code expects on window
globalThis.window.setTimeout = globalThis.setTimeout;
globalThis.window.clearTimeout = globalThis.clearTimeout;
globalThis.window.setInterval = globalThis.setInterval;
globalThis.window.clearInterval = globalThis.clearInterval;
globalThis.window.console = globalThis.console;

// Expose Intl so locale-aware comparisons (e.g. case-insensitive string
// sorting via Intl.Collator in src/types.js) behave the same as in a browser.
if (globalThis.window.Intl == null && globalThis.Intl != null) {
	globalThis.window.Intl = globalThis.Intl;
}

// Provide a Document stub so source-layer parsers that branch on
// `data instanceof Document` (XML detection) can run headlessly.  Plain
// objects and strings are not instances of this stub, so JSON/CSV decoding
// takes the correct non-XML path.
if (globalThis.Document == null) {
	globalThis.Document = function () {};
}

if (globalThis.Element == null) {
	globalThis.Element = function () {};
	globalThis.Element.prototype.matches = function () { return false; };
	globalThis.Element.prototype.closest = function () { return null; };
}

if (globalThis.HTMLElement == null) {
	globalThis.HTMLElement = function () {};
	globalThis.HTMLElement.prototype = Object.create(globalThis.Element.prototype);
}

if (globalThis.document == null) {
	var noopEl = function () {
		return {
			classList: { add: function () {} },
			appendChild: function () {},
			setAttribute: function () {},
			style: {},
			sheet: {
				cssRules: [],
				insertRule: function () {}
			}
		};
	};
	globalThis.document = {
		createElement: noopEl,
		createTextNode: function () { return {}; },
		head: { appendChild: function () {} },
		body: { appendChild: function () {} },
		querySelector: function () { return null; },
		querySelectorAll: function () { return []; }
	};
}

