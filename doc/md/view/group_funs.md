# Group Functions

Group functions let you transform the values of a field you group or pivot.  The results are then used for the actual group/pivot operation.  This lets you create buckets or ranges of data by distilling the values, for example to group dates by year and month.

!!! important
    Although they are called "group functions" they apply to pivots as well, because pivots are just sideways groups.

## Custom Group Functions

You can write your own group functions using the `GROUP_FUNCTION_REGISTRY` extension point.  This is an `OrdMap` instance where you can insert your own function amongst the provided ones.  (You could also use it to remove any existing functions you don't to have available.)  Functions added to this registry need to be instances of [`GroupFunction`](http://localhost:5000/jsdoc/GroupFunction.html).

## Specification

The `GroupFunction` constructor takes a single object that specifies how the group function should work.

`displayName` (required)
: What should be displayed in the user interface as the name of the function.

`allowedTypes`
: A list of DataVis types that this function can be used on.

`valueFun` (required)
: A function that transforms an original value from the data into the value that should be used for grouping purposes.

`resultType` (default: `"string"`)
: The type of the values produced by the `valueFun` function.

## Examples

This adds the group function "Round to Hundreds" as an option for currency-type fields.  Rows will be grouped according to the value of the grouping field rounded to the nearest hundred dollars, effectively creating $100 buckets for groups.

``` javascript
MIE.WC_DataVis.GROUP_FUNCTION_REGISTRY.set('round_hundreds', new MIE.WC_DataVis.GroupFunction({
  displayName: 'Round to Hundreds',
  allowedTypes: ['currency'],
  resultType: 'currency',
  valueFun: function (x) {
    var b = typeof x === 'string' ? BigNumber(x)
      : numeral.isNumeral(x) ? BigNumber(x.value())
      : BigNumber.isBigNumber(x) ? x
      : BigNumber(0);
    return b.idiv(100).times(100).plus(b.mod(100) >= 50 ? 100 : 0).toNumber();
  }
}));
```

This is a builtin group function that shows the year and quarter for date-type and datetime-type fields.  I've put it here to illustrate how to use dates.

``` javascript
GROUP_FUNCTION_REGISTRY.set('year_and_quarter', new GroupFunction({
	displayName: 'Year & Quarter',
	allowedTypes: ['date', 'datetime'],
	valueFun: function (d) {
		if (typeof d === 'string') {
			d = moment(d);
		}
		if (!moment.isMoment(d) || !d.isValid()) {
			return 'Invalid Date';
		}
		return d.format('YYYY [Q]Q');
	}
}));
```
