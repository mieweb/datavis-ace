# DataVis Testing JS API

These libraries are used for writing tests using Selenium via the JS API.

Probably the most useful thing in this library is the [Grid]{@link module:grid~Grid} class, which provides a lot of convenience methods for manipulating the grid.  At the end of the day, those methods boil down to "find this element and click it" so they're as realistic as possible for testing purposes.

## Third-Party Library Documentation

These third party libraries are used for testing.

* [Selenium Webdriver JS API](https://www.selenium.dev/selenium/docs/api/javascript/module/selenium-webdriver/index.html)
* [Mocha Test Framework](https://mochajs.org/#table-of-contents)
* [Chai Assert Library](https://www.chaijs.com/api/assert/)
* [Bluebird Async Library](http://bluebirdjs.com/docs/api-reference.html)

## Full Example Test

Here's an example from the filtering test.

```js
const assert = require('assert');
const _ = require('lodash');
const Grid = require('../lib/grid.js');
const setup = require('../lib/setup.js');

const {Builder, Browser, By, Key, until} = require('selenium-webdriver');
const {Preferences: LoggingPrefs, Type: LoggingType, Level: LoggingLevel} = require('selenium-webdriver/lib/logging');

describe('Filter', function() {
  setup.server();
  const logging = new LoggingPrefs();
  logging.setLevel(LoggingType.BROWSER, LoggingLevel.ALL);
  let driver;
  let grid;

  before(async function () {
    driver = new Builder().forBrowser('chrome').setLoggingPrefs(logging).build();
  });

  before(async function () {
    await driver.get('http://localhost:3000/grid/default.html');
    grid = new Grid(driver);
    await grid.waitForIdle();
  });

  // We need to clear the local storage before each test.  However:
  //
  //   1. It can't be done before navigating to the page, because the browser starts on a data: URL
  //   and you're not allowed to mess with local storage there.
  //
  //   2. It can't be done after navigating to the page, because some stuff is written there before
  //   we get to run any code, which removes the prefs initialization.
  //
  // Therefore, we clear local storage after the test is done instead.  SO DON'T MOVE IT HERE!

  after(async function () {
    await driver.executeScript('window.localStorage.clear()');
  });

  after(async function () {
    if (driver != null) {
      await driver.quit();
    }
  });

  describe('string filter', function () {
    before(async function () {
      await grid.addFilter('country');
    });

    after(async function () {
      await grid.clearFilter();
      await grid.waitForIdle();
    });

    it('can filter one in', async function () {
      await grid.setFilter('country', 'sumoselect', '$in', ['Canada']);
      await grid.waitForIdle();

      assert.equal(await grid.getNumRows(), 10);
      assert.equal(await grid.getCell('country', 0), 'Canada');
      assert.equal(await grid.getCell('country', -1), 'Canada');
    });

    it('can filter one not-in', async function () {
      await grid.setFilter('country', 'sumoselect', '$nin', ['Canada']);
      await grid.waitForIdle();

      assert.equal(await grid.getNumRows(), 90);
    });

    it('can filter multiple in', async function () {
      await grid.setFilter('country', 'sumoselect', '$in', ['Canada', 'Japan']);
      await grid.waitForIdle();

      assert.equal(await grid.getNumRows(), 20);
      assert.equal(await grid.getCell('country', 0), 'Canada');
      assert.equal(await grid.getCell('country', -1), 'Japan');
    });

    it('can filter multiple not-in', async function () {
      await grid.setFilter('country', 'sumoselect', '$nin', ['Canada', 'Japan']);
      await grid.waitForIdle();

      assert.equal(await grid.getNumRows(), 80);
    });
  });
});
```
