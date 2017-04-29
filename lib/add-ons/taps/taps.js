/**
 * taps.js
 */
(function() {

    // Settings --------------------------------------------------------------------------------------------------------
    /**
     * Mínima longitud de desplazamiento en los ejes (pixels).
     * @type {number}
     */
    var motionThreshold = 8;

    /**
     * Tiempo máximo en milisegundos para lanzar el evento de deslizamiento rápido (swipe).
     * @type {number}
     */
    var swipeTime = 500;

    /**
     * Tiempo en milisegundos para la lanzar el evento de pulsación larga (press).
     * @type {number}
     */
    var pressTime = 300;

    /**
     * Tiempo máximo en milisegundos para lanzar el evento de pulsación doble (doubletap).
     * @type {number}
     */
    var doubleTapTime = 300;

    /**
     * Margen de tiempo en milisegundos desde el último evento táctil en el que ignorar eventos de ratón posteriores.
     * @type {number}
     */
    var touchGap = 1000;


    // Variables -------------------------------------------------------------------------------------------------------
    /**
     * Representa una entrada en el mapa de seguimiento de eventos de interacción táctil o de ratón.
     * @typedef {Object} TrackEntry
     * @property {EventTarget|Element} target Referencia al elemento donde se origina el evento.
     * @property {number} startTime Tiempo de inicio de la secuencia de eventos.
     * @property {number} endTime Tiempo de finalización de la secuencia de eventos.
     * @property {number} dt Tiempo transcurrido entre el inicio y el final de la secuencia.
     * @property {number} x0 Coordenada X inicial.
     * @property {number} y0 Coordenada Y inicial.
     * @property {number} x Coordenada X actual.
     * @property {number} y Coordenada Y actual.
     * @property {number} dx Desplazamiento de la coordenada X.
     * @property {number} dy Desplazamiento de la coordenada Y.
     * @property {?('horizontal'|'vertical')} orientation Orientación del desplazamiento.
     * @property {?('up'|'right'|'down'|'left')} direction Dirección del desplazamiento.
     */

    /**
     * Mapa de seguimiento de eventos de interacción táctil o de ratón.
     * El identificador de la entrada se forma añadiendo al método de interacción táctil (touch) o de ratón (mouse)
     * el identificador del punto de contacto en eventos táctiles (touch:0, touch:1...).
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Touch/identifier
     * @type {Object.<string, TrackEntry>}
     */
    var track = {};

    /**
     * Indica el número de puntos de contacto activos en cada instante.
     * @type {number}
     */
    var touching = 0;

    /**
     * Indica el tiempo de finalización del último evento táctil (ms).
     * @type {number}
     */
    var touchEndTime = 0;


    // Functions -------------------------------------------------------------------------------------------------------
    /**
     * Crea la entrada para seguimiento de una nueva interacción táctil o de ratón.
     * @param {string} id Identificador de entrada.
     * @param {EventTarget|Element} target Elemento implicado en la interacción.
     * @param {number} x Coordenada X.
     * @param {number} y Coordenada Y.
     */
    function trackStart(id, target, x, y) {
        console.log('trackStart: ' + id);
        // Se crea la nueva entrada
        var entry = track[id] = {
            target: target,
            startTime: performance.now(),
            endTime: 0,
            dt: 0,
            x0: x,
            y0: y,
            x: x,
            y: y,
            dx: 0,
            dy: 0,
            orientation: null,
            direction: null
        };

        // Se crea el temporizador para lanzar el evento de pulsación larga transcurrido el tiempo establecido
        target.setAttribute('data-press-timer', setTimeout(function() {
            fire(entry, 'press');
        }, pressTime));

        // Evento de inicio de interacción
        fire(entry, 'tapstart');
    }

    /**
     * Tratamiento de los eventos de desplazamiento.
     * @param {string} id Identificador de la entrada.
     * @param {number} x Coordenada X.
     * @param {number} y Coordenada Y.
     */
    function trackMove(id, x, y) {
        // console.log('trackMove: ' + id);
        var entry = track[id];
        entry.x = x;
        entry.y = y;
        entry.dx = entry.x - entry.x0;
        entry.dy = entry.y - entry.y0;

        // Se comprueba si ya se ha iniciado el movimiento
        if (entry.orientation) {
            fire(entry, 'drag');
        } else {
            // Se comprueba que haya un desplazamiento mínimo en los ejes
            var adx = Math.abs(entry.dx);
            var ady = Math.abs(entry.dy);
            if (adx > motionThreshold || ady > motionThreshold) {
                // Se calcula la orientación y dirección del movimiento
                if (adx > ady) {
                    entry.orientation = 'horizontal';
                    entry.direction = (entry.dx > 0) ? 'right' : 'left';
                }
                else {
                    entry.orientation = 'vertical';
                    entry.direction = (entry.dy > 0) ? 'down' : 'up';
                }
                fire(entry, 'dragstart');
                fire(entry, 'drag');

                // Se cancela el evento de pulsación larga (press)
                var pressTimer = entry.target.getAttribute('data-press-timer');
                if (pressTimer) {
                    clearTimeout(pressTimer);
                    entry.target.removeAttribute('data-press-timer');
                }
            }
        } // if (entry.orientation) else
    }

    /**
     * Tratamiento del final de una interacción.
     * @param {string} id Identificador de la entrada.
     * @param {boolean} [cancel] Indica si cancelar la interacción.
     */
    function trackEnd(id, cancel) {
        console.log('trackEnd: ' + id);
        var entry = track[id];

        // Se cancela el evento de pulsación larga (press)
        var pressTimer = entry.target.getAttribute('data-press-timer');
        if (pressTimer) {
            clearTimeout(pressTimer);
            entry.target.removeAttribute('data-press-timer');
        }

        if (!cancel) {
            // Se actualiza el tiempo de finalización y se calcula el tiempo transcurrido
            entry.endTime = performance.now();
            entry.dt = entry.endTime - entry.startTime;

            // Se lanza el evento o eventos correspondientes
            if (entry.orientation) {
                if (entry.dt < swipeTime) {
                    fire(entry, 'swipe');
                }
                fire(entry, 'dragend');

            } else {
                var doubleTapTimer = entry.target.getAttribute('data-doubletap-timer');
                if (doubleTapTimer) {
                    fire(entry, 'doubletap');
                    clearTimeout(doubleTapTimer);
                    entry.target.removeAttribute('data-doubletap-timer');
                } else {
                    fire(entry, 'tap');
                    var target = entry.target;
                    entry.target.setAttribute('data-doubletap-timer', setTimeout(function() {
                        target.removeAttribute('data-doubletap-timer');
                    }, doubleTapTime));
                }
            }
        }

        // Evento de final de interacción
        fire(entry, 'tapend');

        // Se elimina la entrada de seguimiento
        delete track[id];
    }

    // Touch events ----------------------------------------------------------------------------------------------------
    /**
     * Tratamiento del inicio de un evento táctil.
     * @param {TouchEvent} event Evento táctil recibido.
     */
    function touchStart(event) {
        if (!event.changedTouches) {
            return;
        }
        // Se evalua todos los puntos de contacto
        for (var i = 0; i < event.changedTouches.length; i++) {
            // Se crea la nueva entrada para seguimiento de la interacción
            trackStart('touch:' + event.changedTouches[i].identifier, event.target,
                event.changedTouches[i].pageX, event.changedTouches[i].pageY);

            // Si es el primero punto de contacto, se añade el tratamiento de los eventos posteriores
            if (touching === 0) {
                on('touchmove', touchMove, true);
                on(['touchend', 'touchcancel'], touchEnd, true);
            }

            // Se incrementa el contador de puntos de contacto activos
            touching++;
        }
    }

    /**
     * Tratamiento del evento de desplazamiento táctil.
     * @param {TouchEvent} event Evento táctil recibido.
     */
    function touchMove(event) {
        // Se evalua todos los puntos de contacto
        for (var i = 0; i < event.changedTouches.length; i++) {
            // Se realiza el tratamiento del desplazamiento para cada punto de contacto
            trackMove('touch:' + event.changedTouches[i].identifier,
                event.changedTouches[i].pageX, event.changedTouches[i].pageY);
        }
    }

    /**
     * Tratamiento del final de un evento táctil.
     * @param {TouchEvent} event Evento táctil recibido.
     */
    function touchEnd(event) {
        // Se evalua todos los puntos de contacto
        for (var i = 0, e; i < event.changedTouches.length; i++) {
            trackEnd('touch:' + event.changedTouches[i].identifier, event.type !== 'touchend');

            // Se decrementa el número de puntos de contacto activos y se guarda el tiempo final
            touching--;
            touchEndTime = performance.now();

        } // for (var i = 0, entry; i < event.changedTouches.length; i++)

        // Evitamos el tratamiento por defecto
        // event.preventDefault();

        // Se elimina el tratamiento de eventos añadidos
        if (touching === 0) {
            off('touchmove', touchMove, true);
            off(['touchend', 'touchcancel'], touchEnd, true);
        }
    }


    // Mouse Events ----------------------------------------------------------------------------------------------------
    /**
     * Tratamiento del inicio de un evento de ratón.
     * @param {Event} event Evento recibido.
     */
    function mouseStart(event) {
        // Se comprueba si hay una interacción táctil activa o si el tiempo desde la última es menor que el margen
        // establecido, descartando todos los eventos de ratón que lleguen en esos casos
        if (touching > 0 || touchEndTime > 0 && touchGap > (performance.now() - touchEndTime)) {
            // event.preventDefault();
            return;
        }

        // Se crea la nueva entrada para seguimiento de la interacción
        trackStart('mouse', event.target, event.pageX, event.pageY);

        // Se añade el tratamiento de los eventos posteriores
        on('mousemove', mouseMove, true);
        on('mouseup', mouseEnd, true);
    }

    /**
     * Tratamiento del evento de desplazamiento con el ratón.
     * @param {Event} event Evento recibido.
     */
    function mouseMove(event) {
        trackMove('mouse', event.pageX, event.pageY);
    }

    /**
     * Tratamiento del final de un evento de ratón.
     */
    function mouseEnd() {
        trackEnd('mouse');

        // Evitamos el tratamiento por defecto
        // event.preventDefault();

        // Se elimina el tratamiento de eventos añadidos
        off('mousemove', mouseMove, true);
        off('mouseup', mouseEnd, true);
    }


    // Utility functions -----------------------------------------------------------------------------------------------
    /**
     * Referencia al elemento raíz del documento donde añadir el manejo de eventos.
     */
    var root = document.documentElement;

    /**
     * Añade el tratamiento del evento o eventos especificados.
     * @param {string|string[]} type Tipo o tipos de evento especificados.
     * @param {function} handler Función para tratamiento del evento.
     * @param {boolean} capture Indica si añadir el tratamiento en la fase de captura del evento.
     */
    function on(type, handler, capture) {
        if (Array.isArray(type)) {
            for (var i = 0; i < type.length; i++) {
                root.addEventListener(type[i], handler, capture);
            }
        } else {
            root.addEventListener(type, handler, capture);
        }
    }

    /**
     * Elimina el tratamiento del evento o eventos especificados.
     * @param {string|string[]} type Tipo o tipos de evento especificados.
     * @param {function} handler Función para tratamiento del evento añadida anteriormente.
     * @param {boolean} capture Indica si el tratamiento a eliminar fue añadido para la fase de captura o no.
     */
    function off(type, handler, capture) {
        if (Array.isArray(type)) {
            for (var i = 0; i < type.length; i++) {
                root.removeEventListener(type[i], handler, capture);
            }
        } else {
            root.removeEventListener(type, handler, capture);
        }
    }

    /**
     * Lanza el tipo de evento especificado.
     * @param {TrackEntry} entry Información de seguimiento de la interacción.
     * @param {string} type Tipo de evento especificado.
     */
    function fire(entry, type) {
        entry.target.dispatchEvent(new CustomEvent(type, {
            detail: entry,
            bubbles: true
        }));
    }


    // Initialization --------------------------------------------------------------------------------------------------
    on('touchstart', touchStart, true);
    on('mousedown', mouseStart, true);
})();