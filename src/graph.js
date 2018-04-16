// Graph {{{1

var Graph = function (id, view, opts) {
	var self = this;

	self.normalize(opts);
	
	debug.info('GRAPH', 'opts = %O', opts);
	self.renderer = new GraphRendererGoogle(id, view, opts);

	/*
	if (window.google) {
		self.renderer = new GraphRendererGoogle(id, view, opts);
	}
	else if (window.$jit) {
		self.renderer = new GraphRendererJit(id, view, opts);
	}
	*/

	self.draw();
};

Graph.prototype = Object.create(Object.prototype);
Graph.prototype.constructor = Graph;

// #draw {{{2

Graph.prototype.draw = function () {
	var self = this;

	self.renderer.draw();
}

// #normalize {{{2

Graph.prototype.normalize = function (opts) {
	_.each(['whenPlain', 'whenGroup', 'whenPivot'], function (dataFormat) {
		if (opts[dataFormat] === undefined) {
			return;
		}

		var config = opts[dataFormat];

		// Check the "graphType" property.

		if (!isNothing(config.graphType)) {
			if (!_.isString(config.graphType)) {
				throw new Error('Graph config error: data format "' + dataFormat + '": `graphType` must be a string');
			}

			if (['area', 'bar', 'column', 'pie'].indexOf(config.graphType) === -1) {
				throw new Error('Graph config error: data format "' + dataFormat + '": invalid `graphType`: ' + config.graphType);
			}
		}

		switch (config.graphType) {
		case 'area':
		case 'bar':
		case 'column':
		case 'pie':
			if (!isNothing(config.valueField) && !isNothing(config.valueFields)) {
				throw new Error('Graph config error: data format "' + dataFormat + '": can\'t define both `valueField` and `valueFields`');
			}

			// Turn the singular "valueField" into the plural "valueFields."

			if (!isNothing(config.valueField)) {
				if (!_.isString(config.valueField)) {
					throw new Error('Graph config error: data format "' + dataFormat + '": `valueField` must be a string');
				}
				config.valueFields = [config.valueField];
				delete config.valueField;
			}

			// Check the "valueFields" property, if it exists.

			if (!isNothing(config.valueFields)) {
				if (!_.isArray(config.valueFields)) {
					throw new Error('Graph config error: data format "' + dataFormat + '": `valueFields` must be an array');
				}

				_.each(config.valueFields, function (f, i) {
					if (!_.isString(f)) {
						throw new Error('Graph config error: data format "' + dataFormat + '": `valueFields[' + i + ']` must be a string');
					}
				});
			}
		}
	});
};

// GraphRenderer {{{1

GraphRenderer = makeSubclass(Object, function (id, view, opts) {
	var self = this;

	self.id = id;
	self.view = view;
	self.opts = opts;
	self.addRedrawHandlers();
});

// #addRedrawHandlers {{{2

GraphRenderer.prototype.addRedrawHandlers = function () {
	var self = this;

	self.view.on(View.events.workEnd, function () {
		debug.info('GRAPH RENDERER // HANDLER (View.workEnd)',
							 'Redrawing graph because the view has finished doing work');
		self.draw();
	}, {
		who: self
	});
};

// GraphRendererGoogle {{{1

GraphRendererGoogle = makeSubclass(GraphRenderer);

// #draw_plain {{{2

GraphRendererGoogle.prototype.draw_plain = function (data, typeInfo, dt) {
	var self = this
		, graphConfig;

	var convertType = function (t) {
		switch (t) {
		case 'currency':
			return 'number';
		default:
			return t;
		}
	};

	if (self.opts.whenPlain === undefined) {
		debug.info('GRAPH RENDERER', 'No graph configuration defined for plain data');
		return;
	}

	graphConfig = self.opts.whenPlain;

	dt.addColumn(convertType(typeInfo.get(graphConfig.categoryField).type), graphConfig.categoryField);

	_.each(graphConfig.valueFields, function (field) {
		dt.addColumn(convertType(typeInfo.get(field).type), field);
	});

	var getRealValue = function (f, x) {
		if (typeInfo.get(f).type === 'date' && moment.isMoment(x.value)) {
			return {v: x.value.toDate(), f: x.orig};
		}
		else if (['number', 'currency'].indexOf(typeInfo.get(f).type) >= 0 && numeral.isNumeral(x.value)) {
			return {v: x.value._value, f: x.orig};
		}
		else {
			return x.value;
		}
	};

	_.each(data.data, function (row) {
		var newRow;

		newRow = _.map([graphConfig.categoryField].concat(graphConfig.valueFields), function (f) {
			return getRealValue(f, row.rowData[f]);
		});

		dt.addRow(newRow);
	});

	return graphConfig;
};

// #draw_group {{{2

