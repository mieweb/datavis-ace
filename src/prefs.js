// Preferences {{{1

/**
 * @typedef {object} Prefs_HTML
 *
 * @property {Array.<Object>} filters Describes the filters on the grid.
 * @property {string} filters[].colName Name of the column the filter applies to.
 * @property {string} filters[].filterType 
 * @property {string} filters[].operator
 * @property {any} filters[].value
 */

/**
 * Encapsulate the preference system, which provides all the configuration for <wcgrid> output.
 *
 * @memberof wcgraph_int
 * @class
 *
 * @property {object} defn The grid definition.
 *
 * @property {string} gridId The ID of the grid, as given by <wcgrid id>.
 *
 * @property {string} output The output mode of the grid.
 *
 * @property {string} view The current view for save/load operations.
 *
 * @property {object} cache Stores preferences locally, so switching views only needs to load the
 * view from the server once, after which it gets saved here.
 *
 * @property {object} userData Stores things that might be used by the different output plugins.
 * Basically, you can put whatever you want here.
 *
 * @property {Timing} timing Tracks how long it takes this preferences manager to do things.
 */

var Prefs = function (defn) {
	this.defn = defn;
	this.gridId = getProp(defn, 'table', 'prefs', 'gridId');
	this.output = getProp(defn, 'table', 'output', 'method');
	this.view = 'Main';
	this.cache = {};
	this.userData = {};
};

// #setUserData {{{2

/**
 * Set userdata.
 *
 * @method
 *
 * @param {string} k The key to use in the userdata object.
 * @param {any} v The value to store in the userdata object.
 */

Prefs.prototype.setUserData = function (k, v) {
	this.userData[k] = v;
};

// #getUserData {{{2

/**
 * Get userdata.
 *
 * @method
 *
 * @param {string} k The key to use in the userdata object.
 */

Prefs.prototype.getUserData = function (k) {
	return this.userData[k];
};

// #setView {{{2

/**
 * Set the current view.
 *
 * @method
 *
 * @param {string} viewName Name of the view to mark as current.
 */

Prefs.prototype.setView = function (viewName) {
	this.view = viewName;
};

// #loadInitial {{{2

/**
 * Load the initial view for the grid.  The initial view is located by getting the preference
 * object for the grid by itself, that object will contain a property "initialView."  Then we
 * retrieve that view to get the actual preferences, and apply them to the grid.
 *
 * @method
 *
 * @param {function} cont Function to call after we're done.  Receives a single argument: true if
 * the preferences were retrieved OK, and false if there was an error.
 */

Prefs.prototype.loadInitial = function (cont, dontReallyLoad) {
	var self = this;
	var timingEvt = [self.gridId, 'Preferences / Determine initial view'];

	self.timing.start(timingEvt);

	jQuery.ajax({
		url: 'webchart.cgi',
		method: 'GET',
		dataType: 'json',
		data: {
			f: 'ajaxget',
			s: 'grid_prefs',
			response_format: 'json',
			grid_id: self.gridId
		},
		error: function (xhr, status, e) {
			self.timing.stop(timingEvt);
			self.defn.error(e);
		},
		success: function (data) {
			self.timing.stop(timingEvt);
			data = data.results;
			if (data.result === 'ok') {
				if (!isNothing(data.pref.initialView)) {
					debug.info('PREFS', 'Loading preferences from initial view:', data.pref.initialView);
					return self.load(data.pref.initialView, cont, dontReallyLoad);
				}
			}
			return self.load(self.view, cont, dontReallyLoad);
		}
	});
};

// #saveInitial {{{2

/**
 * Save the name of the initial view.
 *
 * @method
 *
 * @param {boolean} setDefaults If true, set the initial view for all users (e.g. user_id = 0).
 *
 * @param {function} cont Function to call after we're done.  It receives one argument: true if we
 * were able to save the initial view correctly, false if there was an error.
 */

