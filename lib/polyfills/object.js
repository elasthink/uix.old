/**
 * Devuelve un nuevo objeto filtrando las propiedades del objeto especificado, bien mediante una función a la que se le
 * pasa la clave y valor de cada propiedad o bien especificando un array de claves a incluir en el nuevo objeto.
 * @param {Object} obj Objeto especificado.
 * @param {(function|string[])} callback Función para comprobar si incluir cada una de las propiedad o un array con las
 * claves a incluir.
 * @returns {Object|null} El objeto resultante o null si no se especifica correctamente el parámetro callback.
 */
Object.filter = function (obj, callback) {
    if (typeof(callback) === 'array') {
        var keys = callback;
        callback = function(key, value) {
            return (keys.indexOf(key) !== -1);
        };
    } else if (typeof(callback) !== 'function') {
        return null;
    }
    var result = {};
    for (var key in obj) {
        if (obj.hasOwnProperty(key) && callback(key, obj[key])) {
            result[key] = obj[key];
        }
    }
    return result;
};

/**
 * Añade las propiedades de los objetos especificados como argumentos al primero.
 * @param {boolean} [deep] Opcionalmente indica si añadir las propiedades en profundidad cuando las propiedades existan
 * y sean objetos no nulos.
 * @param {Object} obj Objeto destino donde añadir las propiedades.
 * @param {...Object} Objetos especificados cuyas propiedades serán añadidas al primero.
 * @returns {Object} Objeto destino especificado.
 */
Object.extend = function(obj) {
    var deep = false, si = 1;
    if (typeof obj === 'boolean' && arguments.length > 1) {
        deep = obj;
        obj = arguments[1];
        s = 2;
    }
    obj = obj || {};
    for (var i = si; i < arguments.length; i++) {
        if (!arguments[i]) {
            continue;
        }
        for (var key in arguments[i]) {
            if (arguments[i].hasOwnProperty(key)) {
                if (deep && typeof arguments[i][key] === 'object' && typeof obj[key] === 'object' && obj[key] !== null) {
                    Object.extend(obj[key], arguments[i][key]);
                } else {
                    obj[key] = arguments[i][key];
                }
            }
        }
    }
    return obj;
};

/**
 * Determina si el objeto especificado es igual.
 * @param {...Object} Objetos especificados.
 * @returns {Object} El primer objeto especificado donde se han añadido las propiedades del resto de objetos.
 */
Object.prototype.equals = function(obj) {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
        return false;
    }
    var name;
    for (name in this) {
        if (this.hasOwnProperty(name) && (
                !obj.hasOwnProperty(name) ||
                typeof this[name] !== typeof obj[name] ||
                typeof this[name] === 'object' && this[name] !== null && !this[name].equals(obj[name]) ||
                this[name] !== obj[name])) {
            return false;
        }
    }
    for (name in obj) {
        if (obj.hasOwnProperty(name) && !this.hasOwnProperty(name)) {
            return false;
        }
    }
    return true;
};

Object.defineProperty(Object.prototype, 'equals', { enumerable: false });

/**
 * ...
 */
Object.setPrototypeOf = Object.setPrototypeOf || function(obj, proto) {
    obj.__proto__ = proto;
    return obj;
};
