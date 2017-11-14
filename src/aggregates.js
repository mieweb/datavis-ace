// Utility Functions {{{1
/* ===============================================================================================
 *  Aggregates
 * ===============================================================================================
 *
 * Aggregate functions are invoked over an array of data.  Each aggregate function is basically a
 * reduction, but we aren't using the Underscore reduce() function because of its limitations.
 *
 *
 *
 * Implementation of the aggregate functions inside the `aggregate` variable will seem awkward and
 * unconventional to programmers without a background in functional programming.  Please use this
 * explanation to help understand how the pieces fit together:
 *
 *   1. Properties of the `aggregates` variable are functions that are called directly based on
 *   user configuration of the report definition.  Most take only a single argument, which is the
 *   field to aggregate.  Some (like 'groupConcat') take additional arguments that affect their
 *   output.
 *
 *   2. Each of these `aggregates` properties return a function that takes the row data, which is
 *   all rows to aggregate.  It's an array of objects, each having a property corresponding to the
 *   field argument explained above.
 *
 *   3. When that function is applied to the row data to be aggregated, it more than likely calls
 *   invokeAggregate(), which is a convenience function to iterate over the row data.  This is
 *   basically a reduction.
 *
 *   4. The reduction function may be a simple function, or it might be a call to makeAggregate(),
 *   which builds an aggregate (i.e. reduction function) by closing over some userdata.  The
 *   userdata can be used for anything you want, e.g. building the sets used by aggregates like
 *   'countDistinct.'
 *
 * The presence of makeAggregate() isn't strictly necessary, as we can use the function from step
 * #2 as the closure over userdata, but it does make the architecture more flexible and easier to
 * adapt to build your own aggregates.
 *
 * -----------------------------------------------------------------------------------------------
 *  EXAMPLE
 * -----------------------------------------------------------------------------------------------
 *
 * var report = {
 *   table: {
 *     grouping: {
 *       headerLine: [
 *         { func: 'average', field: 'Age' },
 *         { func: 'countDistinct', field: 'First Name', separator: ', ' }
 *       ]
 *     }
 *   }
 * }
 */

function makeAggregate(userdata, aggregate) {
	var u = userdata;
	return function (acc, next, data, index) {
		return aggregate(acc, next, data, index, u);
	};
}

/**
 * Invoke the core implementation of an aggregate function.  This is used by most aggregate
 * functions (properties of `AGGREGATES`) to perform the data traversal.
 *
 * - The implementation may throw an exception to abort the process at any time (e.g. if an item
 *   doesn't match the expected type or is in some other way borked).
 *
 * - The implementation may not use all of the arguments that it receives (e.g. `sum` only needs the
 *   accumulator and the item, it doesn't care about the data or index).
 *
 * - There is currently no way for an implementation to indicate successful premature termination
 *   (e.g. no need to continue traversing the data).  If this is needed (e.g. `first`), it's
 *   recommended to not use `invokeAggregate` - and to instead just traverse the data yourself.
 *
 * @param {Array.<any>} data
 * @param {function} aggregate Called like this: `agg(acc, item, data, index)`
 * @param {any} init
 */

function invokeAggregate(data, aggregate, init) {
	var i, i0, len, acc;
	if (!_.isArray(data)) {
		throw 'Cannot invoke aggregate over non-array';
	}
	len = data.length;
	if (!_.isUndefined(init)) {
		acc = init;
		i0 = 0;
	}
	else {
		acc = data[0].rowData;
		i0 = 1;
	}
	for (i = i0; i < len; i += 1) {
		try {
			acc = aggregate(acc, data[i].rowData, data, i);
		}
		catch (e) {
			if (_.isString(e)) {
				throw e + ' // data index = ' + i;
			}
			else {
				throw e;
			}
		}
	}
	return acc;
}



/**
 * Make sure a user-specified aggregate conforms to the required data structure.
 */

