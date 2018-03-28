/*
 * @file share.js
 * @author angel.teran
 */
(function() {

    /**
     * Crea un nuevo objeto para crear y compartir enlaces.
     * @param {Object} properties Propiedades a incluir en el enlace.
     */
    uix.share = function(properties) {
        return new uix.share.ShareObj(properties);
    };

    /**
     * Interfaz de control para crear y compartir un enlace.
     * @param {Object} properties Propiedades a incluir en la creación del enlace.
     * @class ShareObj
     * @constructor
     */
    uix.share.ShareObj = function(properties) {

        if (typeof Branch !== 'undefined') {
            /**
             * Objeto Universal de Branch (BUO) mediante el cual se generan los enlaces.
             * @see {@link https://blog.branch.io/branch-concepts-the-branch-universal-object/}
             * @see {@link https://blog.branch.io/branch-universal-object-for-deep-linking-and-indexing/}
             * @type {BranchUniversalObject}
             * @private
             */
            this._buo;

            /**
             * Posible error de creación del BUO.
             * @type {*}
             * @private
             */
            this._error;

            /**
             * Funciones en espera de que se complete la creación del BUO.
             * @type {function[]}
             * @private
             */
            this._listeners = [];

            // ---------------------------------------------------------------------------------------------------------
            // Notifica el final de la creación del BUO, con o sin error.
            var notify = function(err) {
                if (this._listeners.length > 0) {
                    for (var i = 0; i < this._listeners.length; i++) {
                        this._listeners[i](err);
                    }
                    this._listeners.length = 0;
                }
            }.bind(this);
            // console.log('[Branch] Creating BUO...');
            Branch.createBranchUniversalObject(properties).then(function(obj) {
                // console.log('[Branch] BUO created: ' + JSON.stringify(obj));
                this._buo = obj;
                notify();
            }.bind(this)).catch(function(err) {
                console.log('[Branch] Error: ' + JSON.stringify(err));
                notify(this._error = err);
            }.bind(this));
        }
    };

    /**
     * Genera un nuevo enlace con los datos especificados.
     * @param {Object} data Datos a incluir en la generación del enlace.
     * @param {function(err: ?Object, url: ?String=)} callback Función de retorno recibe la URL del enlace generado.
     */
    uix.share.ShareObj.prototype.link = function(data, callback) {
        if (typeof Branch !== 'undefined') {
            if (this._buo) {
                this._buo.generateShortUrl({}, data).then(function (res) {
                    // console.log('[Branch] Short URL: ' + JSON.stringify(res.url))
                    callback(null, res.url);
                }).catch(function(err) {
                    console.log('[Branch] Error: ' + JSON.stringify(err));
                    callback(err);
                });
            } else if (this._error) {
                callback(this._error);
            } else {
                this._listeners.push(function (err) {
                    if (err) {
                        callback(err);
                    } else {
                        this.link(data, callback);
                    }
                }.bind(this));
            }
        } else {
            // TODO: Integrar e implementar Branch para web.
            callback(null, window.location.href);
        }
    };

})();