Prefs.prototype.saveInitial = function (setDefaults, cont) {
	var self = this;

	jQuery.ajax({
		url: 'webchart.cgi',
		method: 'POST',
		dataType: 'json',
		data: {
			f: 'ajaxpost',
			s: 'grid_prefs',
			set_defaults: setDefaults ? 1 : 0,
			response_format: 'json',
			grid_id: self.gridId,
			pref: JSON.stringify({
				initialView: self.view
			})
		},
		error: function (jqXHR, status, error) {
			jQuery.growl.error({title: 'Error Saving' + (setDefaults ? ' Default ' : ' ') + 'Initial View', message: error});

			if (typeof cont === 'function') {
				return cont(false);
			}
		},
		success: function (response) {
			if (response && response.result === 'error') {
				jQuery.growl.error({title: 'Error Saving' + (setDefaults ? ' Default ' : ' ') + 'Initial View', message: response.message});
			}

			if (typeof cont === 'function') {
				return cont(response && response.result === 'ok');
			}
		}
	});
};

// .getFrom {{{2

Prefs.getFrom = {};

/**
 * Get preferences from a jQWidgets grid.
 *
 * @param {Prefs} self A preferences instance.
 * @param {string} id The ID of a div containing a grid.
 */

// .getFrom.jQWidgets {{{3

Prefs.getFrom.jqwidgets = function (self, id) {
	var grid = jQuery(document.getElementById(id)).children('div[role="grid"]');
	var prefs = grid.jqxGrid('getstate');

	// Remove parts of the prefs that store what rows you have selected.  This is almost never
	// useful, because in most use cases the grid will not show the exact same data twice.

	delete prefs.selectedrowindex;
	delete prefs.selectedrowindexes;

	// BUG [jQWidgets 4.1.2] Can cause an error in jQWidgets when loading preferences that include a
	// list of the columns we've grouped by.

	// delete prefs.groups;

	return {
		jqxGrid: prefs
	};
};

// .getFrom.pivot {{{3

/**
 * The majority of this function comes from refreshDelayed() in the pivottable source code. It is
 * responsible for checking the user interface elements and building a configuration object from
 * them. We take that information and store it as the preferences instead.
 *
 * @param {Prefs} self A preferences instance.
 */

Prefs.getFrom.pivot = function (self) {
	var prefs = self.getUserData('pivot/prefs');
	return {
		pivot: prefs
	};
};

// .getFrom.html {{{3

Prefs.getFrom.html = function (self) {
	return {
		html: {
			filters: self.getUserData('html/filters'),
			sorting: self.getUserData('html/sorting')
		}
	};
};

// #save {{{2

/**
 * Save the grid preferences.  This grabs the prefs from the grid immediately, then sends them to
 * the server to be saved.  You can substitute your own preferences object if you want.
 *
 * @method
 *
 * @param {object} prefs An alternate preferences object, if you want to save that instead of what
 * we get from the jQWidgets grid.
 *
 * @param {boolean} setDefaults If true, save these preferences for all users (i.e. save under
 * user_id = 0).
 *
 * @param {function} cont Continuation function to call after we're done.  It receives one
 * argument: true if we saved the preferences successfully, false if there was an error.
 */

