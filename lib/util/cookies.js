/**
 * Funciones para manejo de cookies en cliente.
 * @namespace
 */
var Cookies = {
    /**
     * Crea una nueva cookie, con el nombre, valor y duración en días especificado.
     * @param {string} name Nombre de la cookie.
     * @param {string} value Valor de la cookie.
     * @param {number} days Duración en días.
     * @return {boolean} Devuelve verdadero si se añade la cookie o falso en caso contrario.
     */
    set: function(name, value, days) {
        if (!name || /^(?:expires|max\-age|path|domain|secure)$/i.test(name)) {
            return false;
        }
        document.cookie = encodeURIComponent(name) + '=' + encodeURIComponent(value) +
            '; expires=' + (new Date(Date.now() + (days * 24 * 60 * 60 * 1000))).toUTCString();
        return true;
    },

    /**
     * Devuelve el valor de la cookie con el nombre especificado.
     * @param {string} name Nombre de cookie.
     * @return {?string} Devuelve el valor de la cookie o nulo si no se encuentra.
     */
    get: function(name) {
        if (!name) {
            return null;
        }
        return decodeURIComponent(document.cookie.replace(new RegExp('(?:(?:^|.*;)\\s*' +
                encodeURIComponent(name).replace(/[\-\.\+\*]/g, '\\$&') + '\\s*\\=\\s*([^;]*).*$)|^.*$'), '$1')) || null;
    },

    /**
     * Elimina la cookie con el nombre especificado.
     * @param {string} name Nombre de la cookie a eliminar.
     * @return {boolean} Devuelve verdadero si se elimina la cookie o falso en caso contrario.
     */
    remove: function(name) {
        if (!this.exists(name)) {
            return false;
        }
        document.cookie = encodeURIComponent(name) + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        return true;
    },

    /**
     * Comprueba si la cookie con el nombre especificado existe.
     * @param {string} name Nombre de la cookie.
     * @return {boolean} Devuelve verdadero si existe o falso en caso contrario.
     */
    exists: function(name) {
        if (!name) {
            return false;
        }
        return (new RegExp('(?:^|;\\s*)' + encodeURIComponent(name).replace(/[\-\.\+\*]/g, '\\$&') + '\\s*\\=')).test(document.cookie);
    }
};