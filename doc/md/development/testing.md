# Writing & Running Tests

## Building Test Data

The program that generates the data is written in Python, and uses the packages we installed in [Pre-Requisites](index.md#pre-requisites).

Test data is generated from [JSON5](https://json5.org) test files located in the `tests/data/templates` directory.  The resulting data files can be found in `tests/data` and get copied to `tests/pages` for use by the automated tests.  See [the json-gen documentation](json_gen.md) for more information about the template files.

You'll also need a word list, as some of the data files contain random dictionary words.  The tests expect the word list from the `words` package, specifically version `3.0-17.el6` from CentOS.  By default, `json-gen` expects to find this word list at `/usr/share/dict/words` — if you have this file elsewhere, you can specify that path as the `DICT_FILE` environment variable when running *make*.

## Writing Tests

Automated tests for DataVis are written in JavaScript using [Selenium](https://seleniumhq.github.io/selenium/docs/api/javascript/) and [Mocha](https://mochajs.org).  The [Chai](https://www.chaijs.com/api/assert/) assertion and [Bluebird](http://bluebirdjs.com/docs/api-reference.html) promise libraries are also heavily used.  At first, I found writing these asynchronous tests pretty mind-bending, but with a library of useful utility functions, it gets easier.

In general, the approach for each test suite (i.e. file) is to define a data structure specifying what to check and what the results should be.  Then iterate over that structure, building up `describe()` and `it()` functions as you go.

## Running Tests

Build everything needed for manual testing with `make tests` (the test pages make great examples), and run all automated tests using `make test`.

You can also run individual test files using Mocha directly:

```
[wcdatavis] $ ./node_modules/mocha/bin/mocha -t 10000 tests/selenium/sort.js
```

If every test causes a window to pop up and immediately close, resulting in a failed test, then it's likely that your locally installed version of Chrome is out of sync with the `chromedriver` NPM package.  This happens all the time.  Open Chrome and check the version.  If that's more recent than the version of `chromedriver` specified in DataVis' `package.json` then update it to whatever the matching release is from the [chromedriver NPM page](https://www.npmjs.com/package/chromedriver).  Then run `npm install` to get the new `chromedriver` package and try running tests again.


## Test File Template

``` javascript
const _ = require('lodash');
const assert = require('assert');
const Promise = require('bluebird');

const Grid = require('../lib/grid.js');
const setup = require('../lib/setup.js');

const {Builder, Browser, By, Key, until} = require('selenium-webdriver');
const Logging = require('selenium-webdriver/lib/logging');

describe('My Test Suite', function() {
  setup.server();

  const logPrefs = new Logging.Preferences();
  logPrefs.setLevel(Logging.Type.BROWSER, Logging.Level.ALL);

  let driver;
  let grid;

  // Before we do anything, create the driver.

  before(async function () {
    driver = new Builder().forBrowser('chrome')
      .setLoggingPrefs(logPrefs).build();
  });

  // If you need to reload the page to clear it out multiple times, these can go
  // inside other describe blocks.  Otherwise they can go at the toplevel.

  before(async function () {
    await driver.get('http://localhost:3000/grid/default.html');
    grid = new Grid(driver);
    await grid.waitForIdle();
  });

  after(async function () {
    await driver.executeScript('window.localStorage.clear()');
  });

  // This always goes after the previous "after" if they're in the same scope,
  // just to make sure that quitting the driver is the last thing we do.

  after(async function () {
    if (driver != null) {
      await driver.quit();
    }
  });

  /* ---------------------------- TESTS GO HERE ----------------------------- */
});
```
