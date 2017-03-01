/*
 * UIX Library.
 * @author angel.teran
 */

var uix = {

    /**
     * TODO: Documentar...
     */
    ready: function(callback) {
        if (document.readyState !== 'loading') {
            callback();
        } else {
            document.addEventListener('DOMContentLoaded', callback);
        }
    },

    /**
     * Carga de ficheros externos: scripts, hojas de estilo y demás.
     * @param {{type: string, href: string}[]} files Ficheros a cargar.
     * @param {function} Función de retorno que se llamará al completar la carga de todos los ficheros.
     */
    require: function(files, callback) {
        var head = document.getElementById('head')[0],
            count = files.length,
            check = function() {
                count--;
                if (count === 0) {
                    callback();
                }
            };
        for (var i = 0, e; i < files.length; i++) {
            if (files.type === 'script') {
                e = document.createElement('script');
                e.type = 'text/javascript';
                e.src = href;
            } else {
                e = document.createElement('link');
                e.type = 'text/css';
                e.rel = 'stylesheet';
                e.href = href;
            }
            e.onload = check;
            head.appendChild(e);
        }
    },

    // Utility Functions
    // -----------------------------------------------------------------------------------------------------------------
    /**
     * Implementación de la función forEach para cualquier objeto con estructura de Array, aunque no lo sea.
     * @param {*[]} array Objeto tipo Array especificado.
     * @param {function(value: *, index: number, array: Object)} callback Función de iteración.
     * @param {Object} scope Objeto "this".
     */
    forEach: function(array, callback, scope) {
        for (var i = 0; i < array.length; i++) {
            callback.call(scope, array[i], i);
        }
    },

    // AJAX
    // -----------------------------------------------------------------------------------------------------------------
    /**
     * Simplifica el envío de peticiones HTTP a través del objeto XMLHttpRequest.
     * @param {string} url Dirección URL especificada.
     * @param {Object|function} options Opciones y ajustes adicionales.
     * @param {string} [options.method] Método HTTP a emplear.
     * @param {Object} [options.data] Datos a enviar.
     * @param {boolean} [options.json] Indica si enviar los datos en formato JSON.
     * @param {number=} [options.timeout] Tiempo máximo para procesar la petición.
     * @param {function(err: ?Error, data: Object=)} [options.complete] Función de retorno.
     * @param {function(err: ?Error, data: Object=)} [complete] Función de retorno.
     */
    load: function(url, options, complete) {
        var defaults = {
            method: 'GET'
        };
        if (typeof(options) === 'function') {
            complete = options;
            options = defaults;
        } else if (options) {
            options.method = options.method || (options.data ? 'POST' : 'GET');
            if (!complete) {
                complete = options.complete;
            }
        } else {
            options = defaults;
        }
        // Parámetros de consulta (query)
        if (options.data && options.method === 'GET') {
            var parts = URL.parse(url);
            url = parts.pathname + '?' + URL.formatQuery(parts.query ? Object.extend(parts.query, options.data) : options.data);
            if (parts.hash) {
                url += '#' + parts.hash;
            }
        }
        // Se realiza la petición
        var xhr = new XMLHttpRequest();
        xhr.open(options.method, url, true);
        // Manejo de eventos
        xhr.addEventListener('load', function() {
            var data = null, error = null,
                type = xhr.getResponseHeader('Content-Type');
            if (uix.isJSON(type)) {
                try {
                    data = JSON.parse(xhr.responseText);
                } catch (e) {
                    error = new Error('Unable to convert response to JSON: ' + e);
                    error.name = 'parse_error';
                    error.cause = e;
                }
            } else {
                data = xhr.responseText;
            }
            if (xhr.status >= 200 && xhr.status < 300) {
                complete(error, data);
            } else {
                var err = new Error('Unable to load \'' + url + '\': ' + xhr.statusText + ' (' + xhr.status + ')');
                err.status = xhr.status;
                err.cause = error;
                // Se complementa el error con la información adicional obtenida
                err.data = data;
                complete(err);
            }
        }, false);
        xhr.addEventListener('error', function() {
            complete(new Error('Unable to load \'' + url + '\'.'));
        }, false);
        // Envío de datos
        var data = null;
        if (options.data && options.method === 'POST') {
            if (options.json) {
                xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
                data = JSON.stringify(options.data);
            } else {
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
                data = URL.formatQuery(options.data);
            }
        }
        // Timeout por defecto (10 sg)
        xhr.timeout = (options.timeout === undefined) ? 10000 : options.timeout;
        xhr.ontimeout = function() {
            complete(new Error('Timeout loading \'' + url + '\'.'));
        }
        // Se envía la petición
        xhr.send(data);
    },

    /**
     * Comprueba si el tipo MIME especificado es de tipo JSON.
     * @param {string} mime
     * @return {boolean}
     */
    isJSON: function(type) {
        return /[\/+]json\b/.test(type);
    },

    // Classes
    // -----------------------------------------------------------------------------------------------------------------
    /**
     * Añade uno o varios nombres de clases en el elemento especificado.
     * @param {Element} el Elemento especificado.
     * @param {string|string[]} name Nombre de una o varias clases de estilo.
     * @return {Element} Devuelve el elemento especificado.
     */
    addClass: function(el, name) {
        if (Array.isArray(name)) {
            for (var i = 0; i < name.length; i++) {
                el.classList.add(name[i]);
            }
        } else {
            el.classList.add(name);
        }
        return el;
    },

    /**
     * Elimina uno o varios nombres de clases del elemento especificado.
     * @param {Element} el Elemento especificado.
     * @param {string|string[]|function(name: string)} name Nombre de una o varias clases de estilo.
     * Si se especifica una función se le pasa cada una de las clases añadidas eliminándose aquellas para las que la
     * función devuelve verdadero.
     * @return {Element} Devuelve el elemento especificado.
     */
    removeClass: function(el, name) {
        if (typeof(name) === 'function') {
            var filter = name;
            for (var i = el.classList.length - 1; i >= 0; i--) {
                if (filter(name = el.classList.item(i))) {
                    el.classList.remove(name);
                }
            }
        } else if (Array.isArray(name)) {
            for (var i = 0; i < name.length; i++) {
                el.classList.remove(name[i]);
            }
        } else {
            el.classList.remove(name);
        }
        return el;
    },

    /**
     * Añade o elimina uno o varios nombres de clases del elemento especificado.
     * @param {Element} el Elemento especificado.
     * @param {string|string[]} name Nombre de una o varias clases.
     * @param {boolean} toggle Indica si añadir o eliminar la clase o clases especificadas.
     * @return {Element} Devuelve el elemento especificado.
     */
    toggleClass: function(el, name, toggle) {
        if (Array.isArray(name)) {
            for (var i = 0; i < name.length; i++) {
                el.classList.toggle(name[i], toggle);
            }
        } else {
            el.classList.toggle(name, toggle);
        }
        return el;
    },

    /**
     * Comprueba si un nombre de clase está añadido en el elemento especificado.
     * @param {Element} el Elemento especificado.
     * @param {string} name Nombre de clase especificado.
     * @return {boolean} Devuelve verdadero si el nombre está añadido y falso en caso contrario.
     */
    hasClass: function(el, name) {
        return el.classList.contains(name);
    },

    /**
     * Devuelve la parte final del nombre de la primera clase añadida que empiece por el prefijo especificado.
     * @param {Element} el Elemento especificado.
     * @param {string} prefix Prefijo especificado.
     * @return {string=} Devuelve la cadena resultante o nulo si no se encuentra ninguna clase.
     */
    getClassEnding: function(el, prefix) {
        var filter = name;
        for (var i = 0, name; i < el.classList.length; i++) {
            if ((name = el.classList.item(i)).startsWith(prefix)) {
                return name.substr(prefix.length);
            }
        }
        return null;
    },

    // Traversing
    // -----------------------------------------------------------------------------------------------------------------
    /**
     * TODO: Documentar...
     */
    child: function (el, selector) {
        for (el = el.firstElementChild; el !== null; el = el.nextElementSibling) {
            if (uix.matches(el, selector)) {
                return el;
            }
        }
        return null;
    },

    /**
     * TODO: Documentar...
     */
    children: function (el, selector) {
        var children = [];
        for (el = el.firstElementChild; el !== null; el = el.nextElementSibling) {
            if (!selector || uix.matches(el, selector)) {
                children.push(el);
            }
        }
        return children;
    },

    // Siblings --------------------------------------------------------------------------------------------------------
    /**
     * TODO: Documentar...
     */
    siblings: function (e, selector) {
        var siblings = [];
        e = e.parentNode.firstChild;
        do {
            if (!selector || uix.matches(e, selector)) {
                siblings.push(e);
            }
        } while (e = e.nextSibling);
        return siblings;
    },

    /**
     * TODO: Documentar...
     */
    firstSibling: function (e, selector) {
        e = e.parentNode.firstChild;
        do {
            if (!selector || uix.matches(e, selector)) {
                return e;
            }
        } while (e = e.nextSibling);
        return null;
    },

    /**
     * TODO: Documentar...
     */
    lastSibling: function (e, selector) {
        e = e.parentNode.lastChild;
        do {
            if (!selector || uix.matches(e, selector)) {
                return e;
            }
        } while (e = e.previousSibling);
        return null;
    },

    /**
     * TODO: Documentar...
     */
    nextAllSiblings: function (e, selector) {
        var siblings = [];
        while (e = e.nextSibling) {
            if (!selector || uix.matches(e, selector)) {
                siblings.push(e);
            }
        }
        return siblings;
    },

    /**
     * TODO: Documentar...
     */
    prevAllSiblings: function (e, selector) {
        var siblings = [];
        while (e = e.previousSibling) {
            if (!selector || uix.matches(e, selector)) {
                siblings.push(e);
            }
        }
        return siblings;
    },

    /**
     * TODO: Documentar...
     */
    nextSibling: function (e, selector) {
        while (e = e.nextSibling) {
            if (!selector || uix.matches(e, selector)) {
                return e;
            }
        }
        return null;
    },

    /**
     * TODO: Documentar...
     */
    prevSibling: function (e, selector) {
        var siblings = [];
        while (e = e.previousSibling) {
            if (!selector || uix.matches(e, selector)) {
                return e;
            }
        }
        return null;
    },

    /**
     * TODO: Documentar...
     */
    insertAfter: function(node, prev) {
        prev.parentNode.insertBefore(node, prev.nextSibling);
    },

    // -----------------------------------------------------------------------------------------------------------------
    /**
     * TODO: Documentar...
     */
    matches: function (el, selector) {
        return (el.matches ||
                el.matchesSelector ||
                el.mozMatchesSelector ||
                el.msMatchesSelector ||
                el.oMatchesSelector ||
                el.webkitMatchesSelector ||
                function (selector) {
                    var nodes = (el.parentNode || el.document || el.ownerDocument).querySelectorAll(selector),
                        i = -1;
                    while (nodes[++i] && nodes[i] !== el);
                    return !!nodes[i];
                }
            ).call(el, selector);
    },

    /**
     * TODO: Documentar...
     */
    closest: function(el, selector, context) {
        do {
            if (this.matches(el, selector)) {
                return el;
            }
        } while ((el = el.parentElement) && el !== context);
        return null;
    },


    /**
     * Elimina el elemento o elementos especificados.
     * @param {Element|Element[]|NodeList} Element o elementos especificados.
     */
    remove: function(el) {
        if (el instanceof NodeList) {
            for (var i = el.length - 1; i >= 0; i--) {
                el[i].parentNode.removeChild(el[i]);
            }
        } else {
            el.parentNode.removeChild(el);
        }
    },

    /**
     * TODO: Documentar...
     */
    empty: function(el) {
        while (el.firstChild) {
            el.removeChild(el.firstChild);
        }
    },

    // Visualization ---------------------------------------------------------------------------------------------------
    hide: function(e, time, complete) {
        TweenMax.to(e, time, {
            autoAlpha: 0,
            onComplete: function() {
                e.style.display = 'none';
                if (complete && typeof(complete) === 'function') {
                    complete();
                }
            }
        });
    },

    show: function(e, time, complete) {
        e.style.display = '';  // TODO: Falta el REFLOW
        TweenMax.to(e, time, {
            autoAlpha: 1,
            onComplete: function () {
                if (complete && typeof(complete) === 'function') {
                    complete();
                }
            }
        });
    },

    /**
     * Oculta o visualiza un elemento realizando la transición por CSS especificada.
     * @param {Element} el Elemento especificado.
     * @param {function} [el.toggleListener] Manejador de evento 'transitionend' asociado al elemento.
     * @param {boolean|Object} [show] Indica si mostrar u ocultar el elemento. Si no se especifica se visualiza u oculta
     * según su estado actual. Como alternativa se puede especificar las opciones adicionales siguientes.
     * @param {Object} [options] Opciones adicionales.
     * @param {boolean} [options.show] Indica si mostrar u ocultar el elemento.
     * @param {string} [options.transition] Nombre de transición a realizar.
     * @param {number} [options.duration] Duración de la transición en segundos.
     * @param {boolean} [options.reverse] Indica si invertir el sentido de la transición.
     * @param {function} [options.start] Función que se llamará al iniciar transición.
     * @param {function} [options.done] Función que se llamará al finaliztogglear la transición.
     * @param {boolean} [options.inmediate] Indica si iniciar la transición inmediatamente o esperar al siguiente ciclo
     * de animación llamando a window.requestAnimationFrame().
     * @param {function} [options.displayNone] Como alternativa programática a la clase '--display-none', indica si
     * poner el 'display' a 'none' al ocultar el elemento.
     */
    toggle2: function(el, show, options) {
        // Debug
        // var log = function(msg) {
        //     console.log('[' + performance.now().toFixed(3) + '] toggle(' + el.id + ', ' + show + ') > ' + msg);
        // };
        // Tratamiento de parámetros
        if (typeof show === 'object' && show !== null && !Array.isArray(show)) {
            // ...(el, options)
            options = show;
            show = options.show;
        } else {
            // ...(el, show, options)
            if (options == null || typeof options !== 'object' || Array.isArray(options)) {
                options = {};
            } else if (show == null) {
                show = options.show;
            }
        }
        // -------------------------------------------------------------------------------------------------------------
        // Notifica el inicio y final de la transición secuencialmente
        var notify = function() {
            if (options.start) {
                options.start();
            }
            if (options.done) {
                options.done();
            }
        }
        // Se comprueba si el elemento está oculto
        var hidden = uix.hasClass(el, 'ui-hide') && !el.dataset.toggling || el.dataset.toggling === 'hide';
        // log('is hidden? ' + hidden);
        if (show == null) {
            show = hidden;
        } else if (show && !hidden || !show && hidden) {
            // Aunque no sea necesario realizar la transición se notifica el inicio y final de la transición si se han
            // especificado los callbacks
            return notify();
        }

        /**
         * Limpia el estado de la transición.
         * @param {Element} el Elemento especificado.
         */
        var clear = function(el) {
            // log('clearing...');
            // Se comprueba si se ha añadido un manejador para el evento de finalización de transición para eliminarlo
            var toggleEndListener = uix.getState(el, 'toggleEndListener');
            if (toggleEndListener) {
                el.removeEventListener('transitionend', toggleEndListener);
                uix.clearState(el, 'toggleEndListener');
            }
            // Si se llamó a requestAnimationFrame() se cancela la petición
            var toggleAnimationId = uix.getState(el, 'toggleAnimationId');
            if (toggleAnimationId) {
                window.cancelAnimationFrame(toggleAnimationId);
                uix.clearState(el, 'toggleAnimationId');
            }
            // Se eliminan las clases de transición y propiedades de estilo añadidas
            uix.removeClass(el, [el.dataset.transitionClass, 'ui-reverse']);
            delete el.dataset.transitionClass;
            el.style.transitionDuration = '';
            delete el.dataset.toggling;
        };
        // Si el elemento está en proceso de transición se reinicia o limpia su estado
        if (el.dataset.toggling) {
            clear(el);
        }
        // Se comprueba si es necesario hacer la transición
        hidden = uix.hasClass(el, 'ui-hide');
        if (show && !hidden || !show && hidden) {
            // Se notifica el inicio y final de la transición secuencialmente
            return notify();
        }
        // Se realiza la transición
        var transition = options.transition || el.dataset.transition;
        if (transition && transition !== 'none') {
            // Con esta propiedad se indica que el elemento está en proceso de transición y a que estado (show o hide)
            el.dataset.toggling = show ? 'show' : 'hide';
            // log('toggling: ' + el.dataset.toggling);
            // Se prepara la transición añadiendo las clases necesarias
            el.style.transition = 'none'; // -> Se añade para evitar que se ejecute la transición inicialmente
            uix.addClass(el, el.dataset.transitionClass = 'ui-transition-' + transition);
            if (options.reverse) {
                uix.addClass(el, 'ui-reverse');
            }
            // Se comprueba la propiedad display
            if (show && el.style.display === 'none') {
                el.style.display = '';
            }
            // Se fuerza el REFLOW del elemento
            el.offsetHeight + el.offsetWidth;
            // Se controla el final de la transición
            var done = function(event) {
                // log('done!');
                if (event.target !== el) {
                    return;
                }
                clear(el);
                // Se comprueba la propiedad display
                if (!show && (options.displayNone || uix.hasClass(el, '--display-none'))) {
                    el.style.display = 'none';
                }
                // Se notifica que la transición ha finalizado
                if (options.done) {
                    options.done();
                }
            };
            el.addEventListener('transitionend', uix.putState(el, 'toggleEndListener', done));
            // Función de inicio de la transición
            var start = function() {
// log('start!');
                // Se inicia la transición
                el.style.transition = ''; // -> Se elimina para activar la transición
                // Si se ha especificado duración se añade la definición
                if (options.duration) {
                    el.style.transitionDuration = options.duration + 's';
                }
// log((show ? 'Removing' : 'Adding') + ' "ui-hide"...');
                uix.toggleClass(el, 'ui-hide', !show);
                // Se notifica que se ha iniciado la transición
                if (options.start) {
                    options.start();
                }
            }
            if (options.inmediate) {
                start();
            } else {
                uix.putState(el, 'toggleAnimationId', window.requestAnimationFrame(start));
            }
        } else {
            // Se añade o quita la clase 'ui-hide'
            uix.toggleClass(el, 'ui-hide', !show);
            // Se fuerza el REFLOW del elemento (por si acaso)
            el.offsetHeight + el.offsetWidth;
            // Se notifica el inicio y final de la transición secuencialmente
            notify();
        }
    },

    /**
     * Oculta o visualiza un elemento realizando la transición por CSS especificada.
     * @param {Element} el Elemento especificado.
     * @param {boolean|Object} [show] Indica si mostrar u ocultar el elemento. Si no se especifica se visualiza u oculta
     * según su estado actual. Como alternativa se puede especificar las opciones adicionales siguientes.
     * @param {Object} [options] Opciones adicionales.
     * @param {boolean} [options.show] Indica si mostrar u ocultar el elemento.
     * @param {string} [options.transition] Nombre de transición a realizar.
     * @param {number} [options.duration] Duración de la transición en segundos.
     * @param {boolean} [options.reverse] Indica si invertir el sentido de la transición.
     * @param {function} [options.done] Función que se llamará al finalizar la transición.
     * @param {function} [options.displayNone] Como alternativa programática a la clase '--display-none', indica si
     * poner el 'display' a 'none' al ocultar el elemento.
     */
    toggle: function(el, show, options) {
        // DEBUG {{
        var log = function(msg) {
            console.log('[' + performance.now().toFixed(3) + '] toggle(' + el.id + ', ' + show + ') > ' + msg);
        };
        // }}
        // Tratamiento de parámetros
        if (typeof show === 'object' && show !== null && !Array.isArray(show)) {
            options = show;
            show = null;
        }
        options = options || {};
        if (show == null) {
            show = options.show;
        }
        // -------------------------------------------------------------------------------------------------------------
        // Se comprueba si el elemento está oculto y si es necesario hacer la transición
        var hidden = uix.hasClass(el, 'ui-hide');
        if (show == null) {
            show = hidden;
        } else if (show && !hidden || !show && hidden) {
            if (options.done) {
                options.done();
            }
            return;
        }

        /**
         * Limpia el estado de la transición.
         */
        var clearState = function() {
            // Se elimina el tratamiento del evento de fin de transición (transitionend)
            var toggleTransitionEnd = uix.getState(el, 'toggleTransitionEnd');
            if (toggleTransitionEnd) {
                el.removeEventListener('transitionend', toggleTransitionEnd);
                uix.clearState(el, 'toggleTransitionEnd');
            }
            // Se elimina el timeout añadido
            var toggleTimeout = uix.getState(el, 'toggleTimeout');
            if (toggleTimeout) {
                clearTimeout(toggleTimeout);
                uix.clearState(el, 'toggleTimeout');
            }
        };

        /**
         * Finaliza la transición.
         */
        var complete = function(clear) {
            // Se limpia el estado
            if (clear) {
                clearState();
            }
            // Se cambia la propiedad display cuando corresponda
            if (!show && (options.displayNone || uix.hasClass(el, '--display-none'))) {
                el.style.display = 'none';
            }
            // Se notifica el final de la transición
            if (options.done) {
                options.done();
            }
        };

        // Se limpia el estado inicialmente
        clearState();

        // Se comprueba si se ha especificado transición, via opciones o por clase de estilo (ui-transition-)
        var transitionClass = uix.getClassEnding(el, 'ui-transition-');
        var transition = options.transition || transitionClass;

        if (transition && transition !== 'none') {
            // En caso de transición siempre añadimos la propiedad de estilo "transition" a "none" para evitar que se
            // ejecute la transición antes de empezar
            el.style.transition = 'none';
            // Se añade la clase de transición
            if (transition !== transitionClass) {
                if (transitionClass) {
                    uix.removeClass(el, 'ui-transition-' + transitionClass);
                }
                uix.addClass(el, 'ui-transition-' + transition);
            }
            // Se comprueba si invertir la transición
            if (!!options.reverse != uix.hasClass(el, 'ui-reverse')) {
                uix.toggleClass(el, 'ui-reverse', !!options.reverse);
                // NOTE: La opción de invertir la transición solo se puede especificar programáticamente, no añadiendo
                // manualmente la clase "ui-reverse".
            }
            // Se comprueba la propiedad display
            if (show && el.style.display === 'none') {
                el.style.display = '';
            }
            // Se fuerza el reflow en cualquier caso
            el.offsetHeight + el.offsetWidth;
            // Se vacía la propiedad de estilo "transition"
            el.style.transition = '';
            // Si se ha especificado una duración se añade
            if (options.duration) {
                el.style.transitionDuration = options.duration + 's';
            }
            // Se añade o elimina la clase "ui-hide"
            uix.toggleClass(el, 'ui-hide', !show);
            // Se añade el tratamiento del evento
            el.addEventListener('transitionend', uix.putState(el, 'toggleTransitionEnd', function(event) {
                if (event.target === el) {
                    // DEBUG {{
                    log('toggleTransitionEnd: ' + event.propertyName);
                    // }}
                    complete(true);
                }
            }), false);
            // NOTE: Siempre que añadamos el tratamiento del evento "transitionend" añadimos un timeout por si acaso
            // no se recibe el evento.
            uix.putState(el, 'toggleTimeout', setTimeout(function() {
                // DEBUG {{
                log('toggleTimeout!');
                // }}
                complete(true);
            }, uix.getTransitionTimeout(el) + 500)); // NOTE: Le añadimos un margen adicional de 100 ms
        } else {
            // Si hay clase de transición se anula añadiendo la propiedad "transition" a "none"
            if (transitionClass) {
                el.style.transition = 'none';
            }
            // Se comprueba la propiedad display
            if (show && el.style.display === 'none') {
                el.style.display = '';
            }
            // Se fuerza el reflow en cualquier caso
            el.offsetHeight + el.offsetWidth;
            // Se añade o elimina la clase "ui-hide"
            uix.toggleClass(el, 'ui-hide', !show);
            // Se notifica el final de la transición
            complete();
        }
    },

    /**
     * Evalua si el elemento especificado está visible o no.
     * @param {Element} el Elemento especificado.
     * @param {boolean} [toggling=false] Indica si considerar la lógica de la función uix.toggle().
     * @return {boolean} Devuelve verdadero si está visible o falso en caso contrario.
     */
    isVisible: function(el, toggling) {
        return !uix.hasClass(el, 'ui-hide') && (!toggling || (!el.dataset.toggling || el.dataset.toggling === 'hide'));
    },

    /**
     * Devuelve la duración mayor en milisegundos de la transición definida incluyendo el delay inicial.
     * @param {Element} el Elemento especificado.
     * @return {number} Duración en milisegundos o 0 si no está definida.
     */
    getTransitionTimeout: function(el) {
        var timeout = 0;
        var cs = window.getComputedStyle(el, null);
        var delays = cs.transitionDelay.split(',');
        for (var i = 0; i < delays.length; i++) {
            delays[i] = uix.parseTime(delays[i]);
        }
        var durations = cs.transitionDuration.split(',');
        for (var i = 0, d; i < durations.length; i++) {
            var d = uix.parseTime(durations[i]) + delays[i % delays.length];
            if (d > timeout) {
                timeout = d;
            }
        }
        return timeout;
    },

    /**
     * Parsea una cadena de tiempo o duración especificada en segundos o milisegundos, incluyendo siempre la unidad
     * (s/ms) y devuelve el número de milisegundos resultante.
     * @param {string} str Cadena especificada.
     * @return {number} Número de milisegundos.
     */
    parseTime: function(str) {
        var time = 0;
        var match = /([\d.]+)(s|ms)/i.exec(str);
        if (match) {
            time = parseFloat(match[1]);
            if (match[2] === 's') {
                time *= 1000;
            }
        }
        return time;
    },

    /**
     * Muestra el desplegable especificado controlando que al hacer click fuera del mismo se oculte.
     * @param {Element} dropdown Elemento que contiene el desplegable especificado.
     * @param {Event} evento Evento original.
     */
    toggleDropdown: function(dropdown, event) {
        // TODO: De momento pasamos el evento original como mecanismo para evitar que el mismo evento que causa la
        // visualización del desplegable no cause la ocultación inmediata, pero esto no funcionará cuando el evento que
        // desencadena la visualización no es del mismo tipo del que usamos para la ocultación.
        // Quizás la mejor opción es retrasar unos instances la adición del evento en el documento de forma que
        // cualquier evento tratado sea posterior al flujo de visualización.
        if (uix.hasClass(dropdown, 'hide')) {
            var doc = dropdown.ownerDocument,
                hide = function (ev) {
                    if (ev !== event) {
                        uix.toggle(dropdown, false);
                        doc.removeEventListener('click', hide, false);
                    }
                };
            uix.toggle(dropdown, true);
            doc.addEventListener('click', hide, false);

            // Corregimos la posición del desplegable si se sale de pantalla
            uix.fixPosition(dropdown, true);
        }
    },

    // Styles ----------------------------------------------------------------------------------------------------------
    /**
     * Devuelve un objeto o array asociativo con las propiedades de estilo computadas del elemento especificado.
     * @param {Element} elem Elemento especificado.
     * @return {Object} Array asociativo con los nombres de propiedades en formato de definición (no Camel Case), y sus
     * correspondientes valores.
     */
    computeStyle: function(elem) {
        var styles = {},
            cs = document.defaultView.getComputedStyle(elem, null);
        for (var i = 0; i < cs.length; i++) {
            // NOTE: Filtramos todas las propiedades que contengan la cadena "-origin" ???
            // if (cs[i].indexOf("-origin") === -1) {
            styles[cs[i]] = cs.getPropertyValue(cs[i]);
            // }
        }
        return styles;
    },

    /**
     * Devuelve un array con los nombres de las propiedades de estilo contenidas en los objetos especificados y que
     * tengan valores diferentes.
     * @param {Object} s1 Objeto de propiedades 1.
     * @param {Object} s2 Objeto de propiedades 2.
     * @param {boolean} [clear] Indica si eliminar de los objetos especificados las propiedades que no cambian.
     * @return {Object} Array resultante.
     */
    stylesDiff: function(s1, s2, clear) {
        var diff = [];
        for (var k in s1) {
            if (s1[k] !== s2[k]) {
                diff.push(k);
            } else if (clear) {
                delete s1[k];
                delete s2[k];
            }
        }
        return diff;
    },

    /**
     * Devuelve las coordenadas: posición (top, left), dimensiones (width, height) y límites inferior y derecho (bottom,
     * right) del elemento con respecto al documento o al elemento contenedor especificado.
     * @param {Element} el Elemento especificado.
     * @param {Element} [parent] Elemento contenedor hasta donde ampliar el cálculo de coordenadas. Si no se especifica
     * serán relativas al documento (0, 0).
     * @return {{top: number, left: number, bottom: number, right: number, width: number, height: number}} Coordenadas
     * obtenidas.
     */
    offset: function(el, parent) {
        var rect = {
            top: el.offsetTop,
            left: el.offsetLeft,
            width: el.offsetWidth,
            height: el.offsetHeight
        }
        while ((el = el.offsetParent) && el !== parent) {
            rect.top += el.offsetTop;
            rect.left += el.offsetLeft;
        }

        // Añadimos los límites inferior y derecho
        rect.bottom = rect.top + rect.height;
        rect.right = rect.left + rect.width;

        return rect;
    },

    /**
     * Corrige la posición absoluta del elemento especificado si se sale de pantalla o de los límites del elemento padre
     * especificado.
     * @param {Element} el Elemento especificado.
     * @param {boolean} [clear] Indica si limpiar el ajuste realizado previamente.
     * @param {Element} [parent] Elemento padre especificado.
     */
    fixPosition: function(el, clear, parent) {
        if (clear) {
            el.style.top = '';
            el.style.left = '';
        }

        // Si se especifica un elemento contenedor se ajusta primero la posición con respecto al mismo y posteriormente
        // con respecto a la ventana
        var vw, vh,
            bounds, w, h,
            offset = {
                top: 0,
                left: 0
            };
        if (parent) {
            vw = parent.clientWidth;
            vh = parent.clientHeight;

            bounds = uix.offset(el, parent);
            if (el.offsetParent) {
                offset = uix.offset(el.offsetParent, parent);
            }
        } else {
            vw = window.innerWidth;
            vh = window.innerHeight;

            bounds = el.getBoundingClientRect();
            if (el.offsetParent) {
                offset = el.offsetParent.getBoundingClientRect();
            }
        }

        // Calculamos las dimensiones alto y ancho
        bounds.width = bounds.right - bounds.left;
        bounds.height = bounds.bottom - bounds.top;
        // NOTE: En la mayoría de los casos ya estarán incluidas en las coordenadas obtenidas, pero por si acaso las
        // calculamos aparte (puede ser el caso de Opera)

        if (bounds.top < 0) {
            el.style.top = 0;
        } else if (bounds.bottom > vh) {
            el.style.top = vh - bounds.height - offset.top + "px";
        }
        if (bounds.left < 0) {
            el.style.left = 0;
        } else if (bounds.right > vw) {
            el.style.left = vw - bounds.width - offset.left + "px";
        }

        // Si se ha especificado un elemento contenedor se realiza un segundo ajuste para ver si además se sale de
        // pantalla
        if (parent) {
            this.fixPosition(el, false);
        }
    },

    // Almacenamiento de datos asociados a elementos del DOM -----------------------------------------------------------
    /**
     * Mapa de asignación de almacenamiento de datos o estado asociado a elementos del DOM por identificador.
     * @type {Object.<number, Object>}
     */
    _stateMap: {},

    /**
     * Siguiente identificador para vincular un elemento a un almacenamiento de datos.
     * @type {number}
     */
    _stateNextId: 1,

    /**
     * Guarda el estado especificado asociado al elemento.
     * @param {Element} el Elemento especificado.
     * @param {string|Object} name Nombre u objeto de datos a almacenar.
     * @param {*} value Datos a almacenar.
     * @return {*} Devuelve el valor o datos almacenados.
     */
    putState: function(el, name, value) {
        var id = el.dataset.stateId, state;
        if (id) {
            state = this._stateMap[id];
        } else {
            el.dataset.stateId = id = this._stateNextId++;
        }
        if (!state) {
            state = this._stateMap[id] = {};
        }
        if (typeof(name) === 'object') {
            Object.extend(state, name);
            return name;
        } else {
            return state[name] = value;
        }
    },

    /**
     * Devuelve el estado asociado a un elemento.
     * @param {Element} el Elemento especificado.
     * @param {string} [name] Nombre de variable a obtener. Si es nula o no se especifica devuelve el objeto de datos
     * asociado al completo y modificable.
     */
    getState: function(el, name) {
        var id = el.dataset.stateId, state;
        if (id && (state = this._stateMap[id])) {
            return (name) ? state[name] : state;
        }
        return null;
    },

    /**
     * Borra o elimina la variable especificada o en caso de omisión, el objeto de datos asociado al completo.
     * @param {Element} el Elemento especificado.
     * @param {string} [name] Nombre de variable a eliminar. Si es nula o no se especifica elimina el objeto de datos al
     * completo.
     */
    clearState: function(el, name) {
        var id = el.dataset.stateId, state;
        if (id && (state = this._stateMap[id])) {
            if (name) {
                delete state[name];
            } else {
                delete this._stateMap[id];
            }
        }
    },

    // Utilities -------------------------------------------------------------------------------------------------------
    /**
     * Muestra un diálogo de mensaje con las opciones especificadas.
     * @param {Object} options Opciones para mostrar el diálogo.
     * @param {string} [options.id] Identificador del elemento raíz del diálogo.
     * @param {string} [options.type] Tipo de diálogo: info, warn, error, etc.
     * @param {string} [options.icon] Nombre del icono a mostrar. Si se omite se tomará el tipo como nombre de icono.
     * @param {string} [options.styleClass] Clases de estilo adicionales a incluir en el elemento raíz.
     * @param {string} [options.text1] Texto principal.
     * @param {string} [options.text2] Texto secundario.
     * @param {{text: string, handler: function, styleClass: string}[]} [options.actions] Array de acciones o botones a
     * incluir en el diálogo.
     * @param {Element} [context] Elemento contenedor destino donde añadir el diálogo y la capa de ocultación si no
     * contiene una. En caso de omisión se añadirán en el cuerpo del documento.
     * @return {Element} Elemento contenedor del diálogo creado.
     */
    showMessageDialog: function(options, context) {
        var doc;
        if (context === undefined) {
            context = (doc = document).body;
        } else {
            doc = context.ownerDocument;
        }

        // Se busca la capa de ocultación en los descendientes directos del elemento especificado
        var overlay = uix.child(context, '.ui-overlay');
        if (!overlay) {
            // Si no existe se crea
            overlay = doc.createElement('div');
            overlay.setAttribute('class', 'ui-overlay hide');
            context.appendChild(overlay);
        }

        // Evaluamos el tipo de diálogo (por defecto de aviso)
        if (!options.type) {
            options.type = 'warn';
        }

        // Se genera la estructura del diálogo y se añade al contexto
        var dialog = doc.createElement('div');
        if (options.id) {
            dialog.setAttribute('id', options.id);
        }
        var styleClass = 'ui-dialog ui-dialog-' + options.type;
        if (options.styleClass) {
            styleClass += ' ' + options.styleClass;
        }
        styleClass += ' hide';
        dialog.setAttribute('class', styleClass);

        // Icono
        if (!options.icon) {
            options.icon = options.type;
        }

        var body;
        if (options.icon) {
            var icon = doc.createElement('span');
            icon.setAttribute('class', 'ui-dialog-icon icon-' + options.icon);
            dialog.appendChild(icon);

            // Cuerpo
            body = doc.createElement('div');
            body.setAttribute('class', 'ui-dialog-body');
            dialog.appendChild(body);
        } else {
            // Si no lleva icono no es necesario añadir una capa adicional
            body = dialog;
        }

        // Texto 1
            if (options.text1) {
            var text1 = doc.createElement('h1');
            text1.appendChild(doc.createTextNode(options.text1));
            body.appendChild(text1);
        }

        // Texto 2
        if (options.text2) {
            var text2 = doc.createElement('h2');
            text2.appendChild(doc.createTextNode(options.text2));
            body.appendChild(text2);
        }

        // Acciones
        if (!options.actions) {
            options.actions = {
                'Close': function () {
                    uix.hideMessageDialog(dialog);
                }
            };
        }

        if (typeof(options.actions) === 'object') {
            var actions = doc.createElement('div');
            actions.setAttribute('class', 'ui-actions');

            var add = function(text, handler, styleClass) {
                var button = doc.createElement('button');
                button.setAttribute('class', 'ui-button' + (styleClass ? ' ' + styleClass : ''));
                button.appendChild(doc.createTextNode(text));
                button.addEventListener('click', function(event) {
                    // Se introduce la referencia al diálogo en el evento para que llegue al manejador
                    event.dialog = dialog;
                    handler(event);
                });
                actions.appendChild(button);
            };
            if (Array.isArray(options.actions)) {
                for (var i = 0; i < options.actions.length; i++) {
                    add(options.actions[i].text, options.actions[i].handler, options.actions[i].styleClass);
                }
            } else {
                for (var text in options.actions) {
                    add(text, options.actions[text]);
                }
            }
            body.appendChild(actions);
        }

        // Se crea una capa para envolver el diálogo y centrarlo horizontalmente sin necesidad de fijar una anchura
        // NOTE: Esta capa es necesaria para que al posicionar el diálogo en el centro de la pantalla no se limite su
        // anchura a la mitad
        var wrapper = doc.createElement('div');
        wrapper.setAttribute('class', 'ui-dialog-wrapper');
        wrapper.appendChild(dialog);

        // Se guarda la referencia a la capa de ocultación
        dialog.__dialogOverlay = overlay;
        // TODO: Podemos plantearnos implementar un mecanismo diferente para guardar referencias entre elementos u otro
        // datos más estructurados, tipo jQuery.data(), ya que puede ser peligroso guardar variables directamente en los
        // elementos del DOM.

        // Se añade al contexto
        context.appendChild(wrapper);

        // Se inicia la transición de entrada
        window.requestAnimationFrame(function() {
            uix.toggle(overlay, true);
            uix.toggle(dialog, true);
        });

        // Devuelve la referencia al diálogo
        return dialog;
    },

    /**
     * Oculta el diálogo especificado y la capa de ocultación asociada.
     * @param {Element} dialog Elemento contenedor del diálogo.
     * @param {Element} [dialog.__dialogOverlay] Referencia a la capa de ocultación añadida al mostrar el diálogo.
     */
    hideMessageDialog: function(dialog) {
        uix.toggle(dialog, false, {
            done: function() {
                uix.remove(dialog);
            }
        });
        if (dialog.__dialogOverlay) {
            uix.toggle(dialog.__dialogOverlay, false);
        }
    },

    /**
     * Muestra u oculta el indicador de carga que primero se encuentre en el contexto especificado. Si no se especifica
     * ningún contexto se realiza la búsqueda desde la raíz del documento.
     * @param {boolean} show Indica si mostrar u ocultar el indicador.
     * @param {Object} [options] Opciones adicionales. (@see uix.toggle)
     * @param {Element} [options.loader] Referencia al elemento.
     * @param {Element} [options.context] Elemento donde buscar el indicador de carga.
     */
    toggleLoader: function(show, options) {
        console.log('[' + performance.now().toFixed(3) + '] toggleLoader(' + show + ', ' + JSON.stringify(options) + ')');
        var loader = null,
            context = document,
            defaults = {
                transition: 'fade'
            };
        if (options) {
            options = Object.extend(defaults, options);
            if (options.loader) {
                loader = options.loader;
            } else if (options.context) {
                context = options.context;
            }
        } else {
            options = defaults;
        }
        if (!loader) {
            loader = context.querySelector('.ui-loader');
        }
        if (loader) {
            uix.toggle(loader, show, options);
        }
        // TODO: Si no se encuentra podemos generar la estructura y añadirla al documento.
    },


    /**
     * Especificado un elemento con scroll vertical oculta la barra de scroll de sistema y añade una personalizable en
     * apariencia.
     * @param {Element} el Elemento especificado.
     */
    // -----------------------------------------------------------------------------------------------------------------
    // NOTE: Funcionalidad experimental no terminada. El problema aparte de que en Explorer el ajuste de la posición
    // de la barra no es inmediato, es que perdemos la funcionalidad de arrastre con el ratón y eso no nos acaba de
    // gustar.
    // -----------------------------------------------------------------------------------------------------------------
    // customVScroll: function(el) {
    //     // Se construye la barra de scroll
    //     var bar = document.createElement('div');
    //     bar.setAttribute('class', 'ui-vscroll');
    //     var fill = document.createElement('div');
    //     fill.setAttribute('class', 'ui-vscroll-fill');
    //     bar.appendChild(fill);
    //
    //     // Se añade al contenedor
    //     el.appendChild(bar);
    //
    //     // Se ajusta el margen derecho para ocultar la barra de sistema
    //     var margin = (bar.offsetLeft + bar.offsetWidth) - el.offsetWidth;
    //     el.style.marginRight = margin + 'px';
    //
    //     var check = function() {
    //         bar.style.top = el.scrollTop + 'px';
    //         fill.style.height = (100 * el.offsetHeight / el.scrollHeight) + '%';
    //         fill.style.top = (100 * el.scrollTop / el.scrollHeight) + '%';
    //     };
    //
    //     // Se añade el tratamiento de eventos
    //     el.addEventListener('scroll', check);
    // }

};



