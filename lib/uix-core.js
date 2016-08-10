/*
 * UIX Library.
 * @author angel.teran
 */

var uix = {


    // TODO: Donde metemos esto ????????????????????????????????????????????????????????????????????????????????????????
    // var supportsTouch = 'ontouchstart' in window || navigator.msMaxTouchPoints;
    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

    

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

    // AJAX
    // -----------------------------------------------------------------------------------------------------------------
    /**
     * Simplifica el envío de peticiones HTTP a través del objeto XMLHttpRequest.
     * @param {string} url Dirección URL especificada.
     * @param {Object|function} options Opciones y ajustes adicionales.
     * @param {string} [options.method] Método HTTP a emplear.
     * @param {Object} [options.data] Datos a enviar.
     * @param {boolean} [options.json] Indica si enviar los datos en formato JSON.
     * @param {function(err: ?Object, data: Object=)} [options.complete] Función de retorno.
     * @param {function(err: ?Object, data: Object=)} [complete] Función de retorno.
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
                var err = new Error('Unable to load ' + url + ': ' + xhr.statusText + ' (' + xhr.status + ')');
                err.status = xhr.status;
                err.cause = error;
                complete(err, data);
            }
        }, false);

        xhr.addEventListener('error', function(event) {
            complete(new Error('Unable to load ' + url + ': ' + event.toString));
        }, false);

        // Envío de datos
        var data = null;
        if (options.data) {
            if (options.json) {
                xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
                data = JSON.stringify(options.data);
            } else {
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
                data = this.encodeFormData(options.data);
            }
        }

        xhr.send(data);
    },

    /**
     * Codifica las propiedades de un objeto en formato de URL.
     * @param {Object} data Objeto de datos especificados.
     * @return {string} Cadena formateada resultante.
     */
    encodeFormData: function(data) {
        var parameters = [];
        for (var name in data) {
            if (data.hasOwnProperty(name)) {
                parameters.push(encodeURIComponent(name) + '=' + encodeURIComponent(data[name]));
            }
        }
        return parameters.join('&').replace(/%20/g, '+');
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
     * Añade una o varias clases al elemento especificado.
     * @param {string} classNames Nombres de una o varias clases separadas por espacios.
     */
    addClass: function(el, classNames) {
        var names = classNames.trim().split(' ');
        for (var i = 0; i < names.length; i++) {
            el.classList.add(names[i]);
        }
    },

    /**
     * Elimina una o varias clases al elemento especificado.
     * @param {string|function(name: string)} classNames Nombres de una o varias clases separadas por espacios.
     * Si se especifica una función se le pasará cada uno de los nombres de clases añadidos al elemento y se eliminarán
     * aquellos para los que la función devuelve verdadero.
     */
    removeClass: function(el, classNames) {
        var names;
        if (typeof(classNames) === 'function') {
            names = [];
            for (var i = 0, n; i < el.classList.length; i++) {
                if (classNames(n = el.classList.item(i))) {
                    names.push(n);
                }
            }
        } else {
            names = classNames.trim().split(' ');
        }
        for (var i = 0; i < names.length; i++) {
            el.classList.remove(names[i]);
        }
    },

    /**
     * TODO: Documentar...
     */
    toggleClass: function(el, className, toggle) {
        if (toggle === undefined) {
            toggle = !uix.hasClass(className);
        }
        if (toggle) {
            uix.addClass(el, className);
        } else {
            uix.removeClass(el, className);
        }
    },

	/**
	 * TODO: Documentar...
	 */
	hasClass: function(el, className) {
		return (el.classList) ? el.classList.contains(className) :
			new RegExp('(^| )' + className + '( |$)', 'gi').test(el.className);
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
     * TODO: Documentar...
     */
    remove: function(el) {
        el.parentNode.removeChild(el);
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
     * Oculta o visualiza el elemento especificado realizando una transición por CSS.
     * @param {Element} el Elemento especificado.
     * @param {boolean|Object} [show] Indica si mostrar u ocultar el elemento. Si no se especifica se visualiza u oculta
     * según su estado actual.
     * @param {Object} [options] Opciones adicionales de la transición. (@see Transition)
     */
    toggle: function(el, show, options) {
        if (typeof(show) === 'object') {
            options = show;
            show = null;
        } else {
            options = options || {};
        }

        var hidden = uix.hasClass(el, 'ui-hide');
        if (show == null) {
            show = hidden;
        } else if (show && !hidden || !show && hidden) {
            return;
        }

        if (el.dataset.toggleTimeout) {
            clearTimeout(el.dataset.toggleTimeout);
            uix.removeClass(el, function(className) {
                return /^(?:ui-transition|ui-reverse$)/.test(className);
            });
        }

        if (options.transition) {
            // Se añade las clases de transición
            var classNames = 'ui-transition-' + options.transition;
            if (options.reverse) {
                classNames += ' ui-reverse';
            }
            el.style.transition = 'none';
            uix.addClass(el, classNames);

            // Se fuerza el REFLOW
            el.offsetHeight + el.offsetWidth;

            // Se notifica que la transición está preparada para iniciarse
            if (options.ready) {
                options.ready();
            }

            // Se inicia la transición
            el.style.transition = '';
            uix.toggleClass(el, 'ui-hide', !show);

            // Se controla el tiempo de duración de la transición
            el.dataset.toggleTimeout = setTimeout(function () {
                delete el.dataset.toggleTimer;

                // Se eliminan las clases de transición añadidas
                uix.removeClass(el, classNames);

                // Se notifica que la transición ha finalizado
                if (options.complete) {
                    options.complete();
                }
            }, uix.getTransitionDuration(el));

        } else {
            // Se notifica que la transición está preparada para iniciarse
            if (options.ready) {
                options.ready();
            }

            // Se realiza la transición directamente
            uix.toggleClass(el, 'ui-hide', !show);

            // Se notifica que la transición ha finalizado
            if (options.complete) {
                options.complete();
            }
        }
    },

    /**
     * Devuelve la duración en milisegundos de la transición definida. Si hay varios tiempos devuelve el primero.
     * @param {Element} el Elemento especificado.
     * @return {number} Duración en milisegundos.
     */
    getTransitionDuration: function(el) {
        var duration = 0,
            td = window.getComputedStyle(el).transitionDuration;
        var match = /([\d.]+)(s|ms)/i.exec(td);
        if (match) {
            duration = parseFloat(match[1]);
            if (match[2] === 's') {
                duration *= 1000;
            }
        }
        return duration;
    },

    /**
     * Oculta o visualiza el elemento especificado realizando una transición por CSS.
     * @param {Element} el Elemento especificado.
     * @param {boolean|Object} [show] Indica si mostrar u ocultar el elemento. Si no se especifica se visualiza u oculta
     * según su estado actual.
     * @param {Object} [options] Opciones adicionales de la transición. (@see Transition)
     */
    toggleOld: function(el, show, options) {
        if (typeof(show) === 'object') {
            options = show;
            show = null;
        } else {
            options = options || {};
        }

        var hidden = (el.style.opacity == 0);
        if (show == null) {
            // show = (el.style.display === 'none' || el.style.visibility === 'hidden');
            show = hidden;
        } else if (show && !hidden || !show && hidden) {
            return;
        }

        if (el.dataset.toggleTimer) {
            clearTimeout(el.dataset.toggleTimer);
        }

        if (show) {
            if (el.style.display === 'none') {
                el.style.display = '';
            }
            if (el.style.visibility === 'hidden') {
                el.style.visibility = '';
            }
            el.offsetHeight + el.offsetWidth; // -> REFLOW
            if (options.ready) {
                options.ready();
            }
            el.style.opacity = 1;
            el.dataset.toggleTimer = setTimeout(function() {
                el.dataset.toggleTimer = 0;
                if (options.complete) {
                    options.complete();
                }
            }, 200);
        } else {
            el.style.opacity = 0;
            el.dataset.toggleTimer = setTimeout(function() {
                // el.style.display = 'none';
                el.style.visibility = 'hidden';
                el.dataset.toggleTimer = 0;
                if (options.complete) {
                    options.complete();
                }
            }, 200);
        }

        /*
        var hidden = uix.hasClass(el, 'ui-hide');
        if (show == null) {
            // show = (el.style.display === 'none' || el.style.visibility === 'hidden');
            show = hidden;
        } else if (show && !hidden || !show && hidden) {
            return;
        }
        uix.toggleClass(el, 'ui-hide', !show);

        if (options.transition) {
            Transition.create(options.transition, el, options).start(show);
        } else {
            if (show) {
                if (el.style.display === 'none') {
                    el.style.display = '';
                }
                if (el.style.visibility === 'hidden') {
                    el.style.visibility = '';
                }
                el.offsetHeight + el.offsetWidth; // -> REFLOW
            } else {
                el.style.display = 'none';
            }
        }
        */
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
        uix.toggle(dialog, false, function() {
            uix.remove(dialog);
        });
        if (dialog.__dialogOverlay) {
            uix.toggle(dialog.__dialogOverlay, false);
        }
    },

    /**
     * Muestra u oculta el indicador de carga que primero se encuentre en el contexto especificado. Si no se especifica
     * ningún contexto se realiza la búsqueda desde la raíz del documento.
     * @param {boolean} show Indica si mostrar u ocultar el indicador.
     */
    toggleLoader: function(show, context) {
        console.log('toggleLoader(' + show + ')');
        if (context === undefined) {
            context = document;
        }
        var loader = context.querySelector('.ui-loader');
        if (loader) {
            uix.toggle(loader, show, {
                transition: 'fade'
            });
        }
        // TODO: Si no se encuentra podemos generar la estructura y añadirla al documento.
    }

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