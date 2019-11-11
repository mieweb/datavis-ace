# Writing Tests

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
      driver.quit();
    }
  });

  /* ---------------------------- TESTS GO HERE ----------------------------- */
});
```
