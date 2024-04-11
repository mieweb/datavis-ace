import _ from 'underscore';
import sprintf from 'sprintf-js';
import jQuery from 'jquery';

import BigNumber from 'bignumber.js/bignumber.js';
import numeral from 'numeral';
import moment from 'moment';

import JSONFormatter from '../third-party/json-formatter.esm.js';

import OrdMap from './util/ordmap.js';
import EXPERIMENTAL_FEATURES from './flags.js';

var types = {};

types.registry = new OrdMap();
types.registry.setInsertOrder('prepend');

// types.guess {{{1

types.guess = function (val) {
	var typeNames = types.registry.keys();
	for (var i = 0; i < typeNames.length; i += 1) {
		if (types.registry.get(typeNames[i]).matches(val)) {
			return typeNames[i];
		}
	}
};

// types.universalCmp {{{1

types.universalCmp = function (a, b) {
	return a === b ? 0 : a < b ? -1 : 1;
};

// String {{{1

(function () {

	// matches {{{2

	function matches(str) {
		return true;
	}

	// parse {{{2

	function parse(str) {
		return str;
	}

	// decode {{{2

	function decode(val, ir) {
		if (typeof val === 'string') {
			return parse(val, ir);
		}
		else {
			console.error('[DataVis // Type(String) // Decode] Call Error: unsupported conversion: %s', ir);
			return null;
		}
	}

	// format {{{2

	function format(val) {
		return val;
	}

	// natRep {{{2

	function natRep(val) {
		return val;
	}

	// compare {{{2

	function compare(a, b) {
		return types.universalCmp(a, b);
	}

	// register {{{2

	types.registry.set('string', {
		matches: matches,
		parse: parse,
		decode: decode,
		format: format,
		natRep: natRep,
		compare: compare,
	});
})();

// Number {{{1

