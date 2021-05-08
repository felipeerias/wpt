/**
 * Supports pseudo-"namespacing" localStorage for a given test
 * by generating and using a unique prefix for keys. Why trounce on other
 * tests' localStorage items when you can keep it "separated"?
 *
 * PrefixedLocalStorageTest: Instantiate in testharness.js tests to generate
 *   a new unique-ish prefix
 * PrefixedLocalStorageResource: Instantiate in supporting test resource
 *   files to use/share a prefix generated by a test.
 */
var PrefixedLocalStorage = function () {
  this.prefix = ''; // Prefix for localStorage keys
  this.param = 'prefixedLocalStorage'; // Param to use in querystrings
};

PrefixedLocalStorage.prototype.clear = function () {
  if (this.prefix === '') { return; }
  Object.keys(localStorage).forEach(sKey => {
    if (sKey.indexOf(this.prefix) === 0) {
      localStorage.removeItem(sKey);
    }
  });
};

/**
 * Append/replace prefix parameter and value in URI querystring
 * Use to generate URLs to resource files that will share the prefix.
 */
PrefixedLocalStorage.prototype.url = function (uri) {
  function updateUrlParameter (uri, key, value) {
    var i         = uri.indexOf('#');
    var hash      = (i === -1) ? '' : uri.substr(i);
    uri           = (i === -1) ? uri : uri.substr(0, i);
    var re        = new RegExp(`([?&])${key}=.*?(&|$)`, 'i');
    var separator = uri.indexOf('?') !== -1 ? '&' : '?';
    uri = (uri.match(re)) ? uri.replace(re, `$1${key}=${value}$2`) :
      `${uri}${separator}${key}=${value}`;
    return uri + hash;
  }
  return updateUrlParameter(uri, this.param, this.prefix);
};

PrefixedLocalStorage.prototype.prefixedKey = function (baseKey) {
  return `${this.prefix}${baseKey}`;
};

PrefixedLocalStorage.prototype.setItem = function (baseKey, value) {
  localStorage.setItem(this.prefixedKey(baseKey), value);
};

PrefixedLocalStorage.prototype.removeItem = function (baseKey) {
  localStorage.removeItem(this.prefixedKey(baseKey));
};

PrefixedLocalStorage.prototype.getItem = function (baseKey) {
  return localStorage.getItem(this.prefixedKey(baseKey));
};

PrefixedLocalStorage.prototype.pushItem = function (baseKey, value) {
  let index = this.getItem(baseKey);
  if (!index) { index = 0; } else { index = parseInt(index); }
  this.setItem(baseKey + '.' + index, JSON.stringify(value));
  this.setItem(baseKey, (index + 1));
};

PrefixedLocalStorage.prototype.getPushedItems = function (baseKey, startIndex) {
  let index = this.getItem(baseKey);
  if (!index) { index = 0; }
  if (!startIndex) { startIndex = 0; }
  const array = [];
  for (let i = startIndex; i < index; ++i) {
    const value = JSON.parse(this.getItem(baseKey + '.' + i));
    array.push(value);
  }
  return array;
};

/**
 * Listen for `storage` events pertaining to a particular key,
 * prefixed with this object's prefix. Ignore when value is being set to null
 * (i.e. removeItem).
 */
PrefixedLocalStorage.prototype.onSet = function (baseKey, fn) {
  window.addEventListener('storage', e => {
    var match = this.prefixedKey(baseKey);
    if (e.newValue !== null && e.key.indexOf(match) === 0) {
      fn.call(this, e);
    }
  });
};

/*****************************************************************************
 * Use in a testharnessjs test to generate a new key prefix.
 * async_test(t => {
 *   var prefixedStorage = new PrefixedLocalStorageTest();
 *   t.add_cleanup(() => prefixedStorage.cleanup());
 *   /...
 * });
 */
var PrefixedLocalStorageTest = function () {
  PrefixedLocalStorage.call(this);
  this.prefix = `${document.location.pathname}-${Math.random()}-${Date.now()}-`;
};
PrefixedLocalStorageTest.prototype = Object.create(PrefixedLocalStorage.prototype);
PrefixedLocalStorageTest.prototype.constructor = PrefixedLocalStorageTest;

/**
 * Use in a cleanup function to clear out prefixed entries in localStorage
 */
PrefixedLocalStorageTest.prototype.cleanup = function () {
  this.setItem('closeAll', 'true');
  this.clear();
};

/*****************************************************************************
 * Use in test resource files to share a prefix generated by a
 * PrefixedLocalStorageTest. Will look in URL querystring for prefix.
 * Setting `close_on_cleanup` opt truthy will make this script's window listen
 * for storage `closeAll` event from controlling test and close itself.
 *
 * var PrefixedLocalStorageResource({ close_on_cleanup: true });
 */
var PrefixedLocalStorageResource = function (options) {
  PrefixedLocalStorage.call(this);
  this.options = Object.assign({}, {
    close_on_cleanup: false
  }, options || {});
  // Check URL querystring for prefix to use
  var regex = new RegExp(`[?&]${this.param}(=([^&#]*)|&|#|$)`),
    results = regex.exec(document.location.href);
  if (results && results[2]) {
    this.prefix = results[2];
  }
  // Optionally have this window close itself when the PrefixedLocalStorageTest
  // sets a `closeAll` item.
  if (this.options.close_on_cleanup) {
    this.onSet('closeAll', () => {
      window.close();
    });
  }
};
PrefixedLocalStorageResource.prototype = Object.create(PrefixedLocalStorage.prototype);
PrefixedLocalStorageResource.prototype.constructor = PrefixedLocalStorageResource;
