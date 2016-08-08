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
 * Añade las propiedades de los objetos especificados en el primero.
 * @param {...Object} Objetos especificados.
 * @returns {Object} El primer objeto especificado donde se han añadido las propiedades del resto de objetos.
 */
Object.extend = function(obj) {
    obj = obj || {};
    for (var i = 1; i < arguments.length; i++) {
        if (!arguments[i]) {
            continue;
        }
        for (var key in arguments[i]) {
            if (arguments[i].hasOwnProperty(key)) {
                obj[key] = arguments[i][key];
                /* En profundidad:
                 if (typeof(arguments[i][key]) === 'object') {
                 obj1[key] = Object.extend(obj1[key], arguments[i][key]);
                 } else {
                 obj[key] = arguments[i][key];
                 }
                 */
            }
        }
    }
    return obj;
};
