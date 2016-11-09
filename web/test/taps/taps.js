(function() {

    // tap, double tap, press, swipe, drag

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


    // Variables -------------------------------------------------------------------------------------------------------
    /**
     * Mapa de seguimiento de eventos de interacción táctil o de ratón.
     * @type {Object.<string, TrackEntry>}
     */
    var trackMap = {};

    /**
     * Indica si hay una interacción táctil activa.
     * @type {boolean}
     */
    var touching = false;

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
    var startTouch = function(event) {
        var id = 'touch:' + event.changedTouches[0].identifier,
            px = event.changedTouches[0].pageX,
            py = event.changedTouches[0].pageY;

        // Se crea la entrada en el mapa de seguimiento de eventos
        trackMap[id] = {
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
            pressTimeout: setTimeout(function() {
                /* TODO: Lanzar evento 'press'
                fire(event.target, 'press', {
                    originalEvent: event
                }); */
            }, pressTime)
        };

        // Se indica que hay una interacción táctil activa
        touching = true;

        // Se añade el tratamiento de los eventos posteriores
        document.documentElement.addEventListener('touchmove', moveTouch, true);
        document.documentElement.addEventListener('touchend', endTouch, true);
        document.documentElement.addEventListener('touchcancel', endTouch, true);
    };

    /**
     * Tratamiento del evento de desplazamiento táctil.
     * @param {TouchEvent} event Evento táctil recibido.
     */
    var moveTouch = function(event) {
        for (var i = 0, entry, id; i < event.changedTouches.length; i++) {
            entry = trackMap['touch:' + event.changedTouches[i].identifier];
            entry.x = event.changedTouches[i].pageX;
            entry.y = event.changedTouches[i].pageY;
            entry.dx = entry.x - entry.x0;
            entry.dy = entry.y - entry.y0;

            // Se comprueba el límite de desplazamiento mínimo
            var adx = Math.abs(entry.dx), ady = Math.abs(entry.dy);
            var motion = adx > motionThreshold || ady > motionThreshold;
            if (!motion) {
                return;
            }

            // Si hay movimiento se cancela el temporizador para lanzar el evento de pulsación larga (press)
            clearTimeout(entry.pressTimeout);

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
            }*/
        }

        fire(event.target, 'drag', {
            originalEvent: event
        });
    };

    /**
     * Tratamiento del final de un evento táctil.
     * @param {TouchEvent} event Evento táctil recibido.
     */
    var endTouch = function(event) {
        var now = performance.now();
        var dt = now - start.time;

        var eventName;

        clearTimeout(timeout);

        if (motion) {


        } else {
            var doubleTap = (prevEl === event.target) && ((timeStamp - prevTime) < doubleTapTime);
            eventName = doubleTap ? 'doubletap' : 'tap';
            prevEl = doubleTap ? null : start.target;
            prevTime = timeStamp;
        }

        // Se evalua si lanzar el evento "tap"
        if (event.type === 'touchend') {
            var tap = new CustomEvent('tap', {
                detail: {},
                bubbles: true
            });
            event.target.dispatchEvent(tap);
            event.preventDefault();
        }

        // Se elimina el tratamiento de eventos
        document.documentElement.removeEventListener('touchmove', moveTouch, true);
        document.documentElement.removeEventListener('touchend', endTouch, true);
        document.documentElement.removeEventListener('touchcancel', endTouch, true);
    };



    // Tratamiento de eventos de ratón ---------------------------------------------------------------------------------
    /**
     * Tratamiento del inicio de un evento de ratón.
     * @param event
     */
    var startMouse = function(event) {

        var now = performance.now();

        // 1. Evaluamos si el último evento se trata de un evento táctil y comprobamos el tiempo transcurrido para
        // descartar el evento de ratón si el tiempo es mínimo
        if (lastEvent && (now - lastEvent.time) < 300) {
            event.preventDefault();
            return;
        }

        // 2. Si no se descarta se continua el tratamiento normalmente
        lastEvent = {
            time: now
        };
        document.documentElement.addEventListener('mouseup', endMouse, true);
        document.documentElement.addEventListener('mouseleave', endMouse, true);
    };

    /**
     * Tratamiento del final de un evento de ratón.
     * @param event
     */
    var endMouse = function(event) {
        lastEvent = {
            time: performance.now()
        };

        // Se evalua si lanzar el evento "tap"
        if (event.type === 'mouseup') {
            var tap = new CustomEvent('tap', {
                detail: {},
                bubbles: true
            });
            event.target.dispatchEvent(tap);
            event.preventDefault();
        }

        // Se elimina el tratamiento de eventos
        document.documentElement.removeEventListener('mouseup', endMouse, true);
        document.documentElement.removeEventListener('mouseleave', endMouse, true);
    };

    // Funciones de utilidad -------------------------------------------------------------------------------------------
    /**
     *
     * @param type
     * @param details
     */
    var fire = function(target, type, detail) {
        var event = new CustomEvent(type, {
            detail: detail,
            bubbles: true
        });
        target.dispatchEvent(event);
    };

    // Inicialización --------------------------------------------------------------------------------------------------
    // Se añade los manejadores de eventos iniciales
    document.documentElement.addEventListener('touchstart', startTouch, true);
    document.documentElement.addEventListener('mousedown', startMouse, true);
})();

/**
 * Representa una entrada del mapa de seguimiento de eventos de interacción táctil o de ratón.
 * @typedef {Object} TrackEntry
 * @property {string} id Identificador del método de interacción táctil (touch) o de ratón (mouse) seguido del
 * identificador del punto de contacto en eventos táctiles (touch:0, touch:1...).
 * @property {number} startTime Tiempo de inicio de la secuencia de eventos.
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
 * @property {number} pressTimeout Temporizador para lanzar el evento de pulsación larga (press).
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Touch/identifier
 */