function checkAggregate(defn, agg, source) {
	if (!_.isObject(agg)) {
		throw defn.error(new InvalidReportDefinitionError(source, agg, 'must be an object'));
	}
	// INPUT VALIDATION: [fun]
	if (_.isUndefined(agg.fun)) {
		throw defn.error(new InvalidReportDefinitionError(source + '.fun', agg.fun, 'must be present'));
	}
	if (!_.isString(agg.fun)) {
		throw defn.error(new InvalidReportDefinitionError(source + '.fun', agg.fun, 'must be a string'));
	}
	if (!AGGREGATES.get(agg.fun)) {
		throw defn.error(new InvalidReportDefinitionError(source + '.fun', agg.fun, 'must be a valid builtin aggregate function'));
	}
	// INPUT VALIDATION: [displayText]
	if (_.isUndefined(agg.displayText)) {
		agg.displayText = agg.fun;
	}
	if (!_.isString(agg.displayText)) {
		throw defn.error(new InvalidReportDefinitionError(source + '.displayText', agg.displayText, 'must be a string'));
	}
}

// Aggregate {{{1

/**
 * @property {string} name
 * Name of the aggregate function used in the dropdown menu by the grid.
 *
 * @property {boolean} [canBePivotCell=true]
 * If true, then the aggregate function will be shown in the user interface.  Typically used to
 * indicate that no other parameters are required beyond a field.
 *
 * @property {int} [fieldCount=0]
 * Number of fields required.  Usually zero or one.
 *
 * @property {string} type
 * Fixed type of the result of this aggregate function.  Undefined indicates that the type depends
 * on the field(s) used.
 *
 * @property {boolean} [inheritFormatting=false]
 * If true, then the result should be formatted according to the formatting of the field(s).
 *
 * @property {any} [bottomValue]
 * The value returned when an error occurs.
 *
 * @property {function|any} [init]
 * The value used as the initial seed of the result calculation (which is a reduction/fold over the
 * data).  If a function, that function is invoked with no arguments to get the value.  When not
 * provided, the bottom value is used.
 */

var Aggregate = makeSubclass(Object, function (opts) {
	var self = this;

	self.opts = opts;
}, {
	canBePivotCell: true,
	fieldCount: 0,
	inheritFormatting: false
});

// #calculate {{{2

Aggregate.prototype.calculate = function (data) {
	var self = this;
	var i, i0, len, acc;

	if (!self.checkOpts() || !self.checkData(data)) {
		return self.bottomValue;
	}

	len = data.length;

	// Determine the initial value of the accumulator.  When there's an `init` property, prefer it.
	// Fall back to the `bottomValue` property.

	acc = typeof self.init === 'function' ? self.init()
		: self.init != null ? self.init
		: self.bottomValue;
	i0 = 0;

	// When there's no data, bail with the initial value.

	if (len === 0) {
		if (typeof self.calculateDone === 'function') {
			return self.calculateDone(acc);
		}
		return acc;
	}

	// If there's no initial value for the accumulator, use the first value from the data.

	if (acc == null) {
		acc = data[0].rowData;
		if (self.opts.fields && self.opts.fields.length > 0) {
			acc = self.getRealValue(acc[self.opts.fields[0]]);
		}
		i0 = 1;
	}

	// Loop through the rest of the data and call the `calculateStep` function.  This is basically
	// like calling fold/reduce.

	for (i = i0; i < len; i += 1) {
		try {
			acc = self.calculateStep(acc, data[i].rowData, data, i);
		}
		catch (e) {
			log.error('Aggregate ' + self.name + ': Error occurred at data index [' + i + ']: ' + e.toString());
			return self.bottomValue;
		}
	}

	return self.calculateDone != null ? self.calculateDone(acc) : acc;
};

// #checkOpts {{{2

Aggregate.prototype.checkOpts = function () {
	var self = this;

	if (self.fieldCount > 0) {
		if (self.opts.fields == null) {
			log.error('Aggregate ' + self.name + ': Missing `opts.fields`');
			return false;
		}
		else if (!_.isArray(self.opts.fields)) {
			log.error('Aggregate ' + self.name + ': `opts.fields` must be an array');
			return false;
		}
		else if (self.opts.fields.length !== self.fieldCount) {
			log.error('Aggregate ' + self.name + ': `opts.fields` must include ' + self.fieldCount + ' elements');
			return false;
		}
	}

	return true;
};

// #checkData {{{2

