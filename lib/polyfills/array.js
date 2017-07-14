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