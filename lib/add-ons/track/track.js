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

    /**
     * Emite un evento de seguimiento.
     * @param {string} event Nombre de evento especificado.
     * @param {Object|View} [params] Parámetros adicionales o referencia a una vista para el evento 'open_view'.
     */
    uix.track = function(event, params) {
        if (event === 'open_view' && params instanceof View) {
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
            if (event === 'open_view') {
                if (params.view_path.length > 100) {
                    params.view_path = params.view_path.substr(0, 99) + '…';
                }
                firebase.analytics.setCurrentScreen(params.view_path);
            } else {
                firebase.analytics.logEvent(event, params);
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