Aggregate.prototype.checkData = function (data) {
	var self = this;

	if (!_.isArray(data)) {
		log.error('Aggregate ' + self.name + ': `data` must be an array');
		return false;
	}

	return true;
};

// #getRealValue {{{2

Aggregate.prototype.getRealValue = function (cell) {
	if (_.isString(cell)) {
		return cell;
	}
	else if (_.isNumber(cell)) {
		return cell;
	}
	else if (_.isObject(cell)) {
		if (cell.value !== undefined) {
			return cell.value;
		}
		else if (cell.orig !== undefined) {
			return cell.orig;
		}
		else {
			throw new Error('Unable to get real value of cell');
		}
	}
};

// #getRealValueAsString {{{2

Aggregate.prototype.getRealValueAsString = function (cell) {
	var self = this;
	var val = self.getRealValue(cell);
	var colConfig = self.opts.colConfig ? self.opts.colConfig[0] : null;
	var typeInfo = self.opts.typeInfo ? self.opts.typeInfo[0] : null;

	return format(colConfig, typeInfo, cell);
};

// Count {{{1

var CountAggregate = makeSubclass(Aggregate, null, {
	name: 'Count',
	canBePivotCell: true,
	fieldCount: 0,
	type: 'number',
	inheritFormatting: false,
	bottomValue: 0
});

// #calculate {{{2

CountAggregate.prototype.calculate = function (data) {
	var self = this;

	if (!self.checkOpts() || !self.checkData(data)) {
		return self.bottomValue;
	}

	return (data && data.length) || self.bottomValue;
};

// Count Distinct {{{1

var CountDistinctAggregate = makeSubclass(Aggregate, function () {
	var self = this;

	self.set = {};
	self.super.ctor.apply(self, arguments);
}, {
	name: 'Count Distinct',
	canBePivotCell: true,
	fieldCount: 1,
	type: 'number',
	inheritFormatting: false,
	bottomValue: 0,
	init: function () {
		return {
			set: {},
			count: 0
		};
	}
});

// #calculateStep {{{2

CountDistinctAggregate.prototype.calculateStep = function (acc, next) {
	var self = this;

	var key = self.getRealValueAsString(next[self.opts.fields[0]]);
	if (acc.set[key] == null) {
		acc.set[key] = true;
		acc.count += 1;
	}
	return acc;
};

// #calculateDone {{{2

CountDistinctAggregate.prototype.calculateDone = function (obj) {
	return obj.count;
};

// Values {{{1

ValuesAggregate = makeSubclass(Aggregate, null, {
	name: 'Values',
	canBePivotCell: true,
	fieldCount: 1,
	inheritFormatting: false,
	type: 'string',
	init: function () {
		return [];
	}
});

// #calculateStep {{{2

ValuesAggregate.prototype.calculateStep = function (acc, next) {
	var self = this;

	acc.push(self.getRealValue(next[self.opts.fields[0]]));
	return acc;
};

// #calculateDone {{{2

ValuesAggregate.prototype.calculateDone = function (acc) {
	var self = this;

	return acc.join(self.opts.separator || ', ');
};

// Values w/ Counts {{{1

ValuesWithCountsAggregate = makeSubclass(Aggregate, null, {
	name: 'Values w/ Counts',
	canBePivotCell: true,
	fieldCount: 1,
	inheritFormatting: false,
	type: 'string',
	init: function () {
		return new OrdMap();
	}
});

// #calculateStep {{{2

ValuesWithCountsAggregate.prototype.calculateStep = function (acc, next) {
	var self = this;
	var key = self.getRealValueAsString(next[self.opts.fields[0]]);

	if (acc.isSet(key)) {
		acc.set(key, acc.get(key) + 1);
	}
	else {
		acc.set(key, 1);
	}

	return acc;
};

// #calculateDone {{{2

ValuesWithCountsAggregate.prototype.calculateDone = function (acc) {
	var self = this;
	var a = [];

	acc.each(function (v, k) {
		a.push(k + ' (' + v + ')');
	});

	return a.join(self.opts.separator || ', ');
};

// Distinct Values {{{1

