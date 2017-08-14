/**
 * taps.js
 */
(function() {

    // Settings --------------------------------------------------------------------------------------------------------
    /**
     * Referencia al elemento raíz del documento donde añadir el tratamiento de eventos.
     */
    var root = document.documentElement;

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
     * @param {Event} event Evento origen.
     */
    function trackStart(id, target, x, y, event) {
        // console.log('trackStart: ' + id);
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
            fire(entry, 'press', event); // TODO: ¿Tiene sentido pasarle el evento original desde el timeout?
        }, pressTime));

        // Evento de inicio de interacción
        fire(entry, 'tapstart', event);
    }

    /**
     * Tratamiento de los eventos de desplazamiento.
     * @param {string} id Identificador de la entrada.
     * @param {number} x Coordenada X.
     * @param {number} y Coordenada Y.
     * @param {Event} event Evento origen.
     */
    function trackMove(id, x, y, event) {
        // console.log('trackMove: ' + id);
        var entry = track[id];
        entry.x = x;
        entry.y = y;
        entry.dx = entry.x - entry.x0;
        entry.dy = entry.y - entry.y0;

        // Se comprueba si ya se ha iniciado el movimiento
        if (entry.orientation) {
            fire(entry, 'drag', event);
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
                fire(entry, 'dragstart', event);
                fire(entry, 'drag', event);

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
     * @param {Event} event Evento origen.
     */
    function trackEnd(id, cancel, event) {
        // console.log('trackEnd: ' + id);
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
                    fire(entry, 'swipe', event);
                }
                fire(entry, 'dragend', event);

            } else {
                var doubleTapTimer = entry.target.getAttribute('data-doubletap-timer');
                if (doubleTapTimer) {
                    fire(entry, 'doubletap', event);
                    clearTimeout(doubleTapTimer);
                    entry.target.removeAttribute('data-doubletap-timer');
                } else {
                    fire(entry, 'tap', event);
                    var target = entry.target;
                    entry.target.setAttribute('data-doubletap-timer', setTimeout(function() {
                        target.removeAttribute('data-doubletap-timer');
                    }, doubleTapTime));
                }
            }
        }

        // Evento de final de interacción
        fire(entry, 'tapend', event);

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
                event.changedTouches[i].pageX, event.changedTouches[i].pageY, event);
            // Si es el primero punto de contacto, se añade el tratamiento de los eventos posteriores
            if (touching === 0) {
                on(root, 'touchmove', touchMove, true); // { passive: false, capture: true });
                on(root, ['touchend', 'touchcancel'], touchEnd, true); // { passive: false, capture: true }
            }
            // NOTE: Otra alternativa sería añadir el tratamiento de los eventos directamente al elemento asociado a
            // cada evento recibido pero habría que analizar muy bien la problemática.
            // on(event.target, 'touchmove', touchMove, true); // { passive: false, capture: true });
            // on(event.target, ['touchend', 'touchcancel'], touchEnd, true); // { passive: false, capture: true }
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
                event.changedTouches[i].pageX, event.changedTouches[i].pageY, event);
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
        }
        // Se elimina el tratamiento de eventos añadidos
        if (touching === 0) {
            off(root, 'touchmove', touchMove, true); // { passive: false, capture: true });
            off(root, ['touchend', 'touchcancel'], touchEnd, true); // { passive: false, capture: true });
        }
        // NOTE: Al igual que en touchStart() podríamos añadir el tratamiento de los eventos directamente de los
        // elementos asociados a cada evento recibido, pero de momento lo dejamos al elemento raíz.
        // off(event.target, 'touchmove', touchMove, true); // { passive: false, capture: true });
        // off(event.target, ['touchend', 'touchcancel'], touchEnd, true); // { passive: false, capture: true });
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
            // event.preventDefault(); // NOTE: Parece que no es necesario descartar los eventos.
            return;
        }

        // Se crea la nueva entrada para seguimiento de la interacción
        trackStart('mouse', event.target, event.pageX, event.pageY, event);

        // Se añade el tratamiento de los eventos posteriores
        on(root, 'mousemove', mouseMove, true);
        on(root, 'mouseup', mouseEnd, true);
    }

    /**
     * Tratamiento del evento de desplazamiento con el ratón.
     * @param {Event} event Evento recibido.
     */
    function mouseMove(event) {
        trackMove('mouse', event.pageX, event.pageY, event);
    }

    /**
     * Tratamiento del final de un evento de ratón.
     */
    function mouseEnd() {
        trackEnd('mouse');

        // Evitamos el tratamiento por defecto
        // event.preventDefault();

        // Se elimina el tratamiento de eventos añadidos
        off(root, 'mousemove', mouseMove, true);
        off(root, 'mouseup', mouseEnd, true);
    }


    // Utility functions -----------------------------------------------------------------------------------------------
    /**
     * Añade el tratamiento del evento o eventos especificados.
     * @param {Element} target Elemento en el que añadir el tratamiento del evento o eventos especificados.
     * @param {string|string[]} type Tipo o tipos de evento especificados.
     * @param {function} handler Función para tratamiento del evento.
     * @param {boolean} capture Indica si añadir el tratamiento en la fase de captura del evento.
     */
    function on(target, type, handler, capture) {
        if (Array.isArray(type)) {
            for (var i = 0; i < type.length; i++) {
                target.addEventListener(type[i], handler, capture);
            }
        } else {
            target.addEventListener(type, handler, capture);
        }
    }

    /**
     * Elimina el tratamiento del evento o eventos especificados.
     * @param {Element} target Elemento de donde eliminar el tratamiento del evento o eventos especificados.
     * @param {string|string[]} type Tipo o tipos de evento especificados.
     * @param {function} handler Función para tratamiento del evento añadida anteriormente.
     * @param {boolean} capture Indica si el tratamiento a eliminar fue añadido para la fase de captura o no.
     */
    function off(target, type, handler, capture) {
        if (Array.isArray(type)) {
            for (var i = 0; i < type.length; i++) {
                target.removeEventListener(type[i], handler, capture);
            }
        } else {
            target.removeEventListener(type, handler, capture);
        }
    }

    /**
     * Lanza el tipo de evento especificado.
     * @param {TrackEntry} entry Información de seguimiento de la interacción.
     * @param {string} type Tipo de evento especificado.
     * @param {Event} sourceEvent Evento origen.
     */
    function fire(entry, type, sourceEvent) {
        var event = new CustomEvent(type, {
            detail: Object.extend({}, entry, {
                sourceEvent: sourceEvent
            }),
            bubbles: true,
            // TODO: Evaluar en función de que puede ser cancelable o no nuestros eventos !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            cancelable: true
        });
        entry.target.dispatchEvent(event);
        if (event.defaultPrevented && sourceEvent.cancelable) {
            sourceEvent.preventDefault();
        }
    }


    // Initialization --------------------------------------------------------------------------------------------------
    on(root, 'touchstart', touchStart, true);
    on(root, 'mousedown', mouseStart, true);
})();