GraphRendererGoogle.prototype.draw_group = function (data, typeInfo, dt) {
	var self = this
		, graphConfig;

	graphConfig = deepCopy(self.opts.whenGroup || {});
	_.defaults(graphConfig, {
		graphType: 'column',
		categoryField: data.groupFields[0],
		valueFields: [{
			name: 'Count',
			aggFun: 'count'
		}]
	});

	// dt.addColumn(typeInfo.get(graphConfig.categoryField).type, graphConfig.categoryField);
	dt.addColumn('string', graphConfig.categoryField);

	_.each(graphConfig.valueFields, function (f) {
		var agg, aggType;

		if (typeof f === 'string') {
			dt.addColumn(typeInfo.get(f).type, f);
		}
		else if (typeof f === 'object') {
			if (f.aggFun) {
				agg = AGGREGATE_REGISTRY.get(f.aggFun);

				if (agg.type) {
					aggType = agg.type;
				}
				else if (f.aggField) {
					aggType = typeInfo.get(f.aggField).type;
				}
				else {
					// Aggregate function doesn't have a specified type, but it isn't being applied to a
					// specific field, so there's no way to tell what the output type is going to be.
					//
					// TODO Choose a default type like 'string' instead of throwing.

					throw new Error('Unable to determine type of value aggregate');
				}

				dt.addColumn(aggType, f.aggFun + '(' + (f.aggField || '') + ')');
			}
			else {
				// The only configuration allowed when not a string is to specify an aggregate function,
				// which they didn't do.

				throw new Error('Invalid value specification');
			}
		}
		else {
			// Not a string (field name) and not an object (aggregate function), so it's some other
			// weird thing that we don't know what to do with.

			throw new Error('Invalid value specification');
		}
	});

	_.each(data.data, function (group, groupNum) {
		var newRow;

		newRow = [data.rowVals[groupNum].join(', ')];
		newRow = newRow.concat([group.length]);
		/*
		newRow = newRow.concat(_.map(graphConfig.valueFields, function (f) {
			if (typeof f === 'string') {
				// FIXME
				throw new Error('Not sure what to do here');
			}
			else if (typeof f === 'object') {
				var agg = AGGREGATES[f.aggFun];
				var aggFun = agg.fun({field: f.aggField});
				var aggType = agg.type;
				var aggResult = format(colConfig, colTypeInfo, aggFun(colGroup), {
					alwaysFormat: true,
					overrideType: aggType
				});
				// Calculate the aggregate function result from the data in the group.
				//
			}
			else {
				// Not a string (field name) and not an object (aggregate function), so it's some other
				// weird thing that we don't know what to do with.

				throw new Error('Invalid value specification');
			}
		}));
		*/

		dt.addRow(newRow);
	});

	return graphConfig;
};

// #draw_pivot {{{2

GraphRendererGoogle.prototype.draw_pivot = function (data, typeInfo, dt) {
	var self = this
		, graphConfig;

	graphConfig = deepCopy(self.opts.whenPivot || {});
	_.defaults(graphConfig, {
		graphType: 'column',
		categoryField: data.groupFields[0],
		valueFields: [],
		options: {
			isStacked: true
		}
	});

	dt.addColumn(typeInfo.get(graphConfig.categoryField).type, graphConfig.categoryField);

	_.each(data.colVals, function (colVal) {
		dt.addColumn('number', colVal.join(', '));
	});

	_.each(data.data, function (group, groupNum) {
		var newRow;

		newRow = [data.rowVals[groupNum].join(', ')];
		newRow = newRow.concat(_.map(group, function (pivot) {
			return pivot.length;
		}));
		/*
		newRow = newRow.concat(_.map(graphConfig.valueFields, function (f) {
			if (typeof f === 'string') {
				// FIXME
				throw new Error('Not sure what to do here');
			}
			else if (typeof f === 'object') {
				var agg = AGGREGATES[f.aggFun];
				var aggFun = agg.fun({field: f.aggField});
				var aggType = agg.type;
				var aggResult = format(colConfig, colTypeInfo, aggFun(colGroup), {
					alwaysFormat: true,
					overrideType: aggType
				});
				// Calculate the aggregate function result from the data in the group.
				//
			}
			else {
				// Not a string (field name) and not an object (aggregate function), so it's some other
				// weird thing that we don't know what to do with.

				throw new Error('Invalid value specification');
			}
		}));
		*/

		dt.addRow(newRow);
	});

	return graphConfig;
};

// #draw {{{2

