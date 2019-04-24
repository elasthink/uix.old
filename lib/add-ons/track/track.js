/*
 * @file track.js
 * @author angel.teran
 */
(function() {
    /**
     * Referencia al plugin de Firebase.
     * @type {Object}
     */
    var firebase = window.cordova && window.cordova.plugins.firebase;

    // TODO: Si no estamos en Cordova o no está el plugin podríamos desde aquí realizar la carga de la librería de Analytics (gtag.js)

    /**
     * Acorta la cadena o el valor de las propiedades del objeto especificado a un número determinado de caracteres.
     * @param {string|Object} value Cadena valor u objeto de parámetros especificado.
     * @return {string|Object} Devuelve la cadena resultante o un nuevo objeto con el valor modificado de las
     * propiedades del objeto original especificado.
     */
    var trunc = function(value) {
        if (typeof value === 'undefined' || value === null) {
            return value;
        }
        if (typeof value === 'object') {
            var obj = {};
            for (var key in value) {
                if (value.hasOwnProperty(key)) {
                    obj[key] = trunc(value[key]);
                }
            }
            return obj;
        }
        if (typeof value === 'string' && value.length > 100) {
            return value.substr(0, 99) + '…';
        }
        return value;
    };

    /**
     * Emite un evento de seguimiento.
     * @param {string} event Nombre de evento especificado.
     * @param {Object|View} [params] Parámetros adicionales o referencia a una vista para el evento 'view_open'.
     */
    uix.track = function(event, params) {
        if (event === 'view_open' && params instanceof View) {
            var view = params;
            if (!view.trackPath) {
                return;
            }
            params = {
                view_path: (typeof view.trackPath === 'function') ? view.trackPath.call() : view.trackPath,
                view_location: location.pathname + location.search + location.hash
            };
        }
        if (firebase) {
            if (event === 'view_open') {
                firebase.analytics.setCurrentScreen(trunc(params.view_path));
            } else {
                firebase.analytics.logEvent(event, trunc(params));
            }
        } else {
            // TODO: Implementar con gtag.js...
            console.log('track("' + event + '", ' + (params && JSON.stringify(params)) + ')');
        }
    };

    /**
     * Establece el identificador de usuario especificado.
     * @param {string} userId Identificador de usuario.
     */
    uix.track.setUserId = function(userId) {
        if (firebase) {
            firebase.analytics.setUserId(userId);
        } else {
            // TODO: Implementar con gtag.js...
            console.log('setUserId("' + userId + '")');
        }
    };

})();