(function () {

  var re_number = new RegExp(/(^-?[1-9]{1}[0-9]{0,2}(,?\d{3})*(\.\d+)?(e[+-]?\d+)?$)|(^0(e[+-]?\d+)?$)|(^-?0?\.\d+(e[+-]?\d+)?$)/);
	var re_comma = new RegExp(/,/g);

	// default formatting options {{{2

	var formatOpts = {
		integerPart: {
			grouping: false,
			groupSize: 3,
			groupSeparator: ','
		},
		fractionalPart: {
			grouping: false,
			groupSize: 3,
			groupSeparator: ' '
		},
		radixPoint: '.',
		decimalPlaces: null,
		negativeFormat: 'minus',
		roundingMethod: 'half_up',
		currencySymbol: ''
	};

	// Overwrite the defaults with locale-specific formatting options gleaned from Intl.

	if (window.Intl != null && window.Intl.NumberFormat != null) {
		// You can't extract information about how to format a number from Intl.NumberFormat, but you
		// can have it format a number and then "parse" the result to figure out e.g. what the grouping
		// and radix point characters are.

		_.each(Intl.NumberFormat(window.DATAVIS_LANG).formatToParts('1234.5'), function (o) {
			switch (o.type) {
			case 'group':
				formatOpts.integerPart.groupSeparator = o.value;
				break;
			case 'decimal':
				formatOpts.radixPoint = o.value;
			}
		});
	}

	// matches {{{2

	function matches(val) {
		return (typeof val === 'number') || (typeof val === 'string' && re_number.test(val));
	}

	// parse {{{2

	var re_comma = new RegExp(/,/g);

  function _parse(str, resultType) {
    if (str.charAt(0) === '(' && str.charAt(-1) === ')') {
      return _parse(str.substring(1, str.length - 1)) * -1;
    }
		else {
			var noCommas = str.replace(re_comma, '');
			return resultType === 'string' ? noCommas
				: str.indexOf('.') >= 0 || str.indexOf('e') >= 0 ? parseFloat(noCommas)
				: parseInt(noCommas);
		}
  }

	function parse(str, ir) {
		var parsed;

		if (typeof str !== 'string') {
			console.error('[DataVis // Type(Number) // Parse] Call Error: `str` must be a string');
			return null;
		}

		switch (ir) {
		case 'primitive':
			return _parse(str, 'number');
		case 'numeral':
			parsed = _parse(str, 'number');
			if (parsed == null) {
				return null;
			}
			return numeral(parsed);
		case 'bignumber':
			parsed = _parse(str, 'string');
			if (parsed == null) {
				return null;
			}
			return new BigNumber(parsed);
		default:
			console.error('[DataVis // Type(Number) // Parse] Call Error: invalid internal representation: %s', ir);
			return null;
		}
	}

	// decode {{{2

	function decode(val, ir) {
		if (typeof val === 'string') {
			return parse(val, ir);
		}
		else if (typeof val === 'number') {
			switch (ir) {
			case 'primitive':
				return val;
			case 'bignumber':
				return new BigNumber(val);
			case 'numeral':
				return numeral(val);
			default:
				console.error('[DataVis // Type(Number) // Decode] Call Error: invalid internal representation: %s', ir);
				return null;
			}
		}
		else {
			console.error('[DataVis // Type(Number) // Decode] Call Error: unsupported conversion: %s to %s', typeof val, ir);
			return null;
		}
	}

	// format {{{2

	// primitive {{{3

	function format_primitive(val, opts) {
		var self = this;

		if (Number.isNaN(val)) {
			return null;
		}

		switch (opts.formatMethod) {
		case 'intl':
			if (window.Intl != null && window.Intl.NumberFormat != null) {
				var config = {
					useGrouping: self.formatOpts.integerPart.grouping
				};

				if (self.formatOpts.decimalPlaces != null) {
					config.minimumFractionDigits = self.formatOpts.decimalPlaces;
					config.maximumFractionDigits = self.formatOpts.decimalPlaces;
				}

				return Intl.NumberFormat(window.DATAVIS_LANG, config).format(val);
			}
			else {
				return self.super.format(val);
			}
		case 'bignumber':
			return new BigNumber(val).toFormat(
				self.formatOpts.decimalPlaces,
				bigNumberRoundingMode(self.formatOpts),
				bigNumberFormat(self.formatOpts)
			);
		case 'numeral':
			return numeral(val).format(numeralFormat(self.formatOpts));
		default:
			return self.super.format(val);
		}
	}

	// numeral {{{3

	function format_numeral(val, opts) {
		var self = this;

		var result = '';

		result += self.formatOpts.integerPart.grouping ? '0,0' : '0';

		if (self.formatOpts.decimalPlaces == null) {
			result += '[.][0000000000000000]';
		}
		else if (self.formatOpts.decimalPlaces > 0) {
			result += '.';
			result += '0'.repeat(self.formatOpts.decimalPlaces);
		}

		return result;
	}

	// bignumber {{{3

	function format_bignumber(val, opts) {
		var self = this;

		var result = {
			prefix: '',
			decimalSeparator: self.formatOpts.radixPoint,
			secondaryGroupSize: 0,
			suffix: ''
		};

		if (val.isNaN()) {
			return null;
		}

		if (self.formatOpts.integerPart.grouping) {
			result.groupSeparator = self.formatOpts.integerPart.groupSeparator;
			result.groupSize = self.formatOpts.integerPart.groupSize;
		}
		else {
			result.groupSize = 0;
		}
		if (self.formatOpts.fractionalPart.grouping) {
			result.fractionGroupSeparator = self.formatOpts.fractionalPart.groupSeparator;
			result.fractionGroupSize = self.formatOpts.fractionalPart.groupSize;
		}
		else {
			result.fractionGroupSize = 0;
		}

		return result;
	}

	// main {{{3

	/**
	 * Formats a number.
	 *
	 * @param {number|Numeral|BigNumber} val
	 * The value that we're going to decode to a string.
	 *
	 * @param {Object} [opts]
	 * Additional formatting options.
	 */

	function format(val, opts) {
		var isNegative = false
			, formatted;

		if (typeof val === 'number') {
			if (Number.isNaN(val)) {
				return null;
			}
			formatted = _format_primitive(val);
		}
		else if (numeral.isNumeral(val)) {
			if (Number.isNaN(val)) {
				return null;
			}
			formatted = _format_numeral(val);
		}
		else if (BigNumber.isBigNumber(val)) {
			if (val.isNaN()) {
				return null;
			}
			return _format_bignumber(val);
		}
	}

	// natRep {{{2

	function natRep(val) {
		if (numeral.isNumeral(val)) {
			return val.value();
		}
		else if (moment.isMoment(val)) {
			return val.unix();
		}
		else {
			return val;
		}
	}

	// compare {{{2

	var floatSafe_equalp = function (n, m) {
		var epsilon = Number.EPSILON;

		/*
		var biggerEpsilon = 0.0000000001;

		if (Math.abs(n - m) > epsilon && Math.abs(n - m) < biggerEpsilon) {
			log.error('FLOATING POINT WEIRDNESS: %s <=> %s', n, m);
		}
		*/

		return Math.abs(n - m) < epsilon;
	};

	function compare(a, b) {
		// We *should* only be comparing numbers with the same representation, but just to be safe we
		// allow comparisons among different representations.

		// First, make sure that we are handling comparisons with undefined/null consistently.  You'd
		// think this would work just fine based on the fallback to universalCmp below... or at least,
		// that's what I thought.  But that's wrong, and I'm not sure why.  Doing it here makes it very
		// obvious what we're trying to accomplish, and more importantly, actually makes it work right.

		if (a == null || b == null) {
			return a == b ? 0 : a == null ? -1 : 1;
		}

		// Second, handle the common case of comparisons between the same representation.

		if (typeof a === 'number' && typeof b === 'number') {
			if (EXPERIMENTAL_FEATURES['Safe Float Equality']) {
				return floatSafe_equalp(a, b) ? 0 : a < b ? -1 : 1;
			}
			else {
				return a < b ? -1 : a > b ? 1 : 0;
			}
		}
		else if (numeral.isNumeral(a) && numeral.isNumeral(b)) {
			if (EXPERIMENTAL_FEATURES['Safe Float Equality']) {
				return floatSafe_equalp(a.value(), b.value()) ? 0 : a.value() < b.value() ? -1 : 1;
			}
			else {
				return a.value() < b.value() ? -1 : a.value() > b.value() ? 1 : 0;
			}
		}
		else if (BigNumber.isBigNumber(a) && BigNumber.isBigNumber(b)) {
			// No need to perform a separate check for safer float comparison because BigNumber values
			// are inherently as precise as they need to be.
			return a.lt(b) ? -1 : a.gt(b) ? 1 : 0;
		}

		// Third, handle comparisons between different representations.

		if (numeral.isNumeral(a)) {
			if (BigNumber.isBigNumber(b)) {
				return b.gt(a.value()) ? -1 : b.lt(a.value()) ? 1 : 0;
			}
			else if (typeof b === 'number') {
				return a.value() < b ? -1 : a.value() > b ? 1 : 0;
			}
			else {
				return types.universalCmp(a, b);
			}
		}
		else if (BigNumber.isBigNumber(a)) {
			if (numeral.isNumeral(b)) {
				return a.lt(b.value()) ? -1 : a.gt(b.value()) ? 1 : 0;
			}
			else if (typeof b === 'number') {
				return a.lt(b) ? -1 : a.gt(b) ? 1 : 0;
			}
			else {
				return types.universalCmp(a, b);
			}
		}
		else if (typeof a === 'number') {
			if (BigNumber.isBigNumber(b)) {
				return b.gt(a) ? -1 : b.lt(a) ? 1 : 0;
			}
			else if (numeral.isNumeral(b)) {
				return a < b.value() ? -1 : a > b.value() ? 1 : 0;
			}
			else {
				return types.universalCmp(a, b);
			}
		}
		else {
			return types.universalCmp(a, b);
		}
	}

	// register {{{2

	types.registry.set('number', {
		matches: matches,
		parse: parse,
		decode: decode,
		format: format,
		natRep: natRep,
		compare: compare,
	});
})();

