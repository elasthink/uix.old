/**
 * Transición entre vistas.
 * @param {Element} incoming Vista entrante.
 * @param {Element} [outgoing] Vista saliente.
 * @param {Object} [options] Opciones adicionales.
 * @param {number} [options.duration] Duración de la transición (segundos).
 * @param {boolean} [options.reverse] Indica si invertir el sentido de la transición.
 * @class
 */
Transition = function(incoming, outgoing, options) {
    this.incoming = incoming;
    this.outgoing = outgoing;

    Object.extend(this, options);
};

// ---------------------------------------------------------------------------------------------------------------------
/**
 * Tipos de transiciones añadidos.
 * @type {Object.<string, Transition>}
 */
Transition.types = {};

/**
 * Define un nuevo tipo de transición.
 * @param {string} name Nombre de la transición.
 * @param {Object} proto Objeto de implementación de la transición.
 */
Transition.define = function(name, proto) {
    var T = function() {
        Transition.apply(this, arguments);
    }
    T.prototype = Object.extend(Object.create(Transition.prototype), proto);
    T.prototype.constructor = T;
    // T.prototype.name = name; -> TODO: Lo necesitamos?
    Transition.types[name] = T;
};

/**
 * Crea un nuevo objeto de transición entre vistas parseando la cadena especificada.
 * @param {string} str Cadena de definición de la transición compuesta por el nombre y parámetros específicos del tipo.
 * @param {Element} incoming Vista entrante.
 * @param {Element} [outgoing] Vista saliente.
 * @param {Object} [options] Opciones adicionales.
 * @param {number} [options.duration] Duración de la transición (segundos).
 * @param {boolean} [options.reverse] Indica si invertir el sentido de la transición.
 * @returns {Transition}
 */
Transition.create = function(str, incoming, outgoing, options) {
    if (str) {
        var parts = str.split(':'),
            name = parts[0];
        if (name in Transition.types) {
            var trans = new Transition.types[name](incoming, outgoing, options);
            trans.init.apply(trans, (parts.length > 1) ? parts[1].split(',') : null);
            return trans;
        } else {
            console.log('Transition \'' + name + '\' doesn\'t exist.');
        }
    }
    return new Transition(incoming, outgoing);
};

/**
 * Elimina las clases de estilo añadidas al elemento especificada relacionadas con las transiciones.
 * @param {Element} el Elemento especificado.
 */
Transition.clear = function(el) {
    uix.removeClass(el, function(className) {
        return /^(?:ui-trans|--reverse$)/.test(className);
    });
};

// ---------------------------------------------------------------------------------------------------------------------
Transition.prototype = {

    /**
     * Duración de la transición en segundos.
     * @type {number}
     */
    duration: 0,

    /**
     * Indica si invertir el sentido de la transición, aplicable al retroceder.
     * @type {boolean}
     */
    reverse: false,

    /**
     * Función de inicialización para tratamiento y recogida de los parámetros específicos de la transición.
     * @param {...*} Parámetros especificados.
     */
    init: function() {
        // NOTE: Implementar por objetos derivados...
    },

    /**
     * Establece las reglas iniciales de las vistas implicadas.
     */
    reset: function() {
        // NOTE: Implementar por objetos derivados...
    },

    /**
     * Establece las reglas finales de las vistas implicadas.
     */
    apply: function() {
        this.incoming.style.opacity = 1;
        if (this.outgoing) {
            this.outgoing.style.opacity = 0;
        }
    },

    /**
     * Inicia la transición.
     * @param {function} [complete] Función de retorno que será llamada al completarse la transición.
     */
    start: function(complete) {
        // Se establecen las propiedades iniciales
        this.reset();

        // Se comprueba la visibilidad de los elementos (visibility)
        if (this.incoming.style.visibility === 'hidden') {
            this.incoming.style.visibility = 'visible';
        }

        // Se aplican los cambios de propiedades para que se inicie la transición
        var self = this;
        window.requestAnimationFrame(function() {
            self.apply();
        });

        // Se controla la duración de la transición trás lo cual se restablecen las propiedades de estilo anteriores
        // this.timer = ???
        setTimeout(function() {
            self.clear();
            if (complete) {
                complete();
            }
        }, this.duration * 1000);
    },

    /**
     * ...
     */
    clear: function() {
        // TODO: Quitar propiedades añadidas...
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

    /** @see Transition.prototype.duration */
    duration: 1.25,

    /** @see Transition.prototype.reset */
    reset: function() {
        Object.extend(this.incoming.style, {
            opacity: 0,
            transition: 'none'
        });
        if (this.outgoing) {
            Object.extend(this.outgoing.style, {
                opacity: 1,
                transition: 'none'
            });
        }
    },

    /** @see Transition.prototype.apply */
    apply: function() {
        var transition = 'opacity ' + this.duration + 's linear';
        Object.extend(this.incoming.style, {
            opacity: 1,
            transition: transition
        });
        if (this.outgoing) {
            Object.extend(this.outgoing.style, {
                opacity: 0,
                transition: transition
            });
        }
    },

    /** @see Transition.prototype.clear */
    clear: function() {
        Object.extend(this.incoming.style, {
            transition: 'none'
        });
        if (this.outgoing) {
            Object.extend(this.outgoing.style, {
                transition: 'none'
            });
        }
    }
});

