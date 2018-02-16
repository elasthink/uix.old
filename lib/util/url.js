/**
 * Funciones de utilidad para manejo de URLs.
 * @namespace
 */
var URL = {

    /**
     * Expresión regular para validar y parsear URLs según la norma RFC3986.
     * @see {@link https://tools.ietf.org/html/rfc3986#page-50}
     * @const
     */
    REGEXP: /^(([^:\/?#]+):)?(\/\/([^\/?#]*))?(([^?#]*)(\?([^#]*))?(#(.*))?)/,

    /**
     * Parsea la URL especificada extrayendo cada una de sus partes.
     * @param {string} url URL especificada.
     * @return {{scheme: string, authority: string, path: string, query: string, fragment: string}} Devuelve un objeto
     * con las partes extraídas.
     * @see {@link https://tools.ietf.org/html/rfc3986}
     */
    parse: function(url) {
        var parts = {},
            match = url.match(this.REGEXP);
        if (match) {
            if (match[2] !== undefined) {
                parts.scheme = match[2];
            }
            if (match[4] !== undefined) {
                parts.authority = match[4];
            }
            if (match[6] !== undefined) {
                parts.path = match[6];
            }
            if (match[8] !== undefined) {
                parts.query = match[8];
            }
            if (match[10] !== undefined) {
                parts.fragment = match[10];
            }
        }
        return parts;
    },

    /**
     * Analiza la URL especificada y devuelve un objeto con cada una de sus partes.
     * @see https://tools.ietf.org/html/rfc3986
     * @param {string} url URL especificada.
     * @return {{pathname: string, search: string, query: Object, hash: string}} Partes extraídas de la URL especificada.
     */
    parse2: function(url) {
        var parts = {};
        var match = url.match(new RegExp(URL.URI_REFERENCE));
        if (match) {
            // scheme
            if (match[1] !== undefined) {
                parts.scheme = match[1];
            }
            // authority
            if (match[2] !== undefined) {
                parts.authority = match[2];
            } else if (match[10] !== undefined) {
                parts.authority = match[10];
            }
            // userinfo
            if (match[3] !== undefined) {
                parts.userinfo = match[3];
            } else if (match[11] !== undefined) {
                parts.userinfo = match[11];
            }
            // host
            if (match[4] !== undefined) {
                parts.host = match[4];
            } else if (match[12] !== undefined) {
                parts.host = match[12];
            }
            // port
            if (match[5] !== undefined) {
                parts.port = match[5];
            } else if (match[13] !== undefined) {
                parts.port = match[13];
            }
            // path
            if (match[6] !== undefined) {
                parts.path = match[6];
            } else if (match[7] !== undefined) {
                parts.path = match[7];
            } else if (match[14] !== undefined) {
                parts.path = match[14];
            } else if (match[15] !== undefined) {
                parts.path = match[15];
            }
            // query
            if (match[8] !== undefined) {
                parts.query = match[8];
            } else if (match[16] !== undefined) {
                parts.query = match[16];
            }
            // fragment
            if (match[9] !== undefined) {
                parts.fragment = match[9];
            } else if (match[17] !== undefined) {
                parts.fragment = match[17];
            }
        }
        return parts;
    },

    /**
     * Analiza la cadena de parámetros de consulta (query) especificada y devuelve un objeto de claves y valores.
     * @param {string} Cadena de parámetros especificada.
     * @return {Object} Objeto de claves y valores resultante.
     */
    parseQuery: function(query) {
        if (/^\?/.test(query)) {
            query = query.substr(1);
        }
        var q = {}, s = query.split('&');
        var decode = function(str) {
            return decodeURIComponent(str.replace(/\+/g, '%20'));
        };
        for (var i = 0, p, k, v; i < s.length; i++) {
            p = s[i].split('=');
            k = decode(p[0]);
            v = (p.length > 1) ? decode(p[1]) : ''
            if (q[k] === undefined) {
                q[k] = v;
            } else {
                if (Array.isArray(q[k])) {
                    q[k].push(v);
                } else {
                    q[k] = [q[k], v];
                }
            }
        }
        return q;
    },

    /**
     * Formatea la ruta especificada en partes.
     * @param {Object} parts Partes de la ruta a formatear.
     * @return {string} Cadena formateada.
     */
    format: function(parts) {
        var url = '';
        if (parts.scheme) {
            url += parts.scheme + '://';
        }
        if (parts.authority) {
            url += parts.authority;
        } else if (parts.host) {
            if (parts.userinfo) {
                url += parts.userinfo + '@';
            }
            url += parts.host;
            if (parts.port) {
                url += ':' + parts.port;
            }
        }
        url += parts.path;
        if (parts.query) {
            // TODO: Podríamos distinguir el caso de cadena de un objeto con los parámetros estructurados.
            url += '?' + parts.query;
        }
        if (parts.fragment) {
            url += '#' + parts.fragment;
        }
        return url;
    },

    /**
     * Formatea las claves y valores del objeto especificado como una cadena de parámetros de consulta (query).
     * @param {Object} data Objeto de datos especificado.
     * @return {string} Cadena formateada.
     */
    formatQuery: function(data) {
        var params = [];
        for (var name in data) {
            if (data.hasOwnProperty(name) && data[name] !== null) {
                params.push(encodeURIComponent(name) + '=' + encodeURIComponent(data[name]));
            }
        }
        return params.join('&').replace(/%20/g, '+');
    },

    /**
     * Resuelve la ruta especificada con repecto a una ruta base.
     * @param {string} relative Ruta relativa especificada.
     * @param {string} base Ruta base especificada.
     * @return {string} Ruta resultante.
     */
    resolve: function(relative, base) {
        // Absolute
        if (/^[^:/?#]+:\/\//.test(relative)) {
            return relative;
        }
        // Protocol relative
        if (/^\/\//.test(relative)) {
            var match = /^[^:/?#]+:/.exec(base);
            return (match ? match[0] : '') + relative;
        }
        // Relative to the root
        if (/^\//.test(relative)) {
            var match = /^([^:/?#]+:)?\/\/[^/?#]+/.exec(base);
            return (match ? match[0] : '') + relative;
        }
        // Base parts
        // var base = /^([^?#]*)((?:\?[^#]*)?)(#.*)?/.exec(base);

        // Relative to the parent directory
        if (/^\.\.\//.test(relative)) {
            var match = /^[^?#]*/.exec(base);
            return this.resolve(relative.slice(3), match[0].replace(/\/[^/]*$/, ''));
        }
        // Query
        if (/^\?/.test(relative)) {
            var match = /^[^?#]*/.exec(base);
            return match[0] + relative;
        }
        // Fragment
        if (/^#/.test(relative)) {
            var match = /^[^#]*/.exec(base);
            return match[0] + relative;
        }
        // Relative to the current directory
        var match = /^[^?#]*/.exec(base);
        return match[0].replace(/\/[^/]*$/, '') + '/' + relative.replace(/^\.\//, '');
    },

    /**
     * Resuelve la URL especificada con repecto a la localización actual.
     * @param {string} url URL especificada.
     * @return {string} URL resultante.
     */
    qualify: function(url) {
        if (document) {
            var a = document.createElement('a');
            a.href = url;
            url = a.href;
        }
        return url;
    },

    /**
     * Recorta la URL especificada a partir de la ruta, incluyendo parámetros y fragmento.
     * @param {string} url URL especificada.
     * @return {string} URL resultante.
     */
    trunc: function(url) {
        var match = url.match(this.REGEXP);
        return (match && match[5] !== undefined) ? match[5] : '';
    }
};



// =====================================================================================================================
// CommonJS
// ---------------------------------------------------------------------------------------------------------------------
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = URL;
}
// =====================================================================================================================