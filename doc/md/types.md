# Types

Types are collections of values that support the same operations. All values in a column in DataVis have a common type, with the most basic type being string.

DataVis ships with many builtin types for common applications such as: numbers, dates, times, and JSON data. However, you may wish to add your own types. 

Some of this implementation may seem redundant. Why have so many ways to store numbers when you can use the browser’s native number formatting in `Intl`? Well, it’s because we originally wrote DataVis to support IE10, which does not have such features.

## Toplevel API

The `types` object exported from `types.js` has the following properties:

- `guess(str)` — Returns the name of a type which matches the string given. See [Guessing Types](#guessing-types) below.
- `registry` — An OrdMap mapping type names to an object of type functions. See [Type Functions](#type-functions) below.

## Guessing Types

Type guessing is an important part of DataVis’ functionality. Every type that DataVis knows about is stored in the registry, an ordered mapping of type names to the object that specifies how that type works. To guess the type of a value represented by a string (e.g. to say that “$99.97” is a currency) we iterate through the registry in order, trying each type to see if it matches. The first one that matches wins, and that’s the name of the type we guess.

## Builtin Types

The following types are builtin to DataVis:

- `string`
- `number`
- `currency`
- `date`
- `datetime`
- `time`
- `json`

### Number and Currency

The number and currency types supports the following internal representations:

- `primitive` — Uses the browser’s native floats to store values.
- `bignumber` — Uses the BigNumber arbitrary-precision arithmetic library.
- `numeral` — Uses the Numeral library.

### Date, Datetime, and Time

The date type supports the following internal representations:

- `string` — Values are stored internally as strings. This is the fastest.
  - Dates are stored in the format `YYYY-MM-DD`.
  - Datetimes are stored in the format `YYYY-MM-DD HH:mm:ss`.
  - Times are stored in the format `HH:mm:ss`.
- `date` — Values are stored as Date instances. (For the time type, the date component is simply ignored.)
- `moment` — Values are stored in Moment instances.

## Type Functions

Every entry in the registry is an object defining the type’s behavior. The following properties are required to fully implement a new type. All of the functions can be performance bottlenecks if care is not taken.

- `matches(str)` — Returns true if the string is something we can parse into a member of this type. Used by the type guessing logic.
- `parse(str, ir, fmt)` — Parses the string value into a value for the type. The nature of the value is determined by the *ir* parameter, which describes the “internal representation” of the value. For example, numbers can be represented internally by primitive floats, using the BigNumber library, or using the Numeral library. The fmt argument describes how to parse the string; usually this is passed to a library function such as `moment()`. Returns null if the string cannot be parsed.
- `convert(val, ir)` — Convert a value of the type into a different internal representation. This is mainly used when:
  - the serialization format of the data has support for a representation of the type, but we’re using a different one (e.g. using a JSON number as currency)
  - when combining data from multiple columns e.g. in an aggregate function

- `format(val, fmt)` — Formats a value so that it can be printed. Since a type can have multiple internal representations, the format function must handle them all; e.g. the number type handles values of primitive floats, BigNumber objects, and Numeral objects. Returns null if the value cannot be formatted, or if the value is `NaN`. The result is typically cached so that rendering the same value over and over does not invoke this function repeatedly.
- `natRep(val)` — Converts a value from its internal representation into a string that can be used as the key of a JavaScript object. This is mainly used for grouping functionality in the view. The mapping must be one-to-one, so that different values cannot produce the same “native representation.”
- `compare(a, b)` — Returns -1 if a < b, 0 if a = b, and 1 if a > b. Returns null if the values cannot be compared. This is used for sorting data.

### Parsing vs Conversion

Most of the data types that we support do not have a native representation in many wire protocols. XML and CSV are all just text. JSON has numbers, but not dates or times. For this reason, we mostly talk about parsing, but it’s important to mention conversion as well.

- *Parsing* is the process of converting a string into a value in the internal representation of the type.
- *Conversion* is the more general process of converting a value of a type from one representation to another.

If you’re writing a custom type, and it supports more than one internal representation, you should provide the conversion function.

## Registering a New Type

Create the functions specified above, then add it to the types registry like so:

```javascript
import types from 'types.js';

(function () {
  function matches(str) { /* ... */ }
  function parse(str, ir, fmt) { /* ... */ }
  function format(val, fmt) { /* ... */ }
  function natRep(val) { /* ... */ }
  function compare(a, b) { /* ... */ }
  
  types.registry.set('custom', {
    matches: matches,
    parse: parse,
    format: format,
    natRep: natRep,
    compare: compare
  });
})()
```
