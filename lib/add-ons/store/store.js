/*
 * Almacenamiento temporal de información recuperable, como preferencias, configuración, datos de sesión, etc.
 * No emplear para almacenar información más compleja ni cachear datos cargados.
 * @file store.js
 * @author angel.teran
 */
(function() {

    /**
     * Configuración por defecto: nombre de la base de datos y del almacen de datos.
     * @type {{database: string, store: string}}
     * @private
     * @const
     */
    var _conf = {
        database    : 'uix_store_db',
        store       : 'uix_store'
    };

    /**
     * Referencia a la base de datos o valor nulo.
     * NOTE: Durante la inicialización y lectura inicial de datos almacenados mantiene el valor 'undefined'. Una vez
     * inicializado el almacenamiento pasaría a contener la referencia a la base de datos (IDBDatabase). Si IndexedDB no
     * está disponible o hay algún error en la inicialización se le asigna un valor nulo lo que indica el uso de
     * LocalStorage como alternativa a IndexedDB.
     * @type {?IDBDatabase}
     * @private
     */
    var _db;


    /**
     * Datos cacheados en memoria.
     * @type {Object.<string, *>}
     * @private
     */
    var _cache = {};

    /**
     * Funciones a las que llamar cuando el almacenamiento esté preparado.
     * @type {function[]}
     * @private
     */
    var _listeners = [];

    // Private functions -----------------------------------------------------------------------------------------------
    /**
     * Función de inicialización.
     */
    function _init() {
        if (window.indexedDB) {
            var req = indexedDB.open(_conf.database, 1);
            req.onupgradeneeded = function(e) {
                var db = e.target.result;
                if (!db.objectStoreNames.contains(_conf.store)) {
                    db.createObjectStore(_conf.store);
                }
            };
            req.onsuccess = function(e) {
                _load(e.target.result);
            };
            req.onerror = function(e) {
                _log('Unable to open database "' + _conf.database + '": ' + e.target.errorCode + ', using localStorage instead.');
                _load();
            };
        } else {
            _log('IndexedDB not available, using localStorage instead.');
            _load();
        }
    }

    /**
     * Carga inicial de datos almacenados.
     * @param {IDBDatabase} [db] Referencia a la base de datos. Si es nulo se usa el localStorage en su lugar.
     */
    function _load(db) {
        if (db) {
            // IndexedDB
            var trans = db.transaction([_conf.store], 'readonly'),
                store = trans.objectStore(_conf.store),
                cursor = store.openCursor();
            cursor.onsuccess = function(e) {
                var result = e.target.result;
                if (result) {
                    _cache[result.key] = result.value;
                    result.continue();
                } else {
                    _ready(db);
                }
            };
            cursor.onerror = function(e) {
                _log('Unable to load store "' + _conf.store + '": ' + e.target.errorCode + ', using localStorage instead.');
                _load();
            };
        } else {
            for (var i = 0, key; i < localStorage.length; i++) {
                key = localStorage.key(i);
                _cache[key] = localStorage.getItem(key);
            }
            _ready(null);
        }
    }

    /**
     * Guarda la referencia a la base de datos y notifica a los listeners añadidos que el almacenamiento ya está listo.
     * @param {IDBDatabase} [db] Referencia a la base de datos.
     * @private
     */
    function _ready(db) {
        _log('Store is ready (' + (db ? 'indexed' : 'local') + ')');
        _db = db;
        for (var i = 0; i < _listeners.length; i++) {
            _listeners[i]();
        }
    }

    /**
     * Escribe un mensaje por consola.
     * @param {string} msg Mensaje a escribir.
     * @private
     */
    function _log(msg) {
        console.log('[uix.store] ' + msg);
    }

    // Initialization --------------------------------------------------------------------------------------------------
    uix.ready(function() {
        _init();
    });

    // Interface -------------------------------------------------------------------------------------------------------
    /**
     * Interfaz pública.
     * @namespace
     */
    uix.store = {

        /**
         * Función que indica cuando el almacenamiento está listo para usarse.
         * @param {function} callback Función de retorno que se llama inmediatamente si el almacenamiento está listo o
         * que se llamará posteriormente cuando concluya la inicialización.
         * @return {boolean} Devuelve verdadero cuando el almacenamiento ya esté listo o falso en caso contrario.
         */
        ready: function(callback) {
            if (_db === undefined) {
                _listeners.push(callback);
                return false;
            }
            if (callback) {
                callback();
            }
            return true;
        },

        /**
         * Devuelve el valor almacenado para la clave especificada.
         * @param {string} key Clave especificada.
         */
        get: function(key) {
            // NOTE: Asegurarse de que el almacenamiento está listo para usarse antes de llamar a esta función.
            // if (_db === undefined) throw new Error('Storage not ready');
            return _cache[key];
        },

        /**
         * Guarda un nuevo valor asociado a la clave especificada.
         * @param {string} key Clave especificada.
         * @param {*} value Valor especificado.
         */
        put: function(key, value) {
            // NOTE: Asegurarse de que el almacenamiento está listo para usarse antes de llamar a esta función.
            // if (_db === undefined) throw new Error('Storage not ready');
            _cache[key] = value;
            if (_db) {
                var trans = _db.transaction([_conf.store], 'readwrite'),
                    store = trans.objectStore(_conf.store),
                    req = store.put(value, key);
                req.onerror = function(e) {
                    _log('Unable to put key "' + key + '": ' + e.target.errorCode);
                };
            } else {
                localStorage.setItem(key, value);
            }
        },

        /**
         * Elimina el valor asociado a la clave especificada.
         * @param {string} key Clave especificada.
         */
        remove: function(key) {
            // NOTE: Asegurarse de que el almacenamiento está listo para usarse antes de llamar a esta función.
            // if (_db === undefined) throw new Error('Storage not ready');
            delete _cache[key];
            if (_db) {
                var trans = _db.transaction([_conf.store], 'readwrite'),
                    store = trans.objectStore(_conf.store),
                    req = store.delete(key);
                req.onerror = function(e) {
                    _log('Unable to delete key "' + key + '": ' + e.target.errorCode);
                };
            } else {
                localStorage.removeItem(key);
            }
        },

        /**
         * Vacía el almacenamiento al completo
         */
        clear: function() {
            // NOTE: Asegurarse de que el almacenamiento está listo para usarse antes de llamar a esta función.
            // if (_db === undefined) throw new Error('Storage not ready');
            _cache = {};
            if (_db) {
                var trans = _db.transaction([_conf.store], 'readwrite'),
                    store = trans.objectStore(_conf.store),
                    req = store.clear();
                req.onerror = function(e) {
                    _log('Unable to clear store "' + _conf.store + '": ' + e.target.errorCode);
                };
            } else {
                localStorage.clear();
            }
        }
    };
})();