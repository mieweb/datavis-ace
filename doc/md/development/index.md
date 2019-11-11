# Development

## Code Standards

1.  Code is indented with tabs. Each tab is 2 visual spaces.
2.  When changing code, prioritize leaving lines untouched (don’t reformat lines, even if they don’t meet these standards).
3.  Write in an object-oriented style.
4.  Don’t [cuddle your else keywords](http://wiki.c2.com/?CuddledElseBlocks).
5.  Combine declarations for variables without initializers; use separate declarations for variables with initializers.

## Running Local Server

By running the local HTTP server, you can easily get to the documentation and test pages as you work on the code.  It runs on port 5000 and can be started with `npm run http-server`.  Here are some links for useful stuff, once you get it running:

- [DataVis JS API Docs](http://localhost:5000/jsdoc/index.html)
- [DataVis Manual](http://localhost:5000/doc/html/index.html)
- [Testing Library JS API Docs](http://localhost:5000/tests/jsdoc/index.html)
- [Grid Test Pages](http://localhost:5000/tests/pages/grid/)

## Testing

### Building Test Data

The program that generates the data is written in Python, and uses the following libraries that you'll have to `pip install`.

* babel
* json5
* dicttoxml

Test data is generated from [JSON5](https://json5.org) test files located in the `tests/data/templates` directory.  The resulting data files can be found in `tests/data` and get copied to `tests/pages` for use by the automated tests.  See [the json-gen documentation](json_gen.md) for more information about the template files.

### Writing Tests

Automated tests for DataVis are written in JavaScript using [Selenium](https://seleniumhq.github.io/selenium/docs/api/javascript/) and [Mocha](https://mochajs.org).  The [Chai](https://www.chaijs.com/api/assert/) assertion and [Bluebird](http://bluebirdjs.com/docs/api-reference.html) promise libraries are also heavily used.  At first, I found writing these asynchronous tests pretty mind-bending, but with a library of useful utility functions, it gets easier.

In general, the approach for each test suite (i.e. file) is to define a data structure specifying what to check and what the results should be.  Then iterate over that structure, building up `describe()` and `it()` functions as you go.

### Running Tests

Build everything needed for testing with `make tests` (test pages are great examples), and run the automated tests using `make test`.

## Building Documentation

To build all documentation, after installing the required dependencies, simply use `make doc`.  This builds both the JS API docs and the manual.

### JS API Docs

Everything you need to build JS API documentation is installed when you run `npm install`.  Then you can run `make jsdoc` to build the docs.  The result is in the `jsdoc` directory, which can be accessed via the [local server](http://localhost:5000/jsdoc/index.html).

### This Manual

The following Python libraries are required to build this manual.

- mkdocs
- mkdocs-material
- pymdown-extensions

After installing these, run `make mkdocs` to produce the documentation in the `doc/html` directory.  These can then be accessed via the [local server](http://localhost:5000/doc/html/index.html).

!!! tip
    When actively working on the documentation, you can also use `mkdocs serve` to start a separate server that only provides the documentation, but reloads automatically as you edit the pages.

### Testing JS API Docs

Since tests are written in JavaScript, the libraries that help with testing are also documented with jsdoc.  You can build them by running `make jsdoc` in the `tests` directory, or by running `make doc` at the toplevel directory.  The resulting pages go into `tests/jsdoc` and can be accessed via the [local server](http://localhost:5000/tests/jsdoc/index.html).