GraphRendererGoogle.prototype.draw = function () {
	var self = this;

	var drawLikeForRealThisTime = function () {
		jQuery(document.getElementById(self.id)).children().remove();

		self.view.getData(function (data) {
			self.view.getTypeInfo(function (typeInfo) {
				var graphConfig
					, dt = new google.visualization.DataTable();

				if (data.isPlain) {
					graphConfig = self.draw_plain(data, typeInfo, dt);
				}
				else if (data.isGroup && !data.isPivot) {
					graphConfig = self.draw_group(data, typeInfo, dt);
				}
				else if (data.isPivot) {
					graphConfig = self.draw_pivot(data, typeInfo, dt);
				}

				if (graphConfig === undefined) {
					return;
				}

				var ctor = {
					area: 'AreaChart',
					bar: 'BarChart',
					column: 'ColumnChart',
					pie: 'PieChart'
				};

				var options = {
					title: self.opts.title,
					width: self.opts.width,
					height: self.opts.height,
					isStacked: graphConfig.stacked,
					hAxis: {
						title: graphConfig.categoryField
					},
					vAxis: {
						title: graphConfig.valueFields[0]
					}
				};

				jQuery.extend(true, options, graphConfig.options);

				console.log(options);

				var chart = new google.visualization[ctor[graphConfig.graphType]](document.getElementById(self.id));
				chart.draw(dt, options);
			});
		});
	};

	debug.info('GRAPH // GOOGLE // DRAW', 'Starting draw...');

	return loadScript('https://www.gstatic.com/charts/loader.js', function (wasAlreadyLoaded, k) {
		var cb = function () {
			k();
			drawLikeForRealThisTime();
		};
		if (!wasAlreadyLoaded) {
			debug.info('GRAPH // GOOGLE // DRAW', 'Loading support for Google Charts');
			google.charts.load('current', {'packages':['corechart']});
			google.charts.setOnLoadCallback(cb);
		}
		else {
			cb();
		}
	}, {
		needAsyncSetup: true
	});
};

// GraphRendererJit {{{1

GraphRendererJit = makeSubclass(GraphRenderer);

// #draw {{{2

GraphRendererJit.prototype.draw = function () {
	var self = this;

	jQuery(document.getElementById(self.id)).children().remove();

	self.view.getData(function (data) {
		self.view.getTypeInfo(function (typeInfo) {
			var ctor = {
				area: 'AreaChart',
				bar: 'BarChart'
			};

			var json = {
				label: [],
				values: []
			};

			_.each(self.opts.valueFields, function (f) {
				json.label.push(f);
			});

			_.each(data.data, function (row) {
				var newRow = {};
				newRow.label = row.rowData[self.opts.categoryField].value;
				newRow.values = _.map(self.opts.valueFields, function (f) {
					return row.rowData[f].value;
				});
				json.values.push(newRow);
			});

			var options = {
				injectInto: self.id
			};

			jQuery.extend(true, options, self.opts.options);

			console.log(options);

			var chart = new $jit[ctor[self.opts.type]](options);
			chart.loadJSON(json);
		});
	});
};

// GraphControl {{{1

var GraphControl = function () {
	var self = this;

	self.ui = {};
};

GraphControl.prototype = Object.create(Object.prototype);
GraphControl.prototype.constructor = GraphControl;

// #draw {{{2

GraphControl.prototype.draw = function () {
	var self = this;

	self.view.on('getTypeInfo', function (typeInfo) {
		var fields = [];

		_.each(determineColumns(null, null, typeInfo), function (fieldName) {
			var text = getProp(self.colConfig, fieldName, 'displayText') || fieldName;
			fields.push({ fieldName: fieldName, displayText: text });
		});

		// Graph Type Dropdown

		var graphTypes = {
			'area': 'Area Chart',
			'bar': 'Bar Chart',
			'column': 'Column Chart'
		};

		self.ui.graphType = jQuery('<select>');

		_.each(graphTypes, function (graphType, graphTypeName) {
			self.ui.graphType.append(jQuery('<option>', { 'value': graphType }).text(graphTypeName));
		});

		self.ui.root.append(jQuery('<div>').append(self.ui.graphType));

		// Plain Data Configuration

		self.ui.plainCheckbox = jQuery('<input>', { 'type': 'checkbox', 'checked': 'checked' })
			.on('change', function () {
				if (self.ui.plainCheckbox.prop('checked')) {
					self.ui.plainConfig.show();
				}
				else {
					self.ui.plainConfig.hide();
				}
			});

		self.ui.root.append(
			jQuery('<span>', { 'class': 'wcdv_title' })
			.append(plainCheckbox)
			.append('Plain Data')
		);

		self.ui.plainCategoryField = jQuery('<select>')
			.on('change', function () {
				self.defn.whenPlain.categoryField = self.ui.plainCategoryField.val();
			});
		self.ui.plainValueField = jQuery('<select>')
			.on('change', function () {
				self.defn.whenPlain.valueField = self.ui.plainValueField.val();
			});

		_.each(fields, function (f) {
			self.ui.plainCategoryField.append(
				jQuery('<option>', { 'value': f.fieldName }).text(f.displayText)
			);
			self.ui.plainValueField.append(
				jQuery('<option>', { 'value': f.fieldName }).text(f.displayText)
			);
		});

		self.ui.plainConfig = jQuery('<div>')
			.append(
				jQuery('<div>')
				.append('Category Field: ')
				.append(self.ui.plainCategoryField)
			)
			.append(
				jQuery('<div>')
				.append('Value Field: ')
				.append(self.ui.plainValueField)
			)
			.appendTo(self.ui.root);

		// Group Data Configuration



		// Pivot Data Configuration
	}, { limit: 1 });
};

// GraphControlField {{{1

var GraphControlField = function () {
	var self = this;

	self.ui = {};
};

GraphControlField.prototype = Object.create(Object.prototype);
GraphControlField.prototype.constructor = GraphControlField;
