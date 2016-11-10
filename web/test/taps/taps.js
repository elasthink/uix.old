(function() {

    // Constantes ------------------------------------------------------------------------------------------------------
    /**
     *
     * @type {number}
     */
    var motionThreshold = 25;

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
     * Mapa de seguimiento de eventos de interacción táctil o de ratón.
     * El identificador de la entrada se forma añadiendo al método de interacción táctil (touch) o de ratón (mouse) el
     * identificador del punto de contacto en eventos táctiles (touch:0, touch:1...).
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
        for (var i = 0, id, px, py, e; i < event.changedTouches.length; i++) {
            id = 'touch:' + event.changedTouches[i].identifier;
            px = event.changedTouches[i].pageX;
            py = event.changedTouches[i].pageY;

            // Se crea la nueva entrada en el mapa de seguimiento de eventos
            trackMap[id] = e = {
                target: event.target,
                startTime: performance.now(),
                endTime: 0,
                dt: 0,
                x0: px,
                y0: py,
                x: px,
                y: py,
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

            // Temporizador para lanzar el evento de pulsación larga
            trackMap[id].pressTimer = setTimeout(function() {
                fire(e, 'press');
            }, pressTime);

            // Se añade el tratamiento de los eventos posteriores
            if (touching === 0) {
                document.documentElement.addEventListener('touchmove', touchMove, true);
                document.documentElement.addEventListener('touchend', touchEnd, true);
                document.documentElement.addEventListener('touchcancel', touchEnd, true);
            }

            // Se incrementa el contador de interacciones táctiles activas
            touching++;

        } // for (var i = 0, id; i < event.changedTouches.length; i++)
    }

    /**
     * Tratamiento del evento de desplazamiento táctil.
     * @param {TouchEvent} event Evento táctil recibido.
     */
    function touchMove(event) {
        if (!event.changedTouches) {
            return;
        }
        // Se evalua todos los puntos de contacto
        for (var i = 0, entry; i < event.changedTouches.length; i++) {
            entry = trackMap['touch:' + event.changedTouches[i].identifier];
            entry.x = event.changedTouches[i].pageX;
            entry.y = event.changedTouches[i].pageY;
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
                }

                /* TODO: Evaluar que pasa con los eventos delegados y la posibilidad de cambio de target (ver jquery.finger)
                var target = event.target;
                while (target && target !== start.target) {
                    target = target.parentNode;
                }
                if (target !== start.target) {
                    target = start.target;
                    stopHandler.call(this, $.Event(stopEvent + '.' + namespace, event));
                    return;
                } */
                // TODO: Usamos el target de la entrada pero una vez aclaremos el punto anterior evaluar que target especificar
                fire(entry, 'drag');
            }
        }
    }

    /**
     * Tratamiento del final de un evento táctil.
     * @param {TouchEvent} event Evento táctil recibido.
     */
    function touchEnd(event) {
        if (!event.changedTouches) {
            return;
        }
        // Se evalua todos los puntos de contacto
        for (var i = 0, id, entry; i < event.changedTouches.length; i++) {
            id = 'touch:' + event.changedTouches[i].identifier;
            entry = trackMap[id];

            // Se cancela el evento de pulsación larga (press)
            clearTimeout(entry.pressTimer);

            // Se comprueba el tipo de evento
            if (event.type === 'touchend') {
                entry.endTime = performance.now();
                entry.dt = entry.endTime - entry.startTime;
                if (entry.orientation) {
                    if (entry.dt < swipeTime) {
                        fire(entry, 'swipe');
                    }
                    // TODO: Tiene sentido emitirlo o en el tratamiento anterior del evento 'touchmove' ya estamos notificando los últimos cambios de coordenadas?
                    // fire(entry, 'drag');

                } else if (entry.prev && entry.prev.target === event.target &&
                        (entry.endTime - entry.prev.time) < doubleTapTime) {
                    fire(entry, 'doubletap');

                } else {
                    fire(entry, 'tap');
                }
                event.preventDefault();
            } else {
                // Si se cancela la interacción se elimina la entrada
                delete trackMap[id];
            }

            // Se decrementa el número de puntos de contacto activos y se guarda el tiempo final
            touching--;
            touchEndTime = entry.endTime;

        } // for (var i = 0, entry; i < event.changedTouches.length; i++)

        // Se elimina el tratamiento de eventos
        if (touching === 0) {
            document.documentElement.removeEventListener('touchmove', touchMove, true);
            document.documentElement.removeEventListener('touchend', touchEnd, true);
            document.documentElement.removeEventListener('touchcancel', touchEnd, true);
        }
    }



    // Tratamiento de eventos de ratón ---------------------------------------------------------------------------------
    /**
     * Tratamiento del inicio de un evento de ratón.
     * @param event
     */
    function mouseStart(event) {
        // Se comprueba si hay una interacción táctil activa o si el tiempo desde la última es menor que el margen
        // establecido, descartando todos los eventos de ratón que lleguen bajo esas condiciones
        if (touching > 0 || touchEndTime < touchGap) {
            event.preventDefault();
            return;
        }

        // Se crea la nueva entrada en el mapa de seguimiento de eventos
        var id = 'mouse', e,
            px = event.pageX,
            py = event.pageY;
        trackMap[id] = e = {
            target: event.target,
            startTime: performance.now(),
            endTime: 0,
            dt: 0,
            x0: px,
            y0: py,
            x: px,
            y: py,
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

        // Temporizador para lanzar el evento de pulsación larga
        trackMap[id].pressTimer = setTimeout(function() {
            fire(e, 'press');
        }, pressTime);

        // Se añade el tratamiento de los eventos posteriores
        document.documentElement.addEventListener('mousemove', mouseMove, true);
        document.documentElement.addEventListener('mouseup', mouseEnd, true);
        document.documentElement.addEventListener('mouseleave', mouseEnd, true);
    };

    /**
     * Tratamiento del evento de desplazamiento con el ratón.
     * @param event
     */
    var mouseMove = function(event) {
        var entry = trackMap['mouse'];
        entry.x = event.pageX;
        entry.y = event.pageY;
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
            }

            /* TODO: Evaluar que pasa con los eventos delegados y la posibilidad de cambio de target (ver jquery.finger)
            var target = event.target;
            while (target && target !== start.target) {
                target = target.parentNode;
            }
            if (target !== start.target) {
                target = start.target;
                stopHandler.call(this, $.Event(stopEvent + '.' + namespace, event));
                return;
            } */
            // TODO: Usamos el target de la entrada pero una vez aclaremos el punto anterior evaluar que target especificar
            fire(entry, 'drag');
        }
    };

    /**
     * Tratamiento del final de un evento de ratón.
     * @param event
     */
    var mouseEnd = function(event) {
        var id = 'mouse';
        var entry = trackMap[id];

        // Se cancela el evento de pulsación larga (press)
        clearTimeout(entry.pressTimer);

        // Se comprueba el tipo de evento
        if (event.type === 'mouseup') {
            entry.endTime = performance.now();
            entry.dt = entry.endTime - entry.startTime;
            if (entry.orientation) {
                if (entry.dt < swipeTime) {
                    fire(entry, 'swipe');
                }
            } else if (entry.prev && entry.prev.target === event.target &&
                (entry.endTime - entry.prev.time) < doubleTapTime) {
                fire(entry, 'doubletap');

            } else {
                fire(entry, 'tap');
            }
            event.preventDefault();
        } else {
            // Si se cancela la interacción se elimina la entrada
            delete trackMap[id];
        }

        // Se elimina el tratamiento de eventos
        document.documentElement.removeEventListener('mousemove', mouseMove, true);
        document.documentElement.removeEventListener('mouseup', mouseEnd, true);
        document.documentElement.removeEventListener('mouseleave', mouseEnd, true);
    };



    // Funciones de utilidad -------------------------------------------------------------------------------------------
    /**
     * Lanza el tipo de evento especificado.
     * @param {TrackEntry} entry Información de seguimiento de la interacción.
     * @param details
     */
    var fire = function(entry, type) {
        entry.target.dispatchEvent(new CustomEvent(type, {
            detail: entry,
            bubbles: true
        }));
    };

    // Inicialización --------------------------------------------------------------------------------------------------
    // Se añade los manejadores de eventos iniciales
    document.documentElement.addEventListener('touchstart', touchStart, true);
    document.documentElement.addEventListener('mousedown', mouseStart, true);
})();

/**
 * Representa una entrada del mapa de seguimiento de eventos de interacción táctil o de ratón.
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