// Currency {{{1

(function () {

	// matches {{{2

	/**
	 * Recognize values that start with a dollar sign or are surrounded by parentheses as currency.
	 */

	// FIXME: We should recognize any symbol or abbreviation in any position, e.g. ¥400, 99 USD.

	function matches(val) {
		if (typeof val !== 'string') {
			console.error('[DataVis // Types // Currency // Parse] Call Error: `val` must be a string');
			return false;
		}

		if (s.charAt(0) === '$') {
			return types.registry.get('number').matches(val.substring(1));
		}
		else if (s.startsWith('(') && s.endsWith(')')) {
			return types.registry.get('number').matches(val.substring(1, s.length - 1));
    }
		return false;
	}

	// parse {{{2

	var re_comma = new RegExp(/,/g);

  function _parse(str, resultType) {
    if (str.charAt(0) === '$') {
      return _parse(str.substring(1));
    }
    else if (str.charAt(0) === '(' && str.charAt(-1) === ')') {
      return _parse(str.substring(1, str.length - 1)) * -1;
    }
    else if (!types.registry.get('number').matches(str)) {
			return null;
		}
		else {
			var noCommas = str.replace(re_comma, '');
			return resultType === 'string' ? noCommas
				: str.indexOf('.') >= 0 || str.indexOf('e') >= 0 ? parseFloat(noCommas)
				: parseInt(noCommas);
		}
  }

	function parse(str, ir) {
		var parsed;

		if (typeof str !== 'string') {
			console.error('[DataVis // Type(Currency) // Parse] Call Error: `val` must be a string');
			return null;
		}

		switch (ir) {
		case 'primitive':
			return _parse(str, 'number');
		case 'numeral':
			parsed = _parse(str, 'number');
			if (parsed == null) {
				return null;
			}
			return numeral(parsed);
		case 'bignumber':
			parsed = _parse(str, 'string');
			if (parsed == null) {
				return null;
			}
			return new BigNumber(parsed);
		default:
			console.error('[DataVis // Type(Currency) // Parse] Call Error: invalid internal representation: %s', ir);
			return null;
		}
	}

	// decode {{{2

	function decode(val, ir) {
		if (typeof val === 'string') {
			return parse(val, ir);
		}
		else if (typeof val === 'number') {
			switch (ir) {
			case 'primitive':
				return val;
			case 'bignumber':
				return new BigNumber(val);
			case 'numeral':
				return numeral(val);
			default:
				console.error('[DataVis // Type(Currency) // Decode] Call Error: invalid internal representation: %s', ir);
				return null;
			}
		}
		else {
			console.error('[DataVis // Type(Currency) // Decode] Call Error: unsupported conversion: %s to %s', typeof val, ir);
			return null;
		}
	}

	// format {{{2

	// primitive {{{3

	function format_primitive(val, opts) {
		var self = this;

		if (Number.isNaN(val)) {
			return null;
		}

		switch (opts.formatMethod) {
		case 'intl':
			if (window.Intl != null && window.Intl.NumberFormat != null) {
				var config = {
					useGrouping: self.formatOpts.integerPart.grouping
				};

				if (self.formatOpts.decimalPlaces != null) {
					config.minimumFractionDigits = self.formatOpts.decimalPlaces;
					config.maximumFractionDigits = self.formatOpts.decimalPlaces;
				}

				return Intl.NumberFormat(window.DATAVIS_LANG, config).format(val);
			}
			else {
				return self.super.format(val);
			}
		case 'bignumber':
			return new BigNumber(val).toFormat(
				self.formatOpts.decimalPlaces,
				bigNumberRoundingMode(self.formatOpts),
				bigNumberFormat(self.formatOpts)
			);
		case 'numeral':
			return numeral(val).format(numeralFormat(self.formatOpts));
		default:
			return self.super.format(val);
		}
	}

	// numeral {{{3

	function format_numeral(val, opts) {
		var self = this;

		var result = '';

		result += self.formatOpts.integerPart.grouping ? '0,0' : '0';

		if (self.formatOpts.decimalPlaces == null) {
			result += '[.][0000000000000000]';
		}
		else if (self.formatOpts.decimalPlaces > 0) {
			result += '.';
			result += '0'.repeat(self.formatOpts.decimalPlaces);
		}

		return result;
	}

	// bignumber {{{3

	function format_bignumber(val, opts) {
		var self = this;

		var result = {
			prefix: '',
			decimalSeparator: self.formatOpts.radixPoint,
			secondaryGroupSize: 0,
			suffix: ''
		};

		if (val.isNaN()) {
			return null;
		}

		if (self.formatOpts.integerPart.grouping) {
			result.groupSeparator = self.formatOpts.integerPart.groupSeparator;
			result.groupSize = self.formatOpts.integerPart.groupSize;
		}
		else {
			result.groupSize = 0;
		}
		if (self.formatOpts.fractionalPart.grouping) {
			result.fractionGroupSeparator = self.formatOpts.fractionalPart.groupSeparator;
			result.fractionGroupSize = self.formatOpts.fractionalPart.groupSize;
		}
		else {
			result.fractionGroupSize = 0;
		}

		return result;
	}

	// main {{{3

	function format(val, opts) {
		var isNegative = false
			, formatted;

		if (typeof val === 'number') {
			if (Number.isNaN(val)) {
				return null;
			}
			if (val < 0) {
				isNegative = true;
				val = val * -1;
			}
			formatted = self._format_primitive(val);
		}
		else if (numeral.isNumeral(val)) {
			if (Number.isNaN(val)) {
				return null;
			}
			if (val.value() < 0) {
				isNegative = true;
				val.multiply(-1);
			}
			formatted = self._format_numeral(val);
		}
		else if (BigNumber.isBigNumber(val)) {
			if (val.isNaN()) {
				return null;
			}
			if (val.isNegative()) {
				isNegative = true;
				val = val.abs();
			}
			formatted = self._format_bignumber(val);
		}

		if (isNegative) {
			switch (self.formatOpts.negativeFormat) {
			case 'minus':
				return self.formatOpts.currencySymbol + '-' + result;
			case 'parens':
				return '(' + self.formatOpts.currencySymbol + result + ')';
			}
		}
		else {
			return self.formatOpts.currencySymbol + result;
		}
	}

	// register {{{2

	types.registry.set('currency', {
		matches: matches,
		parse: parse,
		decode: decode,
		format: format,
		natRep: types.registry.get('number').natRep,
		compare: types.registry.get('number').compare,
	});
})();

