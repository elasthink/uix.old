/**
 * Control de transiciones por CSS.
 * @param {Element} element Elemento sobre el que realizar la transición.
 * @param {Object} [options] Opciones adicionales.
 * @param {string} [options.transition] Transición a realizar.
 * @param {number} [options.duration] Duración de la transición (segundos).
 * @param {boolean} [options.reverse] Indica si invertir el sentido de la transición.
 * @param {function} [options.ready] Función que se llama justo antes de iniciar la transición, cuando el elemento está
 * preparado.
 * @param {function} [options.complete] Función que se llama al completar la transición.
 * @class
 */
Transition = function(element, options) {
    this.element = element;
    Object.extend(this, options);
};

/**
 * Se añade la propiedad 'transition' al prototipo de <code>View</code>.
 * @type {string}
 */
View.prototype.transition = null;
// TODO: Se podría distinguir entre transición de salida (transition-in) y de entrada (transition-out)

// ---------------------------------------------------------------------------------------------------------------------
/**
 * Tipos de transiciones añadidos.
 * @type {Object.<string, Transition>}
 */
Transition.types = {};

/**
 * Define un nuevo tipo de transición.
 * @param {string} name Nombre de la transición.
 * @param {Object} proto Prototipo de la transición.
 */
Transition.define = function(name, proto) {
    var T = function(element, options) {
        Transition.call(this, element, options);
    }
    T.prototype = Object.extend(Object.create(Transition.prototype), proto);
    T.prototype.constructor = T;
    Transition.types[name] = T;
};

/**
 * Crea un nuevo objeto de control de transición para el elemento especificado.
 * @param {string} str Cadena de definición de la transición, se compone del nombre del tipo y parámetros específicos.
 * @param {Element} elemento Elemento sobre el que realizar la transición.
 * @param {Object} [options] Opciones adicionales.
 * @param {number} [options.duration] Duración de la transición (segundos).
 * @param {boolean} [options.reverse] Indica si invertir el sentido de la transición.
 * @return {Transition} Devuelve el objeto de control de transición creado.
 */
Transition.create = function(str, element, options) {
    if (str) {
        var parts = str.split(':'),
            name = parts[0];
        if (name in Transition.types) {
            var trans = new Transition.types[name](element, options);
            trans.init.apply(trans, (parts.length > 1) ? parts[1].split(',') : null);
            return trans;
        } else {
            console.log('Transition \'' + name + '\' doesn\'t exist.');
        }
    }
    return new Transition(element, options);
};

// ---------------------------------------------------------------------------------------------------------------------
Transition.prototype = {

    /**
     * Propiedad sobre la que aplicar la transición.
     * @type {(string|'all')}
     */
    property: 'all',

    /**
     * Duración de la transición en segundos.
     * @type {number}
     */
    duration: 0,

    /**
     * Función de interpolación a aplicar.
     * @type {string}
     */
    ease: 'linear',

    /**
     * Indica si invertir el sentido de la transición.
     * @type {boolean}
     */
    reverse: false,

    /**
     * Función que se llama al completar la transicion.
     * @type {function}
     */
    complete: null,

    /**
     * Función que se llama justo antes de iniciar la transición, cuando el elemento está preparado.
     * @type {function}
     */
    ready: null,

    // -----------------------------------------------------------------------------------------------------------------
    /**
     * Función de inicialización para obtención y tratamiento de los parámetros específicos de cada transición.
     * @param {...*} Parámetros especificados.
     */
    init: function() {
        // NOTE: Implementar por objetos derivados...
    },

    /**
     * Aplica las propiedades de la transición.
     * @param {Element} Elemento sobre el que aplicar el cambio de propiedades.
     */
    apply: function(element) {
        // NOTE: Implementar por objetos derivados...
    },

    /**
     * Establece las reglas de transición en los elementos implicadas.
     * @param {Element} Elemento sobre el que aplicar el cambio de propiedades.
     */
    tween: function(element) {
        element.style.transition = this.property + ' ' + this.duration + 's ' + this.ease;
    },

    /**
     * Limpia el estado de las propiedades añadidas durante la transición.
     */
    clear: function(element) {
        element.style.opacity = element.style.transform = '';
    },

    /**
     * Inicia la transición sobre el elemento especificado.
     * @param {boolean} show Indica si mostrar u ocultar la vista.
     * @param {Element} Elemento sobre el que aplicar el cambio de propiedades.
     */
    start: function(show) {
        var el = this.element;
        if (show) {
            // Se establecen las propiedades iniciales
            this.apply(el);

            // Si el elemento está oculto se visualiza
            if (el.style.display === 'none') {
                el.style.display = '';
            }
            if (el.style.visibility === 'hidden') {
                el.style.visibility = '';
            }

            // Forzamos el 'reflow' del elemento
            el.offsetWidth + el.offsetHeight;
        }

        // Limpia y notifica el final de la transición
        var self = this,
            done = function() {
                if (!show) {
                    self.clear(el);
                    el.style.display = 'none';
                }
                el.style.transition = '';
                if (self.complete) {
                    self.complete();
                }
            };
        window.requestAnimationFrame(function() {
            // Se añade la definición de la propiedad de transición
            self.tween(el);

            window.requestAnimationFrame(function() {
                if (self.ready) {
                    self.ready();
                }
                // Se aplican los cambios de propiedades para que se inicie la transición
                if (show) {
                    self.clear(el);
                } else {
                    self.apply(el);
                }
                // Iniciamos el temporizador para controlar el final de la transición
                setTimeout(done, self.duration * 1000);
            });
        });
    }

};

// Transiciones predefinidas
// ---------------------------------------------------------------------------------------------------------------------
/**
 * Transición de fundido.
 * @alias FadeTransition
 * @class
 * @augments Transition
 */
Transition.define('fade', {

    /** @see Transition.prototype.property */
    property: 'opacity',

    /** @see Transition.prototype.duration */
    duration: 0.2,

    /** @see Transition.prototype.ease */
    ease: 'linear',

    /** @see Transition.prototype.apply */
    apply: function(element) {
        element.style.opacity = 0;
    }
});

/**
 * Transición de desplazamiento.
 * @alias SlideTransition
 * @class
 * @augments Transition
 */
Transition.define('slide', {

    /** @see Transition.prototype.property */
    property: 'transform',

    /** @see Transition.prototype.duration */
    duration: 0.4,

    /** @see Transition.prototype.ease */
    ease: 'ease-in',

    /**
     * Sentido o dirección del desplazamiento.
     * @type {('up'|'right'|'down'|'left')}
     */
    direction: 'left',

    /**
     * Función de inicialización.
     * @param {('up'|'right'|'bottom'|'left')} [direction] Dirección del desplazamiento.
     * @see Transition.prototype.init
     */
    init: function(direction) {
        if (direction) {
            this.direction = direction;
        }

        // Invertimos la dirección
        if (this.reverse) {
            this.direction = (this.direction === 'up') ? 'down'
                : (this.direction === 'right') ? 'left'
                : (this.direction === 'down') ? 'up'
                : 'right';
        }
    },

    /** @see Transition.prototype.from */
    apply: function(element) {
        switch (this.direction) {
            case 'up':
                element.style.transform = 'translate(0,100%)';
                break;
            case 'right':
                element.style.transform = 'translate(-100%,0)';
                break;
            case 'down':
                element.style.transform = 'translate(0,-100%)';
                break;
            default:
                element.style.transform = 'translate(100%,0)';
        }
    }
});
