/*
 * Capa de abstracción sobre el objeto "window.history" que añade el tratamiento adicional del orden de cada entrada
 * añadida lo que nos permite controlar en el tratamiento del evento "popstate" cuando estamos volviendo para atrás o
 * yendo hacía adelante. También añadimos el evento propio "statechange" para notificar cualquier cambio de estado en el
 * histórico, provenga del evento "popstate" o al hacer un "push/replace".
 */
(function() {

    /**
     * Interfaz pública.
     * @namespace
     */
    uix.history = {

        /**
         * Estado actual.
         * @type {Object}
         */
        state: {},

        /**
         * Indica si está activo el formato de URLs "Pretty", codificando las rutas y demás partes en el fragmento de la
         * URL original. Se activa por defecto cuando el protocolo de la localización inicial es "file".
         * @type {boolean}
         */
        pretty: true, // (window.location.protocol === 'file:'),

        /**
         * Número de entradas en el histórico anteriores a la entrada actual.
         * NOTE: A diferencia de la propiedad "window.history.length" no contabiliza las entradas siguientes.
         * @type {number}
         */
        length: 0,

        /**
         * Añade una nueva entrada en el histórico de navegación.
         * @param {string} url Dirección URL.
         * @param {Object} [data] Datos a incluir en el estado.
         * @param {string} [title] Título opcional.
         */
        push: function(url, data, title) {
            if (this.pretty) {
                // TODO: Evaluar si codificar el fragmento con encodeURIComponent()
                url = '#' + URL.resolve(url, (window.location.hash) ? window.location.hash.substring(1) : '/');
            }
            window.history.pushState({
                data: data,
                order: this.length++
            }, title || '', url);
            this.state = window.history.state;
            _fire(new CustomEvent('historychange'));
        },

        /**
         * Reemplaza la entrada actual en el histórico de navegación.
         * @param {string} url Dirección URL.
         * @param {Object} [data] Datos a incluir en el estado.
         * @param {string} [title] Título opcional.
         */
        replace: function(url, data, title) {
            if (this.pretty) {
                // TODO: Evaluar si codificar el fragmento con encodeURIComponent()
                url = '#' + URL.resolve(url, (window.location.hash) ? window.location.hash.substring(1) : '/');
            }
            window.history.replaceState({
                data: data,
                order: (this.length > 0) ? this.length - 1 : this.length++
            }, title || '', url);
            this.state = window.history.state;
            _fire(new CustomEvent('historychange'));
        },

        /**
         * @param {boolean} [parse=false] Indica si parsear la URL extrayendo sus partes.
         * @param {boolean} [parseQuery=false] Indica si parsear los parámetros de consulta.
         * @return {{path: string, query: string, fragment: string}} Devuelve la localización actual.
         * @see URL.parse
         */
        location: function(parse, parseQuery) {
            // TODO: Si codificamos el fragmento hacer la decodificación con decodeURIComponent()
            var url = (this.pretty) ? (window.location.hash) ? window.location.hash.substring(1) : '/'
                : window.location.href;
            return (parse) ? URL.parse(url, parseQuery) : url;
        },

        /**
         * Vuelta atrás en el histórico de navegación.
         */
        back: function() {
            window.history.back();
        }
    };

    // Eventos ---------------------------------------------------------------------------------------------------------
    /**
     * Funciones manejadoras de eventos añadidas por tipo.
     * @type {Object.<string, function(event: Event)[]>}
     * @private
     */
    var _eventListeners = {};

    /**
     * Emite el evento especificado.
     * @param {Event|string} event Evento especificado.
     */
    function _fire(event) {
        if (typeof(event) === 'string') {
            event = new CustomEvent(event);
        }
        var list = _eventListeners[event.type];
        if (list) {
            event.target = this;
            for (var i = 0; i < list.length; i++) {
                list[i].call(this, event);
            }
        }
    };

    /**
     * Añade el manejador de evento al tipo especificado.
     * @param {string} type Tipo de evento.
     * @param {function} handler Función manejadora.
     */
    uix.history.on = function(type, handler) {
        (_eventListeners[type] || (_eventListeners[type] = [])).push(handler);
    };

    /**
     * Elimina el manejador de evento del tipo especificado.
     * @param {string} type Tipo de evento.
     * @param {function} handler Función manejadora.
     */
    uix.history.off = function(type, handler) {
        var list = _eventListeners[type], i;
        if (list && (i = list.indexOf(handler)) !== -1) {
            list.splice(i, 1);
        }
    };

    // -----------------------------------------------------------------------------------------------------------------
    // Tratamiento del evento 'popstate'
    window.addEventListener('popstate', function(event) {
        this.state = event.state;
        var detail = {
            state: event.state
        };
        if (event.state && event.state.order >= 0) {
            detail.back = event.state.order < this.length - 1;
            this.length = event.state.order + 1;
        }
        // NOTE: Aquí existe el inconveniente de que el usuario manipule directamente la URL y modifique el fragmento
        // (hash) generando nuevas entradas en el histórico con estado nulo y no podamos determinar si se trata de una
        // vuelta atrás o el orden que ocupa.
        _fire(new CustomEvent('historypop', {
            detail: detail
        }));
        _fire(new CustomEvent('historychange'));
    }.bind(uix.history));

})();