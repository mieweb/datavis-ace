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
 * functions (properties of `Aggregates`) to perform the data traversal.
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
		acc = data[0];
		i0 = 1;
	}
	for (i = i0; i < len; i += 1) {
		try {
			acc = aggregate(acc, data[i], data, i);
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
 * @typedef {Object} Aggregate
 *
 * @property {function} fun Call this with the options for the aggregate function to get a function
 * back.  The return value should be called, passing the data as the only argument; its result is
 * the final value of the aggregate function.
 *
 * Example:
 *
 * ```
 * var findAverageAge = Aggregates.average.fun({field: 'age'});
 * var averageAge1 = findAverageAge(data1);
 * var averageAge2 = findAverageAge(data2);
 * ```
 *
 * @property {string} type The type of the result of the aggregate function, e.g. a string or a
 * number.
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
var Aggregates = {};

// .count {{{1

Aggregates.count = {
	fun: function (opts) {
		opts = opts || {};
		return function (data) {
			return data.length;
		};
	},
	type: 'number'
};

// .countDistinct {{{1

Aggregates.countDistinct = {
	fun: function (opts) {
		opts = opts || {};
		if (_.isUndefined(opts.field)) {
			throw 'countDistinct aggregate: missing [field] argument';
		}
		return function (data) {
			return invokeAggregate(data, makeAggregate({}, function (acc, next, _1, _2, set) {
				if (set[next[opts.field]]) {
					return acc;
				}
				else {
					set[next[opts.field]] = true;
					return acc + 1;
				}
			}), 0);
		};
	},
	type: 'number'
};

// .sum {{{1

Aggregates.sum = {
	fun: function (opts) {
		opts = opts || {};
		if (_.isUndefined(opts.field)) {
			throw 'sum aggregate: missing [field] property';
		}
		return function (data) {
			return invokeAggregate(data, function (acc, next) {
				var val = next[opts.field];
				if (!_.isNumber(val)) {
					if (isInt(val)) {
						val = toInt(val);
					}
					else if (isFloat(val)) {
						val = toFloat(val);
					}
					else {
						throw 'sum aggregate: field ' + opts.field + ' is not a number';
					}
				}
				return acc + val;
			}, 0);
		};
	},
	type: 'number'
};

// .average {{{1

Aggregates.average = {
	fun: function (opts) {
		opts = opts || {};
		if (_.isUndefined(opts.field)) {
			throw 'average aggregate: missing [field] property';
		}
		return function (data) {
			return Aggregates.sum.fun(opts)(data) / data.length;
		};
	},
	type: 'number'
};

// .groupConcat {{{1

Aggregates.groupConcat = {
	fun: function (opts) {
		opts = opts || {};
		if (_.isUndefined(opts.field)) {
			throw 'groupConcat aggregate: missing [field] property';
		}
		if (_.isUndefined(opts.separator)) {
			opts.separator = ', ';
		}
		if (!_.isString(opts.separator)) {
			throw 'groupConcat aggregate separator must be a string';
		}
		return function (data) {
			return invokeAggregate(data, function (acc, next) {
				return acc === null ? next[opts.field] : acc + opts.separator + next[opts.field];
			}, null);
		};
	},
	type: 'string'
};

// .groupConcatDistinct {{{1

Aggregates.groupConcatDistinct = {
	fun: function (opts) {
		opts = opts || {};
		if (_.isUndefined(opts.field)) {
			throw 'groupConcatDistinct aggregate: missing [field] property';
		}
		if (_.isUndefined(opts.separator)) {
			opts.separator = ', ';
		}
		if (!_.isString(opts.separator)) {
			throw 'groupConcat aggregate separator must be a string';
		}
		return function (data) {
			return invokeAggregate(data, makeAggregate({}, function (acc, next, _1, _2, set) {
				if (set[next[opts.field]]) {
					return acc;
				}
				else {
					set[next[opts.field]] = true;
					return acc === null ? next[opts.field] : acc + opts.separator + next[opts.field];
				}
			}), null);
		};
	},
	type: 'string'
};

// .first {{{1

Aggregates.first = {
	fun: function (opts) {
		opts = opts || {};
		if (_.isUndefined(opts.field)) {
			throw 'first aggregate: missing [field] property';
		}
		return function (data) {
			return data[0][opts.field];
		};
	},
	type: 'string'
};

// .last {{{1

Aggregates.last = {
	fun: function (opts) {
		opts = opts || {};
		if (_.isUndefined(opts.field)) {
			throw 'last aggregate: missing [field] property';
		}
		return function (data) {
			return data[data.length][opts.field];
		};
	},
	type: 'string'
};

// .nth {{{1

Aggregates.nth = {
	fun: function (opts) {
		opts = opts || {};
		if (_.isUndefined(opts.field)) {
			throw 'nth aggregate: missing [field] property';
		}
		if (_.isUndefined(opts.index)) {
			throw 'nth aggregate: missing [index] property';
		}
		else if (parseInt(opts.index, 10) !== opts.index) {
			throw 'nth aggregate: [index] property must be an interger';
		}
		return function (data) {
			return opts.index >= data.length ? (opts.nonExistent || '[ERROR:OUT-OF-RANGE]') : data[opts.index][opts.field];
		};
	},
	type: 'string'
};

// .min {{{1

Aggregates.min = {
	fun: function (opts) {
		var convert = I;
		opts = _.defaults(opts || {}, {
			type: 'string',
			compare: universalCmp
		});
		if (_.isUndefined(opts.field)) {
			throw 'min aggregate: missing [field] property';
		}
		if (!_.isString(opts.type)) {
			throw 'min aggregate: [type] property must be a string';
		}
		if (!_.isFunction(opts.compare)) {
			throw 'min aggregate: [compare] property must be a function';
		}
		if (opts.type === 'integer') {
			convert = function (a) {
				return parseInt(a, 10);
			};
		}
		else if (opts.type === 'float' || opts.type === 'number') {
			convert = parseFloat;
		}
		return function (data) {
			return invokeAggregate(data, function (acc, next) {
				var n = convert(next[opts.field]);
				return opts.compare(n, acc) < 0 ? n : acc;
			}, convert(data[0][opts.field]));
		};
	},
	type: 'string'
};

// .max {{{1

Aggregates.max = {
	fun: function (opts) {
		var convert = I;
		opts = _.defaults(opts || {}, {
			type: 'string',
			compare: universalCmp
		});
		if (_.isUndefined(opts.field)) {
			throw 'max aggregate: missing [field] property';
		}
		if (!_.isString(opts.type)) {
			throw 'max aggregate: [type] property must be a string';
		}
		if (!_.isFunction(opts.compare)) {
			throw 'max aggregate: [compare] property must be a function';
		}
		if (opts.type === 'integer') {
			convert = function (a) {
				return parseInt(a, 10);
			};
		}
		else if (opts.type === 'float' || opts.type === 'number') {
			convert = parseFloat;
		}
		return function (data) {
			return invokeAggregate(data, function (acc, next) {
				var n = convert(next[opts.field]);
				return opts.compare(n, acc) > 0 ? n : acc;
			}, convert(data[0][opts.field]));
		};
	},
	type: 'string'
};

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
	if (!Aggregates[agg.fun]) {
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