// =====================================================================================================================
/**
 * Utilidades para manejo de formularios.
 * @type {Object}
 */
uix.forms = {

    /**
     * Muestra un error asociado al campo especificado.
     * @param {Element} field Elemento especificado.
     * @param {string} message Texto del mensaje a mostrar.
     */
    showError: function(field, message) {
        var msg = uix.nextSibling(field, '.ui-error-msg');
        if (msg) {
            msg.innerHTML = message;
        } else {
            field.insertAdjacentHTML('afterend', '<span class="ui-error-msg">' + message + '</span>');
        }
        uix.addClass(field, 'ui-error');
    },

    /**
     * Limpia todos los errores en el formulario o contexto especificado.
     * @param {Element} context Formulario o contexto donde realizar la búsqueda.
     */
    clearErrors: function(context) {
        var errors = context.querySelectorAll('.ui-error');
        for (var i = 0; i < errors.length; i++) {
            var messages = errors[i].parentNode.querySelectorAll('.ui-error-msg');
            for (var j = 0; j < messages.length; j++) {
                uix.remove(messages[j]);
            }
            uix.removeClass(errors[i], 'ui-error');
        }
    }
};



// =====================================================================================================================
// String Functions
// ---------------------------------------------------------------------------------------------------------------------
/**
 * Capitaliza, pone a mayúsculas, la primera letra de la cadena devolviendo
 * la cadena resultante.
 * @return {string} Cadena resultante.
 */
String.prototype.capFirst = function() {
    return (this.charAt(0).toUpperCase() + this.substr(1));
};

/**
 * Capitaliza la primera letra de todas las palabras de la cadena devolviendo
 * la cadena resultante.
 * @return {string} Cadena resultante.
 */
String.prototype.capWords = function() {
    return (this.replace(/(^|\s)(.)/g , function(m, p1, p2) {
        return (p1 + p2.toUpperCase());
    }));
};



// =====================================================================================================================
// Custom Events
// ---------------------------------------------------------------------------------------------------------------------
(function () {

    if (typeof(window.CustomEvent) === "function") {
        return false;
    }

    function CustomEvent(event, params) {
        params = params || {
            bubbles: false,
            cancelable: false,
            detail: undefined
        };
        var ev = document.createEvent('CustomEvent');
        ev.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
        return ev;
    }

    CustomEvent.prototype = window.Event.prototype;
    window.CustomEvent = CustomEvent;

})();