DistinctValuesAggregate = makeSubclass(Aggregate, null, {
	name: 'Distinct Values',
	canBePivotCell: true,
	fieldCount: 1,
	inheritFormatting: false,
	type: 'string',
	init: function () {
		return {
			a: [],
			m: {}
		}
	}
});

// #calculateStep {{{2

DistinctValuesAggregate.prototype.calculateStep = function (acc, next) {
	var self = this;

	var key = self.getRealValueAsString(next[self.opts.fields[0]]);

	if (!acc.m[key]) {
		acc.m[key] = true;
		acc.a.push(format(self.opts.colConfig[0], self.opts.typeInfo[0], self.getRealValue(next[self.opts.fields[0]])));
	}

	return acc;
};

// #calculateDone {{{2

DistinctValuesAggregate.prototype.calculateDone = function (acc) {
	var self = this;

	return acc.a.join(self.opts.separator || ', ');
};

// Sum {{{1

var SumAggregate = makeSubclass(Aggregate, null, {
	name: 'Sum',
	canBePivotCell: true,
	fieldCount: 1,
	type: 'number',
	inheritFormatting: true,
	bottomValue: 0
});

// #calculateStep {{{2

SumAggregate.prototype.calculateStep = function (acc, next) {
	var self = this;
	var val = self.getRealValue(next[self.opts.fields[0]]);

	if (window.numeral && window.numeral.isNumeral(val)) {
		// Check to see if this is a plain number, or a number wrapped by the Numeral library.  It
		// should always be the latter, but we check anyway, because there's no reason not to.

		val = val.value();
	}
	else if (_.isString(val)) {
		// We can also handle when it's a number represented as a string.  We'll try to convert it
		// either to an integer or a float.

		if (isInt(val)) {
			val = toInt(val);
		}
		else if (isFloat(val)) {
			val = toFloat(val);
		}
		else {
			//log.error('Unable to interpret value as a number: { field = "%s", value = "%s" }', opts.field, JSON.stringify(val));
			val = 0;
		}
	}

	if (!_.isNumber(val)) {
		log.error('Unable to interpret value as a number: { field = "%s", value = "%s" }', self.opts.fields[0], JSON.stringify(val));
	}

	return acc + val;
};

// Average {{{1

var AverageAggregate = makeSubclass(Aggregate, function (opts) {
	var self = this;

	self.sumAgg = new SumAggregate(opts);
	self.super.ctor.apply(self, arguments);
}, {
	name: 'Average',
	canBePivotCell: true,
	fieldCount: 1,
	type: 'number',
	inheritFormatting: true,
	bottomValue: 0
});

// #calculate {{{2

AverageAggregate.prototype.calculate = function (data) {
	var self = this;

	if (!self.checkOpts() || !self.checkData(data)) {
		return self.bottomValue;
	}


	return self.sumAgg.calculate(data) / data.length;
};

// Min {{{1

MinAggregate = makeSubclass(Aggregate, null, {
	name: 'Min',
	canBePivotCell: true,
	fieldCount: 1,
	inheritFormatting: true
});

// #checkOpts {{{2

MinAggregate.prototype.checkOpts = function () {
	var self = this;

	if (self.opts.typeInfo == null) {
		log.error('Aggregate ' + self.name + ': Missing `opts.typeInfo`');
		return false;
	}

	if (self.opts.compare == null) {
		self.opts.compare = getComparisonFn.byType(self.opts.typeInfo[0].type);
	}

	if (typeof self.opts.compare !== 'function') {
		log.error('Aggregate ' + self.name + ': Missing `opts.compare`');
		return false;
	}

	return self.super.checkOpts();
};

// #calculateStep {{{2

MinAggregate.prototype.calculateStep = function (acc, next) {
	var self = this;

	var val = self.getRealValue(next[self.opts.fields[0]]);
	return self.opts.compare(acc, val) ? acc : val;
};

// Max {{{1

MaxAggregate = makeSubclass(Aggregate, null, {
	name: 'Max',
	canBePivotCell: true,
	fieldCount: 1,
	inheritFormatting: true
});

// #checkOpts {{{2

