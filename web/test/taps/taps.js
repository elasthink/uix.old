(function() {

    // Constantes ------------------------------------------------------------------------------------------------------
    /**
     *
     * @type {number}
     */
    var motionThreshold = 8;

    /**
     *
     * @type {number}
     */
    var swipeTime = 500;

    /**
     *
     * @type {number}
     */
    var pressTime = 300;

    /**
     *
     * @type {number}
     */
    var doubleTapTime = 300;

    /**
     *
     * @type {number}
     */
    var touchGap = 300;


    // Variables -------------------------------------------------------------------------------------------------------
    /**
     * Representa una entrada en el mapa de seguimiento de eventos de interacción táctil o de ratón.
     * @typedef {Object} TrackEntry
     * @property {EventTarget} target Referencia al elemento donde se origina el evento.
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
     * @property {number} [pressTimer] Temporizador para lanzar el evento de pulsación larga (press).
     * @property {?{target: EventTarget, time: number}} prev Referencia al elemento implicado en la interacción anterior y
     * el tiempo de finalización de la misma.
     */

    /**
     * Mapa de seguimiento de eventos de interacción táctil o de ratón.
     * El identificador de la entrada se forma añadiendo al método de interacción táctil (touch) o de ratón (mouse)
     * el identificador del punto de contacto en eventos táctiles (touch:0, touch:1...).
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Touch/identifier
     * @type {Object.<string, TrackEntry>}
     */
    var trackMap = {};

    /**
     * Indica el número de puntos de contacto activos en cada instante.
     * @type {number}
     */
    var touching = 0;

    /**
     * Indica el tiempo de finalización del último evento táctil.
     * @type {number}
     */
    var touchEndTime = 0;

    /**
     * Crea la entrada para seguimiento de una nueva interacción táctil o de ratón.
     * @param {string} id Identificador de entrada.
     * @param {EventTarget} target Elemento implicado en la interacción.
     * @param {number} x Coordenada X.
     * @param {number} y Coordenada Y.
     */
    function trackStart(id, target, x, y) {
        // Se crea la nueva entrada
        trackMap[id] = {
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
            direction: null,
            // Si hay una entrada anterior se guarda la referencia al elemento implicado en la interacción y el
            // tiempo de finalización de la misma
            prev: trackMap[id] ? {
                target: trackMap[id].target,
                time: trackMap[id].endTime
            } : null
        };

        // Se crea el temporizador para lanzar el evento de pulsación larga transcurrido el tiempo establecido
        var e = trackMap[id];
        trackMap[id].pressTimer = setTimeout(function() {
            fire(e, 'press');
        }, pressTime);
    }

    /**
     * Tratamiento de los eventos de desplazamiento.
     * @param {string} id Identificador de la entrada.
     * @param {number} x Coordenada X.
     * @param {number} y Coordenada Y.
     */
    function trackMove(id, x, y) {
        var entry = trackMap[id];
        entry.x = x;
        entry.y = y;
        entry.dx = entry.x - entry.x0;
        entry.dy = entry.y - entry.y0;

        // Se comprueba el desplazamiento mínimo en los ejes
        var adx = Math.abs(entry.dx);
        var ady = Math.abs(entry.dy);
        if (adx > motionThreshold || ady > motionThreshold) {

            // Si hay movimiento se cancela el evento de pulsación larga (press)
            clearTimeout(entry.pressTimer);

            // Se calcula la orientación y dirección del movimiento
            if (!entry.orientation) {
                if (adx > ady) {
                    entry.orientation = 'horizontal';
                    entry.direction = (entry.dx > 0) ? 'right' : 'left';
                }
                else {
                    entry.orientation = 'vertical';
                    entry.direction = (entry.dy > 0) ? 'down' : 'up';
                }
                fire(entry, 'dragstart');
            }
            fire(entry, 'drag');
        }
    }

    /**
     * Tratamiento del final de una interacción.
     * @param {string} id Identificador de la entrada.
     * @param {boolean} [cancel] Indica si cancelar la interacción.
     */
    function trackEnd(id, cancel) {
        var entry = trackMap[id];

        // Se cancela el evento de pulsación larga (press)
        clearTimeout(entry.pressTimer);

        // Se comprueba el tipo de evento
        if (cancel) {
            delete trackMap[id];
            return;
        }

        // Se actualiza el tiempo de finalización y se calcula el tiempo transcurrido
        entry.endTime = performance.now();
        entry.dt = entry.endTime - entry.startTime;

        // Se lanzan los eventos correspondientes
        if (entry.orientation) {
            if (entry.dt < swipeTime) {
                fire(entry, 'swipe');
            }
            fire(entry, 'dragend');

        } else if (entry.prev && entry.prev.target === event.target &&
            (entry.endTime - entry.prev.time) < doubleTapTime) {
            fire(entry, 'doubletap');

        } else {
            fire(entry, 'tap');
        }
    }

    // Tratamiento de eventos táctiles ---------------------------------------------------------------------------------
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


    // Tratamiento de eventos de ratón ---------------------------------------------------------------------------------
    /**
     * Tratamiento del inicio de un evento de ratón.
     * @param {Event} event Evento recibido.
     */
    function mouseStart(event) {
        // Se comprueba si hay una interacción táctil activa o si el tiempo desde la última es menor que el margen
        // establecido, descartando todos los eventos de ratón que lleguen en esos casos
        if (touching > 0 || (performance.now() - touchEndTime) < touchGap) {
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

    // Funciones de utilidad -------------------------------------------------------------------------------------------
    /**
     * Añade el tratamiento del evento o eventos especificados.
     * @param {string|string[]} type Tipo o tipos de evento especificados.
     * @param {function} handler Función para tratamiento del evento.
     * @param {boolean} capture Indica si añadir el tratamiento en la fase de captura del evento.
     */
    function on(type, handler, capture) {
        if (Array.isArray(type)) {
            for (var i = 0; i < type.length; i++) {
                document.documentElement.addEventListener(type[i], handler, capture);
            }
        } else {
            document.documentElement.addEventListener(type, handler, capture);
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
                document.documentElement.removeEventListener(type[i], handler, capture);
            }
        } else {
            document.documentElement.removeEventListener(type, handler, capture);
        }
    }

    /**
     * Lanza el tipo de evento especificado.
     * @param {TrackEntry} entry Información de seguimiento de la interacción.
     * @param details
     */
    function fire(entry, type) {
        entry.target.dispatchEvent(new CustomEvent(type, {
            detail: entry,
            bubbles: true
        }));
    }

    // Inicialización --------------------------------------------------------------------------------------------------
    // Se añade los manejadores de eventos iniciales
    on('touchstart', touchStart, true);
    on('mousedown', mouseStart, true);
})();