// Date {{{1

(function () {

	var re_date = new RegExp(/^\d{4}-\d{2}-\d{2}$/);

	// matches {{{2

	function matches(val) {
		return re_date.test(val);
	}

	// parse {{{2

	function parse(val, ir, fmt) {
		var parsed
			, ir = ir || 'string'
			, opts = opts || {};

		if (typeof val !== 'string') {
			console.error('[DataVis // Type(Date) // Parse] Call Error: `val` must be a string');
			return null;
		}

		switch (ir) {
		case 'string':
			return val;
		case 'native':
			return Date.parse(val);
		case 'moment':
			return moment(val, fmt);
		default:
			return null;
		}
	}

	// decode {{{2

	function decode(val, ir, fmt) {
		if (typeof val === 'string') {
			return parse(val, ir, fmt);
		}
	}

	// format {{{2

	function format(val, opts) {
		opts = deepDefaults(opts, {
			format: 'LL'
		});

		if (typeof val === 'string') {
			val = moment(val, 'YYYY-MM-DD');
		}
		else if (val instanceof Date) {
			val = moment(val);
		}

		if (!moment.isMoment(val)) {
			return '';
		}

		if (!val.isValid()) {
			return '';
		}

		return val.format(opts.format);
	}

	// natRep {{{2

	// The native representation of a date is the same as the string representation, i.e. YYYY-MM-DD.

	function natRep(val) {
		if (typeof val === 'string') {
			return val;
		}
		else if (val instanceof Date) {
			return sprintf.sprintf('%04d-%02d-%02d', val.getFullYear(), val.getMonth() + 1, val.getDate());
		}
		else if (moment.isMoment(val)) {
			return val.format('YYYY-MM-DD');
		}
		else {
			return '';
		}
	}

	// compare {{{2

	function compare(a, b) {
		return types.registry.get('string').compare(natRep(a), natRep(b));
	}

	// register {{{2

	types.registry.set('date', {
		matches: matches,
		parse: parse,
		decode: decode,
		format: format,
		natRep: natRep,
		compare: compare,
	});
})();