MaxAggregate.prototype.checkOpts = function () {
	var self = this;

	if (self.opts.typeInfo == null) {
		log.error('Aggregate ' + self.name + ': Missing `opts.typeInfo`');
		return false;
	}

	if (self.opts.compare == null) {
		self.opts.compare = getComparisonFn.byType(self.opts.typeInfo[0].type);
	}

	if (typeof self.opts.compare !== 'function') {
		log.error('Aggregate ' + self.name + ': Missing `opts.compare`');
		return false;
	}

	return self.super.checkOpts();
};

// #calculateStep {{{2

MaxAggregate.prototype.calculateStep = function (acc, next) {
	var self = this;

	var val = self.getRealValue(next[self.opts.fields[0]]);
	return self.opts.compare(acc, val) ? val : acc;
};

// First {{{1

FirstAggregate = makeSubclass(Aggregate, null, {
	name: 'First',
	canBePivotCell: true,
	fieldCount: 1,
	inheritFormatting: true
});

// #checkData {{{2

FirstAggregate.prototype.checkData = function (data) {
	var self = this;

	if (data.length === 0) {
		log.error('Aggregate ' + self.name + ': `data` has no elements');
		return false;
	}

	return self.super.checkData(data);
};

// #calculate {{{2

FirstAggregate.prototype.calculate = function (data) {
	var self = this;

	if (!self.checkOpts() || !self.checkData(data)) {
		return self.bottomValue;
	}

	return self.getRealValue(data[0].rowData[self.opts.fields[0]]);
};

// Last {{{1

LastAggregate = makeSubclass(Aggregate, null, {
	name: 'Last',
	canBePivotCell: true,
	fieldCount: 1,
	inheritFormatting: true
});

// #checkData {{{2

FirstAggregate.prototype.checkData = function (data) {
	var self = this;

	if (data.length === 0) {
		log.error('Aggregate ' + self.name + ': `data` has no elements');
		return false;
	}

	return self.super.checkData(data);
};

// #calculate {{{2

LastAggregate.prototype.calculate = function (data) {
	var self = this;

	if (!self.checkOpts() || !self.checkData(data)) {
		return self.bottomValue;
	}

	return self.getRealValue(data[data.length - 1].rowData[self.opts.fields[0]]);
};

// Nth {{{1

NthAggregate = makeSubclass(Aggregate, null, {
	name: 'Nth',
	canBePivotCell: false,
	fieldCount: 1,
	inheritFormatting: true
});

// #checkOpts {{{2

NthAggregate.prototype.checkOpts = function () {
	var self = this;

	if (self.opts.index == null) {
		log.error('Aggregate ' + self.name + ': Missing `opts.index`');
		return false;
	}

	if (!_.isNumber(self.opts.index)) {
		log.error('Aggregate ' + self.name + ': `opts.index` must be a number');
		return false;
	}

	return self.super.checkOpts();
};

// #checkData {{{2

FirstAggregate.prototype.checkData = function (data) {
	var self = this;

	if (data.length === 0) {
		log.error('Aggregate ' + self.name + ': `data` has no elements');
		return false;
	}

	if (data.length <= self.opts.index) {
		log.error('Aggregate ' + self.name + ': `data` has insufficient number of elements');
		return self.bottomValue;
	}

	return self.super.checkData(data);
};

// #calculate {{{2

NthAggregate.prototype.calculate = function (data) {
	var self = this;

	if (!self.checkOpts() || !self.checkData(data)) {
		return self.bottomValue;
	}

	return data[data.length - 1];
};

// Sum / Sum {{{1

SumOverSumAggregate = makeSubclass(Aggregate, null, {
	name: 'Sum/Sum',
	canBePivotCell: true,
	fieldCount: 2,
	type: 'number',
	inheritFormatting: false,
	bottomValue: 0,
	init: function () {
		return { a: 0, b: 0 };
	}
});

// #getNumber {{{2

SumOverSumAggregate.prototype.getNumber = function (x) {
	if (window.numeral && window.numeral.isNumeral(x)) {
		// Check to see if this is a plain number, or a number wrapped by the Numeral library.  It
		// should always be the latter, but we check anyway, because there's no reason not to.

		return x.value();
	}
	else if (_.isString(x)) {
		// We can also handle when it's a number represented as a string.  We'll try to convert it
		// either to an integer or a float.

		if (isInt(x)) {
			return toInt(x);
		}
		else if (isFloat(x)) {
			return toFloat(x);
		}
		else {
			return 0;
		}
	}
};

