/**
 * Adds logging methods to a class.
 *
 * @example
 * mixinLogging(ClassName);
 * mixinLogging(ClassName, 'Foo');
 * mixinLogging(ClassName, () => { return 'Foo(' + this.name + ')'; });
 *
 * this.logInfo(this.makeLogTag('Doing Stuff'), 'Log message goes here');
 *   => [DataVis // Foo(name) // Doing Stuff] Log message goes here
 *
 * this.disableDebugLog();
 * this.enableDebugLog();
 */

export var mixinLogging = function (obj, tagPrefix) {
  if (tagPrefix != null && typeof tagPrefix !== 'string' && typeof tagPrefix !== 'function') {
    throw new Error('Call Error: `tagPrefix` must be null, a string, or a function');
  }

  obj.prototype.makeLogTag = function (extra) {
    var self = this
      , prefix
      , tag = ['DataVis']
      , stack
      , m
      , lvl;

    if (typeof tagPrefix === 'string') {
      prefix = tagPrefix;
    }
    else if (typeof tagPrefix === 'function') {
      prefix = tagPrefix.call(self);
    }
    else if (typeof self.toString === 'function' && self.toString !== Object.prototype.toString) {
      prefix = self.toString();
    }
    else {
      prefix = obj.prototype.constructor.name;
      // Stack analysis works only on Chromium.
      //   0 : exception message
      //   1 : this function
      //   2 : caller
      //   3 : caller's caller &c
      // Named function in stack: "at foo (source)"
      // Anonymous function in stack: "at source"
      //   e.g. inside _.each(),
      //        keep going up stack until we find a named function
      // Keep in mind this is only when there's no toString() method.
      try {
        throw new Error;
      }
      catch (e) {
        stack = e.stack.split('\n');
        for (lvl = 2; lvl < stack.length; lvl += 1) {
          if ((m = stack[2].match(/^\s*at ([^\s]+) \(http[^)]+\)$/)) != null) {
            prefix += ' @ ' + m[1];
            break;
          }
          else if ((m = stack[2].match(/^\s*at http/)) != null) {
            // Lambda function... not useful at all?
            continue;
          }
          else {
            break;
          }
        }
      }
    }

    if (typeof prefix === 'string' && prefix.length > 0) {
      tag.push(prefix);
    }
    if (typeof extra === 'string' && extra.length > 0) {
      tag.push(extra);
    }

    return '[' + tag.join(' // ') + ']';
  };

  obj.prototype.disableLogging = function (lvl) {
    if (lvl == null) {
      lvl = 'error';
    }
    switch (lvl) {
    case 'error':
      this.logError = function () {};
      // eslint-disable-next-line no-fallthrough
    case 'warning':
      this.logWarning = function () {};
      // eslint-disable-next-line no-fallthrough
    case 'info':
      this.logInfo = function () {};
      // eslint-disable-next-line no-fallthrough
    case 'debug':
      this.logDebug = function () {};
    }
  };

  obj.prototype.enableLogging = function (lvl) {
    if (lvl == null) {
      lvl = 'debug';
    }
    switch (lvl) {
    case 'debug':
      this.logDebug = window.console.debug.bind(window.console);
      // eslint-disable-next-line no-fallthrough
    case 'info':
      this.logInfo = window.console.info.bind(window.console);
      // eslint-disable-next-line no-fallthrough
    case 'warning':
      this.logWarning = window.console.warn.bind(window.console);
      // eslint-disable-next-line no-fallthrough
    case 'error':
      this.logError = window.console.error.bind(window.console);
    }
  };

  obj.prototype.logDebug = window.console.debug.bind(window.console);
  obj.prototype.logInfo = window.console.info.bind(window.console);
  obj.prototype.logWarning = window.console.warn.bind(window.console);
  obj.prototype.logError = window.console.error.bind(window.console);
};