// Date/Time {{{1

(function () {

	var re_datetime = new RegExp(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);

	// matches {{{2

	function matches(str) {
		return re_datetime.test(str);
	}

	// parse {{{2

	function parse(str, ir, fmt) {
		var parsed
			, ir = ir || 'string'
			, opts = opts || {};

		if (typeof str !== 'string') {
			console.error('[DataVis // Type(Date) // Parse] Call Error: `str` must be a string');
			return null;
		}

		switch (ir) {
		case 'string':
			return str;
		case 'native':
			return Date.parse(str);
		case 'moment':
			return moment(str, fmt);
		default:
			return null;
		}

		return null;
	}

	// decode {{{2

	function decode(val, ir) {
		if (typeof val === 'string') {
			return parse(val, ir);
		}
		else {
			console.error('[DataVis // Type(Datetime) // Decode] Call Error: unsupported conversion: %s to %s', typeof val, ir);
			return null;
		}
	}

	// format {{{2

	function format(val, opts) {
		opts = deepDefaults(opts, {
			format: 'LLL'
		});

		if (typeof val === 'string') {
			val = moment(val, 'YYYY-MM-DD HH:mm:ss');
		}
		else if (val instanceof Date) {
			val = moment(val);
		}

		if (!moment.isMoment(val)) {
			console.error('[DataVis // Type(Date) // Format] Call Error: `val` must be a string, Date, or Moment');
			return '';
		}

		if (!val.isValid()) {
			return '';
		}

		return val.format(opts.format);
	}

	// natRep {{{2

	// The native representation of a date is the same as the string representation, i.e. YYYY-MM-DD
	// HH:mm:ss.  It's an open design question for me whether or not we should include milliseconds.
	// In the current use cases, milliseconds aren't really used; they'd probably be more useful for
	// durations than for date/times.

	function natRep(val) {
		if (typeof val === 'string') {
			return val;
		}
		else if (val instanceof Date) {
			return sprintf.sprintf('%04d-%02d-%02d %02d:%02d:%02d',
				val.getFullYear(), val.getMonth() + 1, val.getDate(),
				val.getHours(), val.getMinutes(), val.getSeconds());
		}
		else if (moment.isMoment(val)) {
			return val.format('YYYY-MM-DD HH:mm:ss');
		}
		else {
			return '';
		}
	}

	// compare {{{2

	function compare(a, b) {
		return types.registry.get('string').compare(natRep(a), natRep(b));
	}

	// register {{{2

	types.registry.set('datetime', {
		matches: matches,
		parse: parse,
		decode: decode,
		format: format,
		natRep: natRep,
		compare: compare,
	});
})();