Prefs.prototype.save = function (prefs, setDefaults, cont) {
	var self = this;

	if (!getProp(self.defn, 'table', 'prefs', 'enableSaving')) {
		if (typeof cont === 'function') {
			return cont();
		}
		return;
	}

	if (isLocked(self.defn, 'prefs')) {
		debug.info('PREFS', 'Unable to save prefs: they are locked');
		return;
	}

	if (prefs === null) {
		debug.info('PREFS', 'Clearing out preferences');
	}
	else {
		if (prefs === undefined) {
			if (Prefs.getFrom[getProp(self.defn, 'table', 'output', 'method')] === undefined) {
				debug.warn('Unable to obtain preferences');
			}
			else {
				prefs = Prefs.getFrom[getProp(self.defn, 'table', 'output', 'method')](this, getProp(self.defn, 'table', 'id'));
			}
		}
		debug.info('PREFS', 'Saving preferences: %O', prefs);
	}

	if (prefs === undefined) {
		debug.info('No preferences to save');

		if (typeof cont === 'function') {
			return cont(false);
		}

		return;
	}

	self.cache[self.view] = prefs;

	jQuery.ajax({
		url: 'webchart.cgi',
		method: 'POST',
		dataType: 'json',
		data: {
			f: 'ajaxpost',
			s: 'grid_prefs',
			set_defaults: setDefaults ? 1 : 0,
			response_format: 'json',
			grid_id: self.gridId + '.' + self.view,
			pref: JSON.stringify(prefs)
		},
		error: function () {
			if (typeof cont === 'function') {
				return cont(false);
			}
		},
		success: function (response) {
			if (response && response.result === 'error') {
				jQuery.growl.error({title: 'Error Saving' + (setDefaults ? ' Default ' : ' ') + 'Preferences', message: response.message});
			}
			self.saveInitial(setDefaults, cont);
		}
	});
};

// #load {{{2

/**
 * Load preferences for a specified view.
 *
 * @method
 *
 * @param {string} viewName Name of the view to load.  If omitted, then use the current view.
 *
 * @param {function} cont Function to call when we're done.  Receives a single argument: true if
 * we retrieved and applied preferences successfully, false if an error occurred, or the
 * preferences object when `dontReallyLoad` is true.
 *
 * @param {boolean} dontReallyLoad If true, then don't load the preferences into a grid, just pass
 * them to `cont`.
 */

Prefs.prototype.load = function (viewName, cont, dontReallyLoad) {
	var self = this;
	var timingEvt = [self.gridId, 'Preferences / Retrieving preferences'];

	self.timing.start(timingEvt);

	if (isNothing(viewName)) {
		viewName = self.view;
	}

	self.view = viewName;

	if (self.cache[viewName]) {
		self.timing.stop(timingEvt);

		if (dontReallyLoad) {
			if (typeof cont === 'function') {
				return cont(self.cache[viewName]);
			}
			return;
		}

		self.apply(self.cache[viewName], cont);
		return;
	}

	jQuery.ajax({
		url: 'webchart.cgi',
		method: 'GET',
		dataType: 'json',
		data: {
			f: 'ajaxget',
			s: 'grid_prefs',
			response_format: 'json',
			grid_id: self.gridId + '.' + viewName
		},
		error: function (xhr, status, e) {
			self.timing.stop(timingEvt);
			self.defn.error(e);
		},
		success: function (data) {
			self.timing.stop(timingEvt);
			data = data.results;
			if (data.result === 'ok') {
				if (getProp(data, 'pref', 'jqxGrid') !== undefined) {
					_.each(data.pref.jqxGrid.columns, function (col) {
						delete col.hidden;
					});

					// Remove parts of the prefs that store what rows you have selected.  This is almost
					// never useful, because in most use cases the grid will not show the exact same data
					// twice.

					delete data.pref.jqxGrid.selectedrowindex;
					delete data.pref.jqxGrid.selectedrowindexes;

					// BUG [jQWidgets 4.1.2] Can cause an error in jQWidgets when loading preferences that
					// include a list of the columns we've grouped by.

					// delete data.pref.jqxGrid.groups;
				}

				self.cache[viewName] = data.pref;

				// If they don't really want us to load the preferences, try to pass them along to the
				// continuation function.  But whatever you do, don't actually load the preferences.

				if (dontReallyLoad) {
					if (typeof cont === 'function') {
						return cont(self.cache[viewName]);
					}
					return;
				}

				self.apply(self.cache[viewName], cont);
			}
			else {
				if (typeof cont === 'function') {
					return cont(false);
				}
			}
		}
	});
};

// #apply {{{2

/**
 * Apply preferences to the grid.  Only works for the jQWidgets grid output right now.
 *
 * @method
 *
 * @param {object} prefs The preferences object to apply.
 */

