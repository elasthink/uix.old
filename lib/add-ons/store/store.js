/*
 * @file store.js
 * @author angel.teran
 */
(function() {
    /**
     *
     * @type {{database: string, store: string}}
     * @private
     */
    var _conf = {
        database: 'uix_store_db',
        store: 'uix_store'
    };

    /**
     *
     * @type {null}
     * @private
     */
    var _idb;


    /**
     *
     * @type {{}}
     * @private
     */
    var _cache = {};

    /**
     *
     * @type {Array}
     * @private
     */
    var _listeners = [];

    // Private functions -----------------------------------------------------------------------------------------------
    /**
     * ...
     */
    function _init() {
        if (window.indexedDB) {
            var req = indexedDB.open(_conf.database, 1);
            req.onupgradeneeded = function(e) {
                var idb = e.target.result;
                if (!idb.objectStoreNames.contains(_conf.store)) {
                    idb.createObjectStore(_conf.store);
                }
            };
            req.onsuccess = function(e) {
                _read(e.target.result);
            };
            req.onerror = function(e) {
                _log('Error opening database: ' + e.target.errorCode);
                _read();
            };
        } else {
            _read();
        }
    }

    /**
     * ...
     */
    function _read(idb) {
        if (idb) {
            // IndexedDB
            var trans = idb.transaction([_conf.store], 'readonly'),
                store = trans.objectStore(_conf.store);
            store.openCursor().onsuccess = function(event) {
                var result = event.target.result;
                if (result) {
                    _cache[result.key] = result.value;
                    result.continue();
                } else {
                    _ready(idb);
                }
            };

        } else {
            // LocalStorage
            for (var i = 0, key; i < localStorage.length; i++) {
                key = localStorage.key(i);
                _cache[key] = localStorage.getItem(key);
            }
            _ready(null);
        }
    }

    function _ready(idb) {
        _idb = idb;
        for (var i = 0; i < _listeners.length; i++) {
            _listeners[i]();
        }
    }

    /**
     *
     * @param msg
     */
    function _log(msg) {
        console.log('[uix.store] ' + msg);
    }

    // Initialization
    uix.ready(function() {
        _init();
    });

    // Interface -------------------------------------------------------------------------------------------------------
    /**
     * ...
     */
    uix.store = {

        /**
         *
         */
        ready: function(callback) {
            if (_idb === undefined) {
                _listeners.push(callback);
                return false;
            }
            if (callback) {
                callback();
            }
            return true;
        },

        /**
         *
         * @param key
         */
        get: function(key) {
            if (_idb === undefined) {
                throw new Error('Storage not ready');
            }
            return _cache[key];
        },

        /**
         *
         * @param key
         * @param value
         */
        put: function(key, value) {
            if (_idb === undefined) {
                throw new Error('Storage not ready');
            }
            _cache[key] = value;
            if (_idb) {
                var trans = _idb.transaction([_conf.store], 'readwrite'),
                    store = trans.objectStore(_conf.store),
                    req = store.put(value, key);
                req.onerror = function(e) {
                    _log('Unable to save \"' + key + '": ' + e.target.error);
                };
            } else {
                localStorage.setItem(key, value);
            }
        },

        /**
         *
         * @param key
         */
        remove: function(key) {
            if (_idb === undefined) {
                throw new Error('Storage not ready');
            }
            delete _cache[key];
            if (_idb) {
                var trans = _idb.transaction([_conf.store], 'readwrite'),
                    store = trans.objectStore(_conf.store),
                    req = store.delete(key);
                req.onerror = function(e) {
                    _log('Unable to delete "' + key + '": ' + e.target.error);
                };
            } else {
                localStorage.removeItem(key);
            }
        }
    };
})();