// Time {{{1

(function () {

	var re_time = new RegExp(/^\d{2}:\d{2}:\d{2}$/);

	// matches {{{2

	function matches(str) {
		return re_time.test(str);
	}

	// parse {{{2

	function parse(str, ir, fmt) {
		var parsed
			, ir = ir || 'string';

		if (typeof str !== 'string') {
			console.error('[DataVis // Type(Time) // Parse] Call Error: `str` must be a string');
			return null;
		}

		switch (ir) {
		case 'string':
			return str;
		case 'native':
			var d = Date.parse('2000-01-01T' + str + '.000Z');
		case 'moment':
			return moment('2000-01-01 ' + str, 'YYYY-MM-DD ' + (fmt || 'HH:mm:ss'));
		default:
			return null;
		}

		return null;
	}

	// decode {{{2

	function decode(val, ir) {
		if (typeof val === 'string') {
			return parse(val, ir);
		}
		else {
			console.error('[DataVis // Type(Time) // Decode] Call Error: unsupported conversion: %s to %s', typeof val, ir);
			return null;
		}
	}

	// format {{{2

	function format(val, opts) {
		opts = deepDefaults(opts, {
			format: 'LTS'
		});

		if (typeof val === 'string') {
			val = moment('2000-01-01 ' + val, 'YYYY-MM-DD HH:mm:ss');
		}
		else if (val instanceof Date) {
			val = moment(val);
		}

		if (!moment.isMoment(val)) {
			console.error('[DataVis // Type(Time) // Format] Call Error: `val` must be a string, Date, or Moment');
			return '';
		}

		if (!val.isValid()) {
			return '';
		}

		return val.format(opts.format);
	}

	// natRep {{{2

	function natRep(val) {
		if (typeof val === 'string') {
			return val;
		}
		else if (val instanceof Date) {
			return sprintf.sprintf('%02d:%02d:%02d',
				val.getHours(), val.getMinutes(), val.getSeconds());
		}
		else if (moment.isMoment(val)) {
			return val.format('HH:mm:ss');
		}
		else {
			return '';
		}
	}

	// compare {{{2

	function compare(a, b) {
		return types.registry.get('string').compare(natRep(a), natRep(b));
	}

	// register {{{2

	types.registry.set('time', {
		matches: matches,
		parse: parse,
		decode: decode,
		format: format,
		natRep: natRep,
		compare: compare,
	});
})();

// Duration {{{1

