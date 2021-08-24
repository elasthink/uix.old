/*
 * Almacenamiento persistente de información simple de tipo clave/valor como preferencias, ajustes de configuración,
 * datos de sesión, etc. No emplear para almacenar información más compleja ni cachear datos cargados.
 * Se usa en primera instancia el plugin de Cordova NativeStorage:
 * @see {https://github.com/TheCocoaProject/cordova-plugin-nativestorage}.
 * Si no se encuentra dicho plugin se usa el API Web estándar para almacenamiento local de datos:
 * @see {https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API}
 * @file store.js
 * @author angel.teran
 */
(function() {

    // Private ---------------------------------------------------------------------------------------------------------
    /**
     * Crea una función de retorno intermedia personalizando el mensaje en caso de error.
     * @param {string} msg Mensaje de error especificado.
     * @param {Function} [callback] Función de retorno especificada.
     * @return {Function} Función de retorno intermedia creada.
     * @private
     */
    function _callback(msg, callback) {
        return function (err, value) {
            if (err) {
                _log(msg + ': ' + JSON.stringify(err));
            }
            if (callback) {
                callback(err, value);
            }
        };
    }

    /**
     * Escribe un mensaje por consola.
     * @param {string} msg Mensaje a escribir.
     * @private
     */
    function _log(msg) {
        console.log('[uix.store] ' + msg);
    }

    // Interface -------------------------------------------------------------------------------------------------------
    /**
     * Interfaz pública.
     * @namespace
     */
    uix.store = {

        /**
         * Devuelve el valor almacenado para la clave especificada.
         * @param {string} key Clave especificada.
         * @param {function(err: ?Error, value: ?*=)} callback Función de retorno.
         */
        get: function(key, callback) {
            var cb = _callback('Unable to recover the key "' + key + '"', callback);
            if (window.NativeStorage) {
                window.NativeStorage.getItem(key, function(value) {
                    cb(null, value);
                }, function(err) {
                    cb((err.code === 2) ? null : err, null);
                });
            } else {
                try {
                    cb(null, window.localStorage.getItem(key));
                } catch (err) {
                    cb(err);
                }
            }
        },

        /**
         * Guarda un nuevo valor asociado a la clave especificada.
         * @param {string} key Clave especificada.
         * @param {*} value Valor especificado.
         * @param {function(err: ?Error)} [callback] Función de retorno.
         */
        put: function(key, value, callback) {
            var cb = _callback('Unable to store the key "' + key + '"', callback);
            if (window.NativeStorage) {
                window.NativeStorage.setItem(key, value, function() {
                    cb(null);
                }, function(err) {
                    cb(err, null);
                });
            } else {
                try {
                    window.localStorage.setItem(key, value);
                    cb(null);
                } catch (err) {
                    cb(err);
                }
            }
        },

        /**
         * Elimina el valor asociado a la clave especificada.
         * @param {string} key Clave especificada.
         * @param {function(err: ?Error)} [callback] Función de retorno.
         */
        remove: function(key, callback) {
            var cb = _callback('Unable to remove the key "' + key + '"', callback);
            if (window.NativeStorage) {
                window.NativeStorage.remove(key, function() {
                    cb(null);
                }, function(err) {
                    cb(err);
                });
            } else {
                try {
                    window.localStorage.removeItem(key);
                    cb(null);
                } catch (err) {
                    cb(err);
                }
            }
        },

        /**
         * Vacía el almacenamiento al completo.
         * @param {function(err: ?Error)} [callback] Función de retorno.
         */
        clear: function(callback) {
            var cb = _callback('Unable to clear the storage', callback);
            if (window.NativeStorage) {
                window.NativeStorage.clear(function() {
                    cb(null);
                }, function(err) {
                    cb(err);
                });
            } else {
                try {
                    window.localStorage.clear();
                    cb(null);
                } catch (err) {
                    cb(err);
                }
            }
        }
    };
})();