Prefs.prototype.apply = function (prefs, cont) {
	var self = this;
	var output = getProp(self.defn, 'table', 'output', 'method');
	var grid;
	var timingEvt = [self.gridId, 'Preferences / Apply preferences'];

	self.timing.start(timingEvt);

	debug.info('PREFS', 'Applying preferences (grid = ' + self.gridId + ', output = ' + output + '): %O', prefs);

	if (isNothing(prefs)) {
		if (typeof cont === 'function') {
			self.timing.stop(timingEvt);
			return cont(false);
		}
		self.timing.stop(timingEvt);
		return;
	}

	if (output === 'jqwidgets') {
		grid = self.getUserData('grid') || jQuery(document.getElementById(self.defn.table.id)).children('div [role="grid"]');
	}

	var f = function () {
		switch (output) {
		case 'jqwidgets':
			if (getPropDef(prefs, 'jqxGrid', 'filters', 'filterscount') > 0) {

				// Loading these prefs will cause the filter event handler to fire.  Don't lock up
				// afterwards, because you're not going to get run again.  Is this horrible software
				// design?  You betcha, but we have no other way to do it at this time, because of the
				// way that jQWidgets works.

				self.defn._lockInfo = 'dontlock';
			}

			lock(self.defn, 'prefs');

			// Unregister all event handlers so that nothing we're changing with preferences can fire
			// the event handlers.  WHY DO THEY NOT HAVE AN OPTION TO DO THIS AUTOMATICALLY?

			_.each(self.defn._events, function (handler, eventName) {
				grid.off(eventName);
			});

			// ALTERNATIVELY, it seems (from the documentation) like you *should* be able to use this to
			// suspend redrawing and event handlers while applying preferences, but it doesn't work.
			// I'm leaving this here to let my future self know that it's not viable.

			// grid.jqxGrid('beginupdate');

			try {
				grid.jqxGrid('loadstate', prefs.jqxGrid);
			}
			catch (e) {
				log.warn('An exception occurred while loading preferences', e);
			}

			// Restore all event handlers now that preferences are applied.

			_.each(self.defn._events, function (handler, eventName) {
				grid.on(eventName, handler);
			});

			unlock(self.defn, 'prefs');

			/* =================================================================================
			 * THIS CODE ISN'T NECESSARY, BUT I DON'T WANT TO DELETE IT IN CASE I NEED IT LATER.
			 * =================================================================================

			self.timing.stop(timingEvt);

			// Pause for a sec to allow the grid to fire all its event handlers for the things that
			// changed as a result of applying the preferences (column resize, sort, etc.) - after that,
			// we can unlock the preferences.  Otherwise, we might unlock them before the event handlers
			// do their thing, and end up saving preferences unnecessarily.

			return setTimeout(function () {
				unlock(self.defn, 'prefs');
				if (typeof cont === 'function') {
					return cont(true);
				}
			}, 100);

			 */

			break;

		case 'pivot':
			$(document.getElementById(self.defn.table.id)).wcPivotUI(self.getUserData('pivot/data'), _.extend({}, self.getUserData('pivot/default'), getPropDef({}, prefs, 'pivot')), true);
			break;

		case 'html':

			if (self.defn.gridFilterSet === undefined) {
				log.warn('Filter preferences are not supported with HTML output unless using GridFilterSet');
			}
			else {
				self.defn.gridFilterSet.loadPrefs(prefs);
			}
			break;

		default:
			log.warn('Preferences are not supported for output method "' + output + '".');
		}

		self.timing.stop(timingEvt);

		if (typeof cont === 'function') {
			return cont(true);
		}
	};

	// If we're loading into a grid and it's not yet visible, there's no reason to block it.  Just
	// load the preferences and move on, somebody else will make it visible when they're ready.

	if (output === 'jqwidgets' && !isVisible(grid)) {
		return f();
	}
	else {
		return withGridBlock(self.defn, f, 'LOADING PREFS');
	}
};