(function () {

  var re_number = new RegExp(/(^-?[1-9]{1}[0-9]{0,2}(,?\d{3})*(\.\d+)?(e[+-]?\d+)?$)|(^0(e[+-]?\d+)?$)|(^-?0?\.\d+(e[+-]?\d+)?$)/);
	var re_comma = new RegExp(/,/g);

	// matches {{{2

	function matches(val) {
		return (typeof val === 'number') || (typeof val === 'string' && re_number.test(val));
	}

	// parse {{{2

  function _parse(strVal, resultType) {
    if (strVal.charAt(0) === '$') {
      return _parse(strVal.substring(1));
    }
    else if (strVal.charAt(0) === '(' && strVal.charAt(-1) === ')') {
      return _parse(strVal.substring(1, strVal.length - 1)) * -1;
    }
    else if (!re_number.test(strVal)) {
			// Not a number that we can recognize.
			return null;
		}
		else {
			var noCommas = strVal.replace(re_comma, '');
			return resultType === 'string' ? noCommas
				: strVal.indexOf('.') >= 0 || strVal.indexOf('e') >= 0 ? parseFloat(noCommas)
				: parseInt(noCommas);
		}
  }

	function parse(str, ir, fmt) {
		var parsed
			, opts = opts || {};

		if (typeof str === 'number') {
			switch (opts.internalRepresentation) {
			case 'primitive': return str;
			case 'numeral': return numeral(str);
			case 'bignumber': return new BigNumber(str);
			default:
				throw new Error('Unsupported internal representation for Number type: ' + opts.internalRepresentation);
			}
		}
		else if (typeof str === 'string') {
			switch (opts.internalRepresentation) {
			case 'primitive':
				return _parse(str, 'number');
			case 'numeral':
				parsed = _parse(str, 'number');
				if (parsed == null) {
					return null;
				}
				return numeral(parsed);
			case 'bignumber':
				parsed = _parse(str, 'string');
				if (parsed == null) {
					return null;
				}
				return new BigNumber(parsed);
			default:
				throw new Error('Unsupported internal representation for Number type: ' + opts.internalRepresentation);
			}
		}

		return null;
	}

	// format {{{2

	// primitive {{{3

	function format_primitive(val, opts) {
		var self = this;

		if (Number.isNaN(val)) {
			return null;
		}

		switch (opts.formatMethod) {
		case 'intl':
			if (window.Intl != null && window.Intl.NumberFormat != null) {
				var config = {
					useGrouping: self.formatOpts.integerPart.grouping
				};

				if (self.formatOpts.decimalPlaces != null) {
					config.minimumFractionDigits = self.formatOpts.decimalPlaces;
					config.maximumFractionDigits = self.formatOpts.decimalPlaces;
				}

				return Intl.NumberFormat(window.DATAVIS_LANG, config).format(val);
			}
			else {
				return self.super.format(val);
			}
		case 'bignumber':
			return new BigNumber(val).toFormat(
				self.formatOpts.decimalPlaces,
				bigNumberRoundingMode(self.formatOpts),
				bigNumberFormat(self.formatOpts)
			);
		case 'numeral':
			return numeral(val).format(numeralFormat(self.formatOpts));
		default:
			return self.super.format(val);
		}
	}

	// numeral {{{3

	function format_numeral(val, opts) {
		var self = this;

		var result = '';

		result += self.formatOpts.integerPart.grouping ? '0,0' : '0';

		if (self.formatOpts.decimalPlaces == null) {
			result += '[.][0000000000000000]';
		}
		else if (self.formatOpts.decimalPlaces > 0) {
			result += '.';
			result += '0'.repeat(self.formatOpts.decimalPlaces);
		}

		return result;
	}

	// bignumber {{{3

	function format_bignumber(val, opts) {
		var self = this;

		var result = {
			prefix: '',
			decimalSeparator: self.formatOpts.radixPoint,
			secondaryGroupSize: 0,
			suffix: ''
		};

		if (val.isNaN()) {
			return null;
		}

		if (self.formatOpts.integerPart.grouping) {
			result.groupSeparator = self.formatOpts.integerPart.groupSeparator;
			result.groupSize = self.formatOpts.integerPart.groupSize;
		}
		else {
			result.groupSize = 0;
		}
		if (self.formatOpts.fractionalPart.grouping) {
			result.fractionGroupSeparator = self.formatOpts.fractionalPart.groupSeparator;
			result.fractionGroupSize = self.formatOpts.fractionalPart.groupSize;
		}
		else {
			result.fractionGroupSize = 0;
		}

		return result;
	}

	// main {{{3

	function format(val, opts) {
		var isNegative = false
			, formatted;

		if (typeof val === 'number') {
			if (Number.isNaN(val)) {
				return null;
			}
			if (val < 0) {
				isNegative = true;
				val = val * -1;
			}
			formatted = self._format_primitive(val);
		}
		else if (numeral.isNumeral(val)) {
			if (Number.isNaN(val)) {
				return null;
			}
			if (val.value() < 0) {
				isNegative = true;
				val.multiply(-1);
			}
			formatted = self._format_numeral(val);
		}
		else if (BigNumber.isBigNumber(val)) {
			if (val.isNaN()) {
				return null;
			}
			if (val.isNegative()) {
				isNegative = true;
				val = val.abs();
			}
			formatted = self._format_bignumber(val);
		}

		if (isNegative) {
			switch (self.formatOpts.negativeFormat) {
			case 'minus':
				return self.formatOpts.currencySymbol + '-' + result;
			case 'parens':
				return '(' + self.formatOpts.currencySymbol + result + ')';
			}
		}
		else {
			return self.formatOpts.currencySymbol + result;
		}
	}

	// natRep {{{2
	// compare {{{2
	// register {{{2

	types.registry.set('duration', {
		matches: matches,
		parse: parse,
		format: format,
		natRep: natRep,
		compare: compare,
	});
});

// JSON {{{1