/**
 * Transición de desplazamiento.
 * @alias SlideTransition
 * @class
 * @augments Transition
 */
Transition.define('slide', {

    /** @see Transition.prototype.duration */
    duration: 0.2,

    /** @see Transition.prototype.init */
    init: function(direction) {
        /**
         * Sentido o dirección del desplazamiento.
         * @type {string}
         */
        this.direction = direction;
    },

    /** @see Transition.prototype.reset */
    reset: function() {
        var incomingStyle, outgoingStyle;
        if (this.direction === 'up' || this.direction === 'down' && this.reverse) {
            incomingStyle = {
                opacity: 1,
                transform: 'translate3d(0,100%,0)',
                transition: 'none'
            };
            outgoingStyle = {
                opacity: 1,
                transform: 'none',
                transition: 'none'
            };
        } else if (this.direction === 'right' || this.direction === 'left' && this.reverse) {
            incomingStyle = {
                opacity: 1,
                transform: 'translate3d(-100%,0,0)',
                transition: 'none'
            };
            outgoingStyle = {
                opacity: 1,
                transform: 'none',
                transition: 'none'
            };
        } else if (this.direction === 'bottom' || this.direction === 'up' && this.reverse) {
            incomingStyle = {
                opacity: 1,
                transform: 'translate3d(0,-100%,0)',
                transition: 'none'
            };
            outgoingStyle = {
                opacity: 1,
                transform: 'none',
                transition: 'none'
            };
        } else if (this.direction === 'left' || this.direction === 'right' && this.reverse) {
            incomingStyle = {
                opacity: 1,
                transform: 'translate3d(100%,0,0)',
                transition: 'none'
            };
            outgoingStyle = {
                opacity: 1,
                transform: 'none',
                transition: 'none'
            };
        }

        Object.extend(this.incoming.style, incomingStyle);
        if (this.outgoing) {
            Object.extend(this.outgoing.style, outgoingStyle);
        }
    },

    /** @see Transition.prototype.apply */
    apply: function() {
        var incomingStyle, outgoingStyle;
        var transition = 'transform ' + this.duration + 's ease-in';
        if (this.direction === 'up' || this.direction === 'down' && this.reverse) {
            incomingStyle = {
                transform: 'none',
                transition: transition
            };
            outgoingStyle = {
                transform: 'translate3d(0,-100%,0)',
                transition: transition
            };
        } else if (this.direction === 'right' || this.direction === 'left' && this.reverse) {
            incomingStyle = {
                transform: 'none',
                transition: transition
            };
            outgoingStyle = {
                transform: 'translate3d(100%,0,0)',
                transition: transition
            };
        } else if (this.direction === 'bottom' || this.direction === 'up' && this.reverse) {
            incomingStyle = {
                transform: 'none',
                transition: transition
            };
            outgoingStyle = {
                transform: 'translate3d(0,100%,0)',
                transition: transition
            };
        } else if (this.direction === 'left' || this.direction === 'right' && this.reverse) {
            incomingStyle = {
                transform: 'none',
                transition: transition
            };
            outgoingStyle = {
                transform: 'translate3d(-100%,0,0)',
                transition: transition
            };
        }

        Object.extend(this.incoming.style, incomingStyle);
        if (this.outgoing) {
            Object.extend(this.outgoing.style, outgoingStyle);
        }
    },

    /** @see Transition.prototype.clear */
    clear: function() {
        Object.extend(this.incoming.style, {
            transition: 'none'
        });
        if (this.outgoing) {
            Object.extend(this.outgoing.style, {
                transition: 'none'
            });
        }
    }
});
