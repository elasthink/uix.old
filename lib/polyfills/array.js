if (!Array.prototype.includes) {
    Array.prototype.includes = function(searchElement/*, fromIndex*/) {
        'use strict';
        var O = Object(this);
        var len = parseInt(O.length) || 0;
        if (len === 0) {
            return false;
        }
        var n = parseInt(arguments[1]) || 0;
        var k;
        if (n >= 0) {
            k = n;
        } else {
            k = len + n;
            if (k < 0) {k = 0;}
        }
        var currentElement;
        while (k < len) {
            currentElement = O[k];
            if (searchElement === currentElement ||
                (searchElement !== searchElement && currentElement !== currentElement)) {
                return true;
            }
            k++;
        }
        return false;
    };
}

/**
 * Compara el array con el array especificado.
 * @param {[]} array Array especificado.
 * @return {boolean} Devuelve true si los arrays son iguales.
 */
Array.prototype.equals = function(arr) {
    if (!Array.isArray(arr)) {
        return false;
    }
    if (this.length != arr.length) {
        return false;
    }
    for (var i = 0; i < this.length; i++) {
        if (typeof this[i] !== typeof obj[i] ||
                typeof this[i] === 'object' && this[i] !== null && !this[i].equals(arr[i]) ||
                this[i] !== arr[i]) {
            return false;
        }
    }
    return true;
}

Object.defineProperty(Array.prototype, 'equals', { enumerable: false });