(function () {

	// matches {{{2

	function matches(val) {
		return typeof val === 'string' && (
				(val.startsWith('{') && val.endsWith('}')) || (val.startsWith('[') && val.endsWith(']'))
			);
	}

	// parse {{{2

	function parse(val, opts) {
		var parsed
			, opts = opts || {};

		if (typeof val === 'number') {
			switch (opts.internalRepresentation) {
			case 'primitive': return val;
			case 'numeral': return numeral(val);
			case 'bignumber': return new BigNumber(val);
			default:
				throw new Error('Unsupported internal representation for Number type: ' + opts.internalRepresentation);
			}
		}
		else if (typeof val === 'string') {
			switch (opts.internalRepresentation) {
			case 'primitive':
				return _parse(val, 'number');
			case 'numeral':
				parsed = _parse(val, 'number');
				if (parsed == null) {
					return null;
				}
				return numeral(parsed);
			case 'bignumber':
				parsed = _parse(val, 'string');
				if (parsed == null) {
					return null;
				}
				return new BigNumber(parsed);
			default:
				throw new Error('Unsupported internal representation for Number type: ' + opts.internalRepresentation);
			}
		}

		return null;
	}

	// format {{{2

	// primitive {{{3

	function format_primitive(val, opts) {
		var self = this;

		if (Number.isNaN(val)) {
			return null;
		}

		switch (opts.formatMethod) {
		case 'intl':
			if (window.Intl != null && window.Intl.NumberFormat != null) {
				var config = {
					useGrouping: self.formatOpts.integerPart.grouping
				};

				if (self.formatOpts.decimalPlaces != null) {
					config.minimumFractionDigits = self.formatOpts.decimalPlaces;
					config.maximumFractionDigits = self.formatOpts.decimalPlaces;
				}

				return Intl.NumberFormat(window.DATAVIS_LANG, config).format(val);
			}
			else {
				return self.super.format(val);
			}
		case 'bignumber':
			return new BigNumber(val).toFormat(
				self.formatOpts.decimalPlaces,
				bigNumberRoundingMode(self.formatOpts),
				bigNumberFormat(self.formatOpts)
			);
		case 'numeral':
			return numeral(val).format(numeralFormat(self.formatOpts));
		default:
			return self.super.format(val);
		}
	}

	// numeral {{{3

	function format_numeral(val, opts) {
		var self = this;

		var result = '';

		result += self.formatOpts.integerPart.grouping ? '0,0' : '0';

		if (self.formatOpts.decimalPlaces == null) {
			result += '[.][0000000000000000]';
		}
		else if (self.formatOpts.decimalPlaces > 0) {
			result += '.';
			result += '0'.repeat(self.formatOpts.decimalPlaces);
		}

		return result;
	}

	// bignumber {{{3

	function format_bignumber(val, opts) {
		var self = this;

		var result = {
			prefix: '',
			decimalSeparator: self.formatOpts.radixPoint,
			secondaryGroupSize: 0,
			suffix: ''
		};

		if (val.isNaN()) {
			return null;
		}

		if (self.formatOpts.integerPart.grouping) {
			result.groupSeparator = self.formatOpts.integerPart.groupSeparator;
			result.groupSize = self.formatOpts.integerPart.groupSize;
		}
		else {
			result.groupSize = 0;
		}
		if (self.formatOpts.fractionalPart.grouping) {
			result.fractionGroupSeparator = self.formatOpts.fractionalPart.groupSeparator;
			result.fractionGroupSize = self.formatOpts.fractionalPart.groupSize;
		}
		else {
			result.fractionGroupSize = 0;
		}

		return result;
	}

	// main {{{3

	function format(val, opts) {
		var isNegative = false
			, formatted;

		if (typeof val === 'number') {
			if (Number.isNaN(val)) {
				return null;
			}
			if (val < 0) {
				isNegative = true;
				val = val * -1;
			}
			formatted = self._format_primitive(val);
		}
		else if (numeral.isNumeral(val)) {
			if (Number.isNaN(val)) {
				return null;
			}
			if (val.value() < 0) {
				isNegative = true;
				val.multiply(-1);
			}
			formatted = self._format_numeral(val);
		}
		else if (BigNumber.isBigNumber(val)) {
			if (val.isNaN()) {
				return null;
			}
			if (val.isNegative()) {
				isNegative = true;
				val = val.abs();
			}
			formatted = self._format_bignumber(val);
		}

		if (isNegative) {
			switch (self.formatOpts.negativeFormat) {
			case 'minus':
				return self.formatOpts.currencySymbol + '-' + result;
			case 'parens':
				return '(' + self.formatOpts.currencySymbol + result + ')';
			}
		}
		else {
			return self.formatOpts.currencySymbol + result;
		}
	}

	// natRep {{{2
	// compare {{{2

	types.registry.set('json', {
		matches: matches,
		parse: parse,
		format: format,
		natRep: natRep,
		compare: compare,
	});
});

export default types;
