/*
 * UIX Library.
 * @author terangel
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
     * @param {Object} [options.headers] Cabeceras a enviar.
     * @param {boolean} [options.json] Indica si enviar los datos en formato JSON.
     * @param {number} [options.timeout] Tiempo máximo para procesar la petición.
     * @param {function(err: ?Error, data: ?Object, xhr: XMLHttpRequest)} [options.complete] Función de retorno.
     * @param {function(err: ?Error, data: ?Object, xhr: XMLHttpRequest)} [complete] Función de retorno.
     * @return {XMLHttpRequest} Objeto de petición creado.
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
            var parts = URL.parse(url, true);
            Object.extend(parts.query, options.data)
            url = URL.format(parts);
        }
        // Antes de realizar la petición comprobamos si hay conexión a internet.
        // TODO: Evaluar si dejarlo aquí o subirlo arriba del todo.
        if (!uix.checkConnection(complete)) {
            return;
        }
        // Se incializa la petición
        var xhr = new XMLHttpRequest();
        xhr.open(options.method, url, true);
        // Cabeceras de petición añadidas
        if (options.headers) {
            for (var key in options.headers) {
                xhr.setRequestHeader(key, options.headers[key]);
            }
        }
        // Envío de datos
        var data = null;
        if (options.data && options.method !== 'GET') {
            if (options.data instanceof FormData) {
                data = options.data;
            } else if (options.json) {
                xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
                data = JSON.stringify(options.data);
            } else {
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
                data = URL.formatQuery(options.data);
            }
        }
        // Manejo de eventos
        xhr.addEventListener('load', function() {
            var data = null,
                type = xhr.getResponseHeader('Content-Type');
            if (uix.isJSON(type)) {
                try {
                    data = JSON.parse(xhr.responseText);
                } catch (err) { // SyntaxError
                    return complete(err, null, xhr);
                }
            } else {
                data = xhr.responseText;
            }
            if (xhr.status >= 200 && xhr.status < 300 || xhr.status === 304) {
                complete(null, data, xhr);
            } else {
                var err = new Error('Unable to load \'' + url + '\': ' + xhr.statusText + ' (' + xhr.status + ')');
                err.status = xhr.status;
                complete(err, data, xhr);
            }
        }, false);
        xhr.addEventListener('error', function() {
            complete(new Error('Unable to load \'' + url + '\'.'), null, xhr);
        }, false);
        // Timeout por defecto (15 sg)
        xhr.timeout = (options.timeout === undefined) ? 15000 : options.timeout;
        xhr.ontimeout = function() {
            complete(new Error('Timeout loading \'' + url + '\'.'), null, xhr);
        }
        // Se envía la petición
        xhr.send(data);
        // Se devuelve el objeto de petición creado
        return xhr;
    },

    /**
     * Comprueba si hay conexión a internet. Si se especifica una función de retorno genera un error de conexión
     * (ConnectionError) pasándoselo a la función. Esto simplifica el tratamiento en muchos casos.
     * @param {function(err: ?Error)} [callback] Función de retorno.
     * @return {boolean} Devuelve verdadero si hay conexión o falso en caso contrario.
     */
    checkConnection: function(callback) {
        if (navigator.connection && navigator.connection.type === 'none') {
            if (callback) {
                callback(new ConnectionError());
            }
            return false;
        }
        return true;
    },

    /**
     * Comprueba si el tipo MIME especificado es de tipo JSON.
     * @param {string} mime
     * @return {boolean}
     */
    isJSON: function(type) {
        return /[\/+]json\b/.test(type);
    },

    // DOM
    // -----------------------------------------------------------------------------------------------------------------
    /**
     * Crea un nuevo elemento del tipo, atributos y contenido especificado.
     * @param {string} type Tipo o nombre de etiqueta.
     * @param {?Object} attribs Atributos a añadir en el nuevo elemento.
     * @param {string|Node|HTMLCollection|NodeList|Node[]|*[]} [content] Contenido del elemento, puede ser de cualquier
     * tipo. Desde cadenas de texto, colecciones de nodos, fragmentos de documento, etc.
     * @param {Object} [events] Tratamiento de eventos a añadir.
     * @return {Element} Devuelve el elemento creado.
     */
    create: function(type, attribs, content, events) {
        var el = document.createElement(type);
        if (attribs) {
            for (var name in attribs) {
                el.setAttribute(name, attribs[name]);
            }
        }
        if (content) {
            if (uix.isArrayLike(content)) {
                for (var i = 0; i < content.length; i++) {
                    el.appendChild(content[i] instanceof Node ? content[i] : document.createTextNode(content[i]));
                }
            } else if (content instanceof Node) {
                el.appendChild(content);
            } else {
                el.innerHTML = content;
            }
        }
        if (events) {
            for (var name in events) {
                el.addEventListener(name, events[name]);
            }
        }
        return el;
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
        if (el) {
            if (Array.isArray(name)) {
                for (var i = 0; i < name.length; i++) {
                    el.classList.add(name[i]);
                }
            } else {
                el.classList.add(name);
            }
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
        if (el) {
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
        }
        return el;
    },

    /**
     * Añade o elimina uno o varios nombres de clases del elemento especificado.
     * @param {Element} el Elemento especificado.
     * @param {string|string[]} name Nombre de una o varias clases.
     * @param {boolean} [force] Indica si añadir o eliminar la clase o clases especificadas.
     * @return {Element} Devuelve el elemento especificado.
     */
    toggleClass: function(el, name, force) {
        if (el) {
            /**
             * Polyfill de la función Element.classList.toggle() por falta de compatibilidad, por ejemplo en iOS 9.
             * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Element/classList}
             */
            function t(n, f) {
                return (el.classList[(f = (f === undefined) ? !el.classList.contains(n) : f) ? 'add' : 'remove'](n), f);
            }
            if (Array.isArray(name)) {
                for (var i = 0; i < name.length; i++) {
                    t(name[i], force);
                }
            } else {
                t(name, force);
            }
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
     * Devuelve el primer hijo directo del elemento especificado que cumpla el selector.
     * @param {Element} el Elemento especificado.
     * @param {string} selector Selector especificado.
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
    lastChild: function(el, selector) {
        for (el = el.lastElementChild; el !== null; el = el.previousElementSibling) {
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
     * Devuelve un array con los elementos antecesores del elemento especificado, y opcionalmente filtrando por un
     * selector y hasta un elemento contenedor especificado.
     * @param {Element} el Elemento especificado.
     * @param {string|Element} Selector opcional o elemento contenedor.
     * @param {Element} Elemento contenedor (no se incluye en el array).
     * @return {Element[]} Array de elementos padre o antecesores.
     */
    parents: function(el, selector, container) {
        if (selector instanceof Element) {
            container = selector;
            selector = null;
        }
        var els = [];
        while ((el = el.parentNode) !== null && el !== container) {
            if (!selector || this.matches(el, selector)) {
                els.push(el);
            }
        }
        return els;
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
        if (el instanceof NodeList) { // NOTE: También podríamos usar: uix.isArrayLike(el)
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

    /**
     * Comprueba si el objeto especificado es un array o tiene estructura de array como NodeList o HTMLCollection.
     * @param {Object} obj Objeto especificado.
     * @return {boolean}
     */
    isArrayLike: function(obj) {
        return Array.isArray(obj) || obj instanceof NodeList || obj instanceof HTMLCollection;
        // NOTE: Otra alternativa:
        // (['[object HTMLCollection]', '[object NodeList]'].indexOf(Object.prototype.toString.call(obj)) !== -1)
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
     * Oculta o visualiza el elemento especificado.
     * @param {HTMLElement} el Elemento especificado.
     * @param {(boolean|Object)} [show] Indica si mostrar u ocultar el elemento. Si no se especifica se altera la
     * visibilidad del elemento. Como alternativa se puede especificar las opciones adicionales siguientes.
     * @param {Object} [options] Opciones adicionales.
     * @param {boolean} [options.show] Indica si mostrar u ocultar el elemento.
     * @param {string} [options.transition] Nombre de transición a realizar. Si es 'none' se elimina la posible
     * transición definida por clase en el elemento.
     * @param {number} [options.duration] Duración de la transición en segundos.
     * @param {boolean} [options.reverse] Indica si invertir el sentido de la transición.
     * @param {function} [options.done] Función que se llamará al finalizar la transición.
     * @param {boolean} [options.remove] Indica si eliminar el elemento al ocultarlo.
     * @param {function} [options.displayNone] Como alternativa programática a la clase '--display-none', indica si
     * poner el 'display' a 'none' al ocultar el elemento.
     * @return {boolean} Devuelve verdadero si hay cambio de estado o falso en caso contrario.
     */
    toggle: function(el, show, options) {
        if (typeof show === 'object') {
            options = show;
            show = null;
        }
        options = options || {};
        if (show == null) {
            show = options.show;
        }
        // Elimina el tratamiento del evento "transitionend" al finalizar la transición o al interrumpir una transición
        // en proceso.
        function clear() {
            var handler = uix.getState(el, 'toggleEndHandler');
            if (handler) {
                el.removeEventListener('transitionend', handler, false);
                uix.clearState(el, 'toggleEndHandler');
            }
        }
        // Finaliza la transición eliminando el elemento o poniendo su propiedad "display" a "none" cuando corresponda,
        // tras lo cual elimina el tratamiento del evento "transitionend" si ha sido añadido y notifica el final de la
        // transición llamando a la función "done" (callback) si se ha especificado.
        function done() {
            if (!show) {
                if (options.remove) {
                    uix.remove(el);
                } else if (options.displayNone || uix.hasClass(el, '--display-none')) {
                    el.style.display = 'none';
                }
            }
            clear();
            if (options.done) {
                options.done();
            }
        }
        // Se limpia el estado inicialmente.
        clear();
        // Se comprueba el estado actual y si realizar o no la transición.
        var hidden = el.classList.contains('uix-hide');
        if (show == null) {
            show = hidden;
        } else if (show === !hidden) {
            done();
            return false;
        }
        // Se comprueba si se ha especificado transición en opciones o como atributo de datos.
        var trans = options.transition || el.dataset.transition,
            transClass = uix.getClassEnding(el, 'uix-transition-');
        if (trans !== transClass) {
            if (transClass) {
                uix.removeClass(el, 'uix-transition-' + transClass);
            }
            if (trans && trans !== 'none') {
                uix.addClass(el, 'uix-transition-' + trans);
            }
        }
        // NOTE: La inversión de la transición solo se puede especificar programáticamente por opciones cada vez, en
        // otros casos se eliminará la clase si está añadida.
        uix.toggleClass(el, 'uix-reverse', !!options.reverse);
        // Se modifica la duración de la transición si se ha especificado en opciones.
        el.style.transitionDuration = (options.duration) ? options.duration + 's' : '';
        // En caso de visualizar el elemento se comprueba si la propiedad "display" es "none".
        if (show && el.style.display === 'none') {
            el.style.display = '';
            // Forzamos el REFLOW
            el.offsetHeight + el.offsetWidth;
        }
        // Si se ha definido o especificado transición comprobamos si realmente esta se va a producir para la
        // propiedad "visibility" y por tanto podemos esperar el evento "transitionend" o no.
        if (trans && trans !== 'none') {
            var cs = window.getComputedStyle(el, null);
            // En primer lugar comprobamos que la propiedad "visibility" esté dentro de la transición y en segundo que
            // se vaya a producir cambio de valor, de "visible" a "hidden" o de "hidden" a "visible", condición
            // indispensable para que recibamos el evento "transitionend".
            if (!/(^|,\s*)(all|visibility)(,|$)/i.test(cs.getPropertyValue('transition-property')) ||
                    cs.getPropertyValue('visibility') === (show ? 'visible' : 'hidden')) {
                trans = null;
            }
        }
        // Se añade o elimina la clase "uix-hide" para llevar a cabo la transición.
        uix.toggleClass(el, 'uix-hide', !show);
        // Si preveemos que se va a producir la transición sobre la propiedad "visibility" añadimos el tratamiento del
        // evento "transitionend", si no pues no.
        if (trans && trans !== 'none') {
            el.addEventListener('transitionend', uix.putState(el, 'toggleEndHandler', function(event) {
                if (event.propertyName === 'visibility') {
                    done();
                }
            }), false);
        } else {
            // En cualquier otro caso damos por finalizada la transición aunque en algunas circunstancias esta se
            // produzca, por ejemplo al visualizar un elemento en plena transición de ocultación sin haber concluido.
            done();
        }
        return true;
    },

    /**
     * Evalua si el elemento especificado está visible o no.
     * @param {Element} el Elemento especificado.
     * @return {boolean} Devuelve verdadero si está visible o falso en caso contrario.
     */
    isVisible: function(el) {
        return !uix.hasClass(el, 'uix-hide');
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
    toggleDropdown: function(el) {
        if (uix.hasClass(el, 'uix-hide')) {
            var close = function(event) {
                var targetEl = event.target;
                do {
                    if (targetEl === el) {
                        return;
                    }
                } while (targetEl = targetEl.parentElement);
                document.documentElement.removeEventListener('tap', close, true);
                uix.toggle(el, false);
            };
            document.documentElement.addEventListener('tap', close, true);
            uix.toggle(el, true);
        }






        // TODO: De momento pasamos el evento original como mecanismo para evitar que el mismo evento que causa la
        // visualización del desplegable no cause la ocultación inmediata, pero esto no funcionará cuando el evento que
        // desencadena la visualización no es del mismo tipo del que usamos para la ocultación.
        // Quizás la mejor opción es retrasar unos instances la adición del evento en el documento de forma que
        // cualquier evento tratado sea posterior al flujo de visualización.
        /*
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
        */
    },

    /**
     * Añade o elimina el manejo de un evento cuando se produce fuera del elemento especificado.
     * @param {Element} el Elemento especificado.
     * @param {Function} callback Función de retorno, si es nulo se elimina el tratamiento actual.
     */
    clickout: function(el, name, callback) {
        var listener;
        var listenerName = name + 'OutsideListener'
        if (callback) {
            listener = function(event) {
                var target = event.target;
                do {
                    if (target === el) {
                        return;
                    }
                } while (target = target.parentElement);
                callback();
            };
            uix.putState(el, listenerName, listener);
            document.addEventListener(name, listener, true);
        } else if (listener = uix.getState(el, listenerName)) {
            document.removeEventListener(name, listener, true);
            uix.clearState(el, listenerName);
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

    /**
     * Comprueba si hay intersección entre los dos elementos especificados.
     * @param {Element} e1 Primer elemento.
     * @param {Element} e2 Segundo elemento.
     * @return {boolean} Devuelve verdadero si hay intersección o falso en caso contrario.
     */
    intersect: function(e1, e2) {
        var r1 = e1.getBoundingClientRect(),
            r2 = e2.getBoundingClientRect();
        return (r2.left <= r1.right && r2.right >= r1.left && r2.top <= r1.bottom && r2.bottom >= r1.top);
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
     * Comprueba si el elemento contiene la variable de estado especificada.
     * @param {Element} el Elemento especificado.
     * @param {string} name Nombre de variable a obtener.
     */
    hasState: function(el, name) {
        var id = el.dataset.stateId, state;
        if (id && (state = this._stateMap[id])) {
            return name in state;
        }
        return false;
    },

    /**
     * Borra o elimina la variable especificada o en caso de omisión, el objeto de datos asociado al completo.
     * @param {Element} el Elemento especificado.
     * @param {string} [name] Nombre de variable a eliminar. Si es nula o no se especifica elimina el objeto de datos al
     * completo.
     * @return {*} Devuelve los datos eliminados o nulo si no se encuentran.
     */
    clearState: function(el, name) {
        var id = el.dataset.stateId, state, data = null;
        if (id && (state = this._stateMap[id])) {
            if (name) {
                data = state[name];
                delete state[name];
            } else {
                data = state;
                delete this._stateMap[id];
            }
        }
        return data;
    },

    // Loader ----------------------------------------------------------------------------------------------------------
    /**
     * Muestra u oculta el indicador de carga que primero se encuentre en el contexto especificado. Si no se especifica
     * ningún contexto se realiza la búsqueda desde la raíz del documento.
     * @param {boolean} show Indica si mostrar u ocultar el indicador.
     * @param {Object} [options] Opciones adicionales. (@see uix.toggle)
     * @param {Element} [options.loader] Referencia al elemento.
     * @param {Element} [options.context] Elemento donde buscar el indicador de carga.
     * @param {number} [options.delay=10] Tiempo de retardo (ms) en mostrar el indicador de carga.
     */
    toggleLoader: function(show, options) {
        // console.log('[' + performance.now().toFixed(3) + '] toggleLoader(' + show + ', ' + JSON.stringify(options) + ')');
        var loader = null,
            context = document,
            defaults = {};
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
            var s = '.uix-loader';
            if (context === document) {
                s = 'body > ' + s;
            }
            loader = context.querySelector(s);
        }
        if (loader) {
            uix.toggle(loader, show, options);
        }
        // TODO: Si no se encuentra podemos generar la estructura y añadirla al documento.
    },

    // Dialogs
    // -----------------------------------------------------------------------------------------------------------------
    /**
     * Abre una nueva vista de diálogo.
     * @param {string} name Nombre de la vista a abrir como diálogo.
     * @param {Object} [options] Opciones adicionales.
     * @param {Element} [options.container] Elemento contenedor donde añadir el diálogo.
     * @param {string('center'|'bottom')} [options.position] Posición del diálogo: center (default) o bottom.
     * @param {boolean} [options.fullscreen] Indica si mostrar el diálogo a pantalla completa, lo que evita que se añada
     * la capa de ocultación o oscurecimiento.
     * @param {string} [options.fragment] Indica la cadena a incluir como fragmento en la URL.
     * @param {boolean} [options.history] Indica si reemplazar la ruta actual del histórico (replace) o añadirla como
     * nueva entrada (por defecto).
     * @param {number} [options.delay] Tiempo de espera para mostrar el diálogo (milisegundos).
     * @param {function(view: View)} [options.done] Función que se llama al finalizar la visualización del diálogo.
     * @return {View} Devuelve la instancia de la vista creada o null si todavía no se ha creado.
     */
    openDialog: function(name, options) {
        var defaults = {
            hide: true,
            style: { display: 'none' }
        };
        options = Object.extend(defaults, options) || defaults;
        if (options.delay) {
            setTimeout(function() {
                delete options.delay;
                uix.openDialog(name, options);
            }, options.delay);
            return;
        }
        // Si no se especifica contendor se añade al cuerpo del documento.
        var container = options.container || document.body;
        // Se comprueba si añadir capa de ocultación.
        if (!options.fullscreen) {
            var overlay = container.querySelector('.uix-overlay');
            // Si no hay capa de ocultación se añade.
            if (!overlay) {
                overlay = uix.create('div', {
                    'class': 'uix-overlay uix-hide --display-none',
                    'data-transition': 'fade'
                });
                container.appendChild(overlay);
            }
        }
        // Si hay algún diálogo abierto en el mismo contenedor se cierra previamente.
        uix.forEach(container.querySelectorAll('.uix-dialog:not(.uix-hide)'), function(el) {
            uix.closeDialog(el);
        });
        // Se crea una capa para envolver y posicionar el diálogo.
        var wrapper = uix.create('div', {
            'class': 'uix-dialog-wrapper uix-hide' + ((options.position === 'bottom') ? ' uix-dialog--bottom' : '')
        });
        container.appendChild(wrapper);
        // Evitamos que los clicks asciendan en el árbol DOM.
        // wrapper.addEventListener('touchend', function(event) {
        //     event.preventDefault();
        // }, false);
        // NOTE: Lo comentamos porque puede provacar que no se produzca ningún click, ni los de dentro del diálogo.
        // Se crea e incluye la vista de diálogo.
        var dialog = View.create(name);
        return dialog.include(wrapper, options, function(err, view) {
            if (err) {
                console.log('Unable to open dialog "' + name + '": ' + err);
                uix.remove(wrapper);
                return;
            }
            // Si se ha incluido el botón de cierre se añade el tratamiento.
            var close = view.root.querySelector('.uix-dialog-close');
            if (close) {
                view.root.querySelector('.uix-dialog-close').addEventListener('tap', function(event) {
                    uix.closeDialog(view);
                });
            }
            // Se visualiza la capa de ocultación.
            if (overlay) {
                uix.toggle(overlay, true);
            }
            // Se visualiza la capa envoltorio.
            uix.toggle(wrapper, true);
            // Se visualiza el diálogo.
            view.toggle(true, options);
            // Si se ha especificado fragmento se añade a la URL actual.
            if (options.fragment) {
                var hash = '#' + options.fragment;
                if (options.history === 'replace') {
                    uix.history.replace(hash);
                } else {
                    uix.history.push(hash);
                }
                // Evento de seguimiento
                uix.track('view_open', view);
            }
            // Se añade el control para cerrar el diálogo cuando la URL cambie.
            uix.history.on('historychange', dialog.onHistoryChange = function() {
                uix.closeDialog(dialog);
            });
        });
    },

    /**
     * Cierra la vista de diálogo especificada.
     * @param {View|Element} dialog Vista de diálogo especificada.
     * @param {function} [callback] Función de retorno.
     */
    closeDialog: function(dialog, callback) {
        if (dialog instanceof Element) {
            dialog = View.find(dialog);
        }
        if (dialog && dialog.isVisible()) {
            var wrapper = dialog.root.parentElement;
                container = wrapper.parentElement,
                overlay = container.querySelector('.uix-overlay');
            dialog.toggle(false, {
                done: function() {
                    dialog.remove();
                    uix.remove(wrapper);
                    if (callback) {
                        callback();
                    }
                }
            });
            if (dialog.onHistoryChange) {
                uix.history.off('historychange', dialog.onHistoryChange);
            }
            if (overlay && uix.isVisible(overlay)) {
                uix.toggle(overlay, false);
            }
        }
    },

    // -----------------------------------------------------------------------------------------------------------------
    /**
     * Muestra un mensaje de error o notificación emergente desde la parte inferior de pantalla, a lo que podemos llamar
     * "tostada".
     * @param {*} message Mensaje a mostrar. Puede ser de cualquier tipo @see uix.create.
     * @param {Object} [options] Opciones adicionales.
     * @param {string} [options.name] Nombre asignado a la tostada, sirve para identificarla y cerrarla posteriormente.
     * @param {boolean} [options.close=true] Indica si mostrar o no el botón de cierre. Por defecto siempre se muestra.
     * @param {number} [options.timeout] Tiempo para el cierre automático (milisegundos).
     * @return {Element} Referencia al elemento creado que nos permite cerrar la tostada
     */
    showToast: function(message, options) {
        var el;
        options = options || {};
        uix.hideToast();
        document.body.appendChild(el = uix.create('div', {
            'class': 'uix-toast uix-hide --display-none',
            'data-transition': 'slide-up'
        }, [
            uix.create('span', {
                'class': 'uix-toast__icon icon icon-warn'
            }),
            uix.create('span', {
                'class': 'uix-toast__text'
            }, message)
        ]));
        if (options.close === undefined || options.close) {
            el.appendChild(uix.create('a', {
                'class': 'uix-toast__close uix-button icon icon-close'
            }, null, {
                'tap': function() {
                    uix.hideToast(el);
                }
            }));
        }
        uix.toggle(el, true);
        if (options.name) {
            el.dataset.name = options.name;
        }
        if (options.timeout) {
            el.dataset.timer = setTimeout(function() {
                uix.hideToast(el);
            }, 10000);
        }
        return el;
    },

    /**
     * Oculta la primera tostada en encontrar enganchada directamente al cuerpo del documento o la especificada por
     * nombre asignado o referencia al elemento raíz de la misma.
     * @param {string|Element} [name] Nombre asignado o referencia al elemento raíz.
     */
    hideToast: function(name) {
        var el = name instanceof Element ? name :
            document.querySelector('body > .uix-toast' + (name ? '[data-name="' + name + '"]' : '') + ':not(.uix-hide)');
        if (el) {
            if (el.dataset.timer) {
                clearTimeout(el.dataset.timer);
            }
            uix.toggle(el, false, {
                remove: true
            });
        }
    },

    // -----------------------------------------------------------------------------------------------------------------
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
    //     bar.setAttribute('class', 'uix-vscroll');
    //     var fill = document.createElement('div');
    //     fill.setAttribute('class', 'uix-vscroll-fill');
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
 * Funciones para manejo de formularios.
 * @type {Object}
 */
uix.forms = {

    /**
     * Realiza la inicialización de los componentes del fomulario especificado.
     * @param {Element} form Referencia al formulario o elemento contenedor.
     */
    init: function(form) {
        // Passwords
        var list = form.querySelectorAll('input[type="password"] + .unmask');
        for (var i = 0; i < list.length; i++) {
            list[i].addEventListener('tap', function(event) {
                var el = event.target.previousElementSibling;
                el.type = (el.type === 'password') ? 'text' : 'password';
            });
        }
    },

    /**
     * Añade una nueva regla o función de validación para el campo especificado por medio de un selector y con la
     * posibilidad de especificar opciones adicionales, como la que indica si validar o no los cambios automáticamente.
     * @param {Element} form Referencia al formulario o elemento contenedor.
     * @param {Element|Element[]|NodeList|string} target Referencia a un campo o elemento, array o lista de nodos, o
     * selector para localizarlos dentro del formulario especificado (puede ser múltiple separados por comas).
     * @param {function|Object} [validate] Función de validación u opciones.
     * @param {Object} [options] Opciones adicionales, incluyendo la función de validación si no se especifica como
     * parámetro.
     * @param {function} [options.validate] Función de validación especificada.
     * @param {boolean} [options.changes=true] Indica si validar los campos o elementos frente a cambios añadiendo el
     * tratamiento del evento "change".
     */
    rule: function(form, target, validate, options) {
        // Tratamiento de parámetros
        var defaults = {
            changes: true
        };
        if (typeof validate === 'object' && validate !== null) {
            options = validate;
            validate = null;
        }
        options = options ? Object.extend(defaults, options) : defaults;
        validate = validate || options.validate;

        // Si se ha especificado un selector se evalua
        if (typeof target === 'string') {
            target = form.querySelectorAll(target);
        }

        // Obtención de la lista de reglas añadidas
        var rules = uix.getState(form, 'formRules');
        if (!rules) {
            uix.putState(form, 'formRules', rules = []);
        }

        // Función para añadir una nueva regla
        var add = function(el) {
            rules.push({
                target: el,
                validate: validate
            });
            if (options.changes) {
                el.addEventListener('change', function(event) {
                    uix.forms.validate(form, event.target);
                });
            }
        };
        // Se añaden las reglas
        if (uix.isArrayLike(target)) {
            for (var i = 0; i < target.length; i++) {
                add(target[i]);
            }
        } else {
            add(target);
        }
    },

    /**
     * Valida el formulario especificado al completo, guardando los datos extraídos en el objeto especificado, o si en
     * su lugar se especifica la referencia a un campo, solo se valida el mismo.
     * @param {Element} form Referencia al formulario o elemento contenedor.
     * @param {Object|Element} [data] Objeto donde guardar los datos extraídos durante la validación o referencia al
     * campo concreto a validar.
     * @return {boolean?} Devuelve verdadero si pasa la validación o falso en caso contrario.
     */
    validate: function(form, data) {
        var rules = uix.getState(form, 'formRules');
        if (!rules) {
            console.log('WARNING: Form validation rules not found.');
            return;
        }
        var errors = 0, target;
        if (data instanceof Element) {
            target = data;
            data = null;
        } else {
            uix.forms.clean(form);
        }
        for (var i = 0, el; i < rules.length; i++) {
            el = rules[i].target;
            if (!target || el === target) {
                if (rules[i].validate(el, data) === false) {
                    if (errors++ === 0) {
                        el.focus();
                    }
                }
                if (target) {
                    if (errors === 0) {
                        uix.forms.clean(uix.closest(el, '.uix-line') || el.parentNode);
                    }
                    break;
                }
            }
        }
        return (errors === 0);
    },

    /**
     * Muestra un error general o asociado al campo especificado.
     * @param {Element} target Campo o elemento especificado.
     * @param {string} [message] Texto del mensaje a mostrar.
     * @param {boolean} [focus=false] Indica si mandar el foco al elemento.
     */
    error: function(target, message, focus) {
        if (uix.matches(target, '.uix-form')) {
            if (message) {
                uix.showToast(message);
            } else {
                uix.hideToast();
            }
        } else {
            if (message) {
                var line = uix.closest(target, '.uix-line');
                var msg = (line) ? uix.lastChild(line, '.uix-error-msg') : uix.nextSibling(target, '.uix-error-msg');
                if (msg) {
                    msg.innerHTML = message;
                } else {
                    var code = '<span class="uix-error-msg">' + message + '</span>';
                    if (line) {
                        line.insertAdjacentHTML('beforeend', code);
                    } else {
                        target.insertAdjacentHTML('afterend', code);
                    }
                }
            }
            uix.addClass(target, 'uix-error');
            if (focus) {
                target.focus();
            }
        }
    },

    /**
     * Limpia todos los errores en el formulario o contexto especificado.
     * @param {Element} context Formulario o contexto donde realizar la búsqueda.
     */
    clean: function(context) {
        var errors = context.querySelectorAll('.uix-error');
        for (var i = 0; i < errors.length; i++) {
            uix.removeClass(errors[i], 'uix-error');
        }
        var messages = context.querySelectorAll('.uix-error-msg');
        for (var i = 0; i < messages.length; i++) {
            uix.remove(messages[i]);
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
// @see {@link https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent}
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
        var e = document.createEvent('CustomEvent');
        e.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
        return e;
    }

    CustomEvent.prototype = window.Event.prototype;
    window.CustomEvent = CustomEvent;

})();


// =====================================================================================================================
// Custom Errors
// ---------------------------------------------------------------------------------------------------------------------
function ConnectionError(message) {
    this.name = 'ConnectionError';
    this.message = message || 'No internet connection';
    this.stack = (new Error()).stack;
}
ConnectionError.prototype = Object.create(Error.prototype);
ConnectionError.prototype.constructor = ConnectionError;