// #calculateStep {{{2

SumOverSumAggregate.prototype.calculateStep = function (acc, next) {
	acc.a += self.getNumber(next[opts.fields[0]].value);
	acc.b += self.getNumber(next[opts.fields[1]].value);

	return acc;
};

// #calculateDone {{{2

SumOverSumAggregate.prototype.calculateDone = function (obj) {
	return obj.a / obj.b;
};

// Count / Count {{{1

CountOverCountAggregate = makeSubclass(Aggregate, null, {
	name: 'Count/Count',
	canBePivotCell: true,
	fieldCount: 2,
	type: 'number',
	inheritFormatting: false,
	bottomValue: 0
});

/**
 * @typedef {Object} Aggregate
 *
 * @property {function} fun Call this with the options for the aggregate function to get a function
 * back.  The return value should be called, passing the data as the only argument; its result is
 * the final value of the aggregate function.
 *
 * Example:
 *
 * ```
 * var findAverageAge = AGGREGATES.average.fun({field: 'age'});
 * var averageAge1 = findAverageAge(data1);
 * var averageAge2 = findAverageAge(data2);
 * ```
 *
 * @property {string} type The type of the result of the aggregate function (e.g. `groupConcat` is
 * string, `sum` is number).  When undefined, the type is dependent on the data being consumed (e.g.
 * `min` and `max`).
 */

/**
 * Registry for all the known types of aggregate functions.
 *
 * @type {Object.<string, Aggregate>}
 *
 * @property {Aggregate} count Returns the number of items in the data.
 *
 * @property {Aggregate} countDistinct Returns the number of items in the data with distinct values
 * for the specified field.
 *
 * Required config properties:
 *
 *   - field
 *
 * @property {Aggregate} sum Returns the sum of the numeric values of the specified field, across
 * all items in the data.  An error will occur if there are any items where the value of the field
 * is not a number.
 *
 * Required config properties:
 *
 *   - field
 *
 * @property {Aggregate} average Returns the average of the numeric values of the specified field,
 * across all items in the data.  An error will occur if there are any items where the value of the
 * field is not a number.
 *
 * Required config properties:
 *
 *   - field
 *
 * @property {Aggregate} groupConcat
 *
 * Required config properties:
 *
 *   - field
 *
 * Optional config properties:
 *
 *   - separator
 *
 * @property {Aggregate} groupConcatDistinct
 *
 * Required config properties:
 *
 *   - field
 *
 * Optional config properties:
 *
 *   - separator
 *
 * @property {Aggregate} first
 *
 * Required config properties:
 *
 *   - field
 *
 * @property {Aggregate} last
 *
 * Required config properties:
 *
 *   - field
 *
 * @property {Aggregate} nth
 *
 * Required config properties:
 *
 *   - field
 *   - index
 *
 * @property {Aggregate} min
 *
 * Required config properties:
 *
 *   - field
 *
 * @property {Aggregate} max
 *
 * Required config properties:
 *
 *   - field
 */
var AGGREGATES = {};

// Aggregate Dictionary {{{1

AGGREGATES = new OrdMap();
AGGREGATES.set('count', CountAggregate);
AGGREGATES.set('countDistinct', CountDistinctAggregate);
AGGREGATES.set('values', ValuesAggregate);
AGGREGATES.set('valuesWithCounts', ValuesWithCountsAggregate);
AGGREGATES.set('distinctValues', DistinctValuesAggregate);
AGGREGATES.set('sum', SumAggregate);
AGGREGATES.set('average', AverageAggregate);
AGGREGATES.set('min', MinAggregate);
AGGREGATES.set('max', MaxAggregate);
AGGREGATES.set('first', FirstAggregate);
AGGREGATES.set('last', LastAggregate);
AGGREGATES.set('nth', NthAggregate);
AGGREGATES.set('sumOverSum', SumOverSumAggregate);
