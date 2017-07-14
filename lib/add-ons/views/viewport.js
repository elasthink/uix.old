/**
 * Marco de visualización de vistas y control de navegación.
 * @param {Element} container Elemento contenedor.
 * @param {Object} options Opciones y ajustes de configuración.
 * @param {Viewport~RouteNode[]} options.routes Definición de rutas.
 * @param {boolean} [options.topLevel=false] Indica si el viewport es el de más alto nivel lo que implica realizar la
 * gestión y control del histórico de navegación y la visualización de errores.
 * @param {string} [options.basePath] Ruta base especificada.
 * @param {View} [options.parentView] Vista padre o contenedora del marco.
 * @author terangel
 * @class
 * @external URL
 */
function Viewport(container, options) {

    // Opciones por defecto
    var defaults = {
        routes: [],
        topLevel: false,
        basePath: '',
        parentView: null
    };
    options = Object.extend(defaults, options);

    /**
     * Elemento contenedor.
     * @type {Element}
     */
    this.container = container;

    /**
     * Vista contenedora.
     * @type {View}
     */
    this.parentView = options.parentView;

    /**
     * Pila de vistas cargadas.
     * @type {{path: string, view: View, time: number}[]}
     */
    this.views = [];

    /**
     * Referencia a la vista actual.
     * @type {View}
     */
    this.current = null;

    /**
     * Ruta actual, puede incluir parámetros de consulta (query) y fragmento (hash).
     * @type {string}
     */
    this.path = null;

    /**
     * Ruta de referencia anterior. Puede ser especificada en la llamada a la función open.
     * @type {string}
     */
    this.referer = null;

    /**
     * Definición de rutas.
     * @type {Viewport~RouteNode[]}
     */
    this.routes = options.routes;

    /**
     * Indica si el viewport es el de más alto nivel lo que implica realizar la gestión y control del histórico de
     * navegación y la visualización de errores. Por defecto es falso.
     * @type {boolean}
     */
    this.topLevel = options.topLevel;

    /**
     * Ruta base a partir de la cual se extraerán las rutas a vistas.
     * @type {string}
     */
    this.basePath = options.basePath;

    /**
     * Petición actual en proceso.
     * @type {Viewport.Request}
     */
    this.request = null;

    /**
     * Petición de vuelta atrás.
     * @type {{path: string, options: Object}}
     */
    this.backRequest = null;

    /**
     * Indica la transición a realizar al volver atrás.
     * @type {string}
     */
    this.backTransition = null;

    /**
     * Funciones manejadoras de eventos añadidas por tipo.
     * @type {Object.<string, function(event: Object)[]>}
     * @private
     */
    this.eventListeners = {};

    // -----------------------------------------------------------------------------------------------------------------
    if (this.topLevel) {

        /**
         * Orden numérico de la entrada actual en el histórico de navegación.
         * @type {number}
         */
        this.historyOrder = 0;

        // Se añade el tratamiento del evento 'popstate'
        var self = this;
        window.addEventListener('popstate', function(event) {
            // Opciones
            var options = {
                history: View.History.NONE
            };
            // Se comprueba si se está volviendo atrás o yendo hacía adelante en el histórico de navegación
            var state = event.state || {};
            if (state.historyOrder) {
                options.back = state.historyOrder < self.historyOrder;
                self.historyOrder = state.historyOrder;
            } else {
                // NOTE: Aquí existe el inconveniente de que el usuario manipule directamente la URL y modifique el
                // fragmento (hash) generando nuevas entradas en el histórico con estado nulo y no podamos determinar
                // si se trata de una vuelta atrás o el orden que ocupa.
                options.back = true;
                self.historyOrder = 0;
            }
            // Se notifica el cambio de estado, ruta o localización
            // self.fire('statechange');
            window.dispatchEvent(new Event('statechange'));
            // Se obtiene la ruta de la URL en el navegador incluyendo la cadena de búsqueda o consulta (query) y el
            // fragmento o hash
            var path = location.pathname + location.search; // + location.hash;
            // NOTE: Excluímos el fragmento de la identificación de entradas del histórico
            // Se comprueba si hay una petición de vuelta atrás
            if (self.backRequest) {
                var path2 = null;
                // Si se ha especificado ruta se parsea y se elimina la parte del fragmento
                if (self.backRequest.path) {
                    path2 = URL.parse(self.backRequest.path);
                    if (path2.fragment) {
                        delete path2.fragment;
                    }
                    path2 = URL.format(path2);
                }
                // Mientras haya entradas en el histórico de navegación se comprueba si coincide con la ruta
                if (path2 && path2 !== path && self.historyOrder > 0) {
                    // Se elimina la vista cargada asociada a las ruta extraída del histórico no coincidente con la ruta
                    // especificada en la petición de vuelta atrás
                    self.removeView(path, true);
                    // Se continua volviendo atrás en el histórico de navegación
                    window.history.back();
                    return;
                }
                // Se sobrescribe la ruta y se evalua si reemplazar la entrada en el histórico de navegación actual
                // cuando hayamos vaciado el histórico sin encontrar la ruta solicitada
                if (path2) {
                    path = self.backRequest.path; // NOTE: Se sobrescribe siempre para añadir el fragmento si lo incluye
                    if (path2 !== path) {
                        console.log('WARNING: Unable to find path "' + self.backRequest.path + '" in the history.');
                        options.history = View.History.REPLACE;
                    }
                }
                // Se añaden las opciones adicionales incluidas
                Object.extend(options, self.backRequest.options);
                // Se elimina la petición
                self.backRequest = null;
            } else if (path === self.path) {
                // Si la ruta es igual a la actual acaba el proceso
                // NOTE: Con esto cubrimos el caso de volver atrás eliminando el fragmento de la URL
                return;
            }
            if (!options.transition) {
                options.transition = (options.back) ? self.backTransition : state.transition;
            }
            if (options.back && state.transition) {
                self.backTransition = state.transition;
            }
            self.open(path, options);
        });
    }
};

/**
 * Abre la ruta especificada.
 * @param {string} path Ruta especificada, puede incluir parámetros de consulta (query) y fragmento (hash).
 * @param {Object|function} [options] Opciones adicionales o función de retorno.
 * @param {boolean} [options.back=false] Indica si se trata de una vuelta atrás en el histórico de navegación.
 * @param {View.History} [options.history=push] Indica que tipo de tratamiento realizar a nivel de histórico de
 * navegación. Por defecto se genera una nueva entrada (push).
 * @param {string} [options.referer] Indica la ruta de referencia anterior.
 * @param {boolean} [options.reload=false] Indica si recargar la vista asociada a la ruta especificada en caso de que se
 * haya cargado previamente.
 * @param {boolean} [options.loader=true] Indica si mostrar o no el indicador de carga.
 * @param {string} [options.transition] Transición a realizar, por defecto ninguna.
 * @param {function(err: Object=, view: View=)} [options.complete] Función de retorno que será llamada al completar la
 * operación.
 * @param {function(err: Object=, view: View=)} [complete] Función de retorno que será llamada al completar la
 * operación, tiene mayor precedencia sobre la propiedad anterior.
 */
Viewport.prototype.open = function(path, options, complete) {
    console.log('[Viewport] Opening ' + path + '...');
    // Tratamiento de parámetros
    if (typeof options === 'function') {
        // (path, complete)
        complete = options;
        options = null;
    }
    options = options || {};
    if (complete) {
        options.complete = complete;
    }
    // Se resuelve la ruta por si fuera relativa
    if (this.topLevel && this.path) {
        path = URL.resolve(path, this.path);
    }
    // Si hay una petición en proceso se cancela
    if (this.request) {
        this.request.cancel();
    }
    // Se construye el nuevo objeto de petición
    this.request = new Viewport.Request(this, path, options);
    // Se inicia la petición
    this.request.start();
};

/**
 * Vuelta atrás en el histórico de navegación. Si se especifica una ruta se vuelve atrás hasta la misma.
 * @param {string|Object|function} [path] Ruta especificada, opciones o función de retorno.
 * @param {Object|function} [options] Opciones adicionales o función de retorno.
 * @param {boolean} [options.reload=false] Indica si recargar la vista.
 * @param {function(err: Object=, view: View=)} [options.complete] Función de retorno que será llamada al completar la
 * operación.
 * @param {function(err: Object=, view: View=)} [complete] Función de retorno que será llamada al completar la
 * operación, tiene mayor precedencia sobre la propiedad anterior.
 */
Viewport.prototype.back = function(path, options, complete) {
    // Se comprueba que el viewport sea de nivel "top" y el histórico tenga alguna entrada
    if (!this.topLevel || window.history.length === 0) {
        // NOTE: Aquí podríamos tener una implementación alternativa para cuando el viewport no es de nivel "top", y
        // entonces requerir la especificación de ruta para llamar a la función "open" añadiendo la opción "back".
        return;
    }
    // Tratamiento de parámetros
    if (typeof path === 'function') {
        // (complete)
        complete = path;
        path = options = null;
    } else if (path != null && typeof path === 'object' && !Array.isArray(path)) {
        // (options, complete)
        complete = (typeof options === 'function') ? options : null;
        options = path;
        path = null;
    } else if (typeof options === 'function') {
        // (path, complete)
        complete = options;
        options = null;
    }
    options = options || {};
    if (complete) {
        options.complete = complete;
    }
    if (path && this.historyOrder === 0) {
        // NOTE: Si no hay entradas en el histórico se abre directamente la ruta reemplazando la actual
        options.history = View.History.REPLACE;
        this.open(path, options);
    } else {
        // Se muestra el indicador de carga
        // TODO: Se ralentiza tanto la recepción del evento "popstate" siendo necesario anticipar la visualización del indicador de carga?
        if (options.loader !== false) {
            uix.toggleLoader(true);
        }
        // Se inicia la vuelta atrás en el histórico de navegación
        this.backRequest = {
            path: path,
            options: options
        }
        window.history.back();
    }
};

/**
 * Compara dos rutas para determinar si son iguales o equivalentes de cara a la identificación de vistas en el histórico
 * de navegación, comparando la ruta por separado, los parámetros de búsqueda sin importar el orden y excluyendo el
 * fragmento.
 * @param {string} path1 Ruta primera.
 * @param {string} path2 Ruta segunda con la que comparar.
 * @return {boolean} Devuelve true si son iguales o equivalentes.
 */
Viewport.prototype.comparePaths = function(path1, path2) {
    // Parseamos las rutas
    path1 = URL.parse(path1);
    path2 = URL.parse(path2);
    // Eliminamos la parte del fragmento
    delete path1.fragment;
    delete path2.fragment;
    // Reformateamos las rutas
    path1 = path1.format();
    path2 = path2.format();
    // Comparamos
    return path1 === path2;
};


/**
 * Recarga la ruta actual.
 */
/* TODO: Hay que probarlo y seguramente meter la especificación de opciones adicionales.
Viewport.prototype.reload = function(complete) {
    this.open(this.path, {
        reload: true
    }, complete);
};
*/

/**
 * Actualiza el fragmento en la URL.
 * @param {string} hash Fragmento a introducir en la URL.
 * @param {function} changeListener Función para asociar al evento de cambio del fragmento.
 */
/* TODO: Eliminar !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
Viewport.prototype.hash = function(hash, changeListener) {
    var path = location.pathname + location.search + (hash = '#' + hash);
    history.pushState({
        historyOrder: this.historyOrder++
    }, '', path);
    // window.location.hash = (hash = '#' + hash); // -> OJO genera un evento "popstate"
    // this.fire('statechange');
    window.dispatchEvent(new Event('statechange'));
    if (changeListener) {
        var self = this;
        var listener = function(event) {
            if (window.location.hash !== hash) {
                changeListener(event);
                self.off('statechange', listener);
            }
        }
        this.on('statechange', listener);
    }
};
*/

/**
 * Busca los nodos que coincidan con la ruta especificada.
 * @param {string} path Ruta especificada.
 * @param {Viewport~RouteNode[]} [routes] Definición de rutas en donde realizar la búsqueda.
 * @param {Viewport~PathNode[]} [nodes] Si se especifica se insertarán los nodos en el mismo en lugar de crear un nuevo
 * array.
 * @return {Viewport~PathNode[]} Array de nodos resultante.
 * @private
 */
Viewport.prototype.findPathNodes = function(path, routes, nodes) {
    if (routes === undefined) {
        routes = this.routes;
    }
    if (nodes === undefined) {
        nodes = [];
    }
    for (var i = 0, r, m; i < routes.length; i++) {
        r = routes[i];
        if (!r.regexp) {
            if (r.sub = Array.isArray(r.routes) && r.routes.length > 0) {
                // NOTE: Siempre que el nodo defina subrutas evaluaremos parcialmente la expresión de ruta del nodo, no
                // hasta el final de la ruta especificada.
                if (r.end) {
                    // Si se especifica lo contrario generamos un aviso por consola
                    console.log('WARNING: Ignoring invalid end value, the node has subroutes! (' + r.path + ')');
                }
                r.end = false;
            } else if (typeof r.end === 'undefined') {
                // Por defecto evaluaremos la expresión de ruta definida por el nodo hasta el final de la cadena de
                // ruta especificada, añadiendo "$" al final del patrón, cuando el nodo defina una vista.
                r.end = !!r.view;
                // Para variar este comportamiento, por ejemplo cuando delegamos en una vista el procesamiento del
                // resto de la ruta, basta con indicar que el nodo no es final añadiendo la propiedad "end" a "false".
            }
            r.regexp = pathToRegexp(r.path, r.keys = [], {
                end: r.end
            });
        }
        // Se evalua la expresión
        m = r.regexp.exec(path);
        if (m) {
            var n = {
                // Metemos la parte de ruta coincidente con el patrón definido por el nodo
                path: (r.view || r.sub) ? m[0] : ''
                // NOTE: Cuando el nodo no defina ninguna vista ni contenga subrutas, no extraeremos ninguna parte de la
                // cadena de ruta especificada
            };
            if (r.handler) {
                n.handler = r.handler;
            }
            if (r.view) {
                n.view = r.view;
            }
            if (r.queryParams) {
                n.queryParams = r.queryParams;
            }
            n.params = {};
            for (var j = 0; j < r.keys.length; j++) {
                n.params[r.keys[j].name] = m[j + 1];
            }
            n.rest = path.substr(m[0].length);
            nodes.push(n);

            // Si el nodo no es final e incluye subrutas se continua buscando la parte restante de la ruta
            if (!r.end && r.sub) {
                this.findPathNodes(n.rest, r.routes, nodes);
            }
        }
    }
    return nodes;
};

/**
 * Busca una vista cargada asociada a la ruta especificada.
 * @param {string} path Ruta especificada.
 * @return {?View} Devuelve la vista correspondiente o null si no se encuentra.
 * @private
 */
Viewport.prototype.findView = function(path) {
    for (var i = this.views.length - 1; i >= 0; i--) {
        if (this.views[i].path === path) {
            return this.views[i].view;
        }
    }
    return null;
};

/**
 * Añade la vista a la pila asociándola a la ruta o clave de búsqueda especificada. Si la vista ya está añadida se mueve
 * a la cima de la pila actualizando la ruta asociada.
 * @param {string} path Ruta especificada.
 * @param {View} view Vista especificada.
 * @private
 */
Viewport.prototype.pushView = function(path, view) {
    this.removeView(view);
    this.views.push({
        path: path,
        view: view,
        time: Date.now()
    });
};

/**
 * Extrae la vista especificada de la pila.
 * @param {View|string} view Vista especificada o ruta asociada a la misma.
 * @param {boolean} [destroy=false] Indica si destruir la vista.
 * @private
 */
Viewport.prototype.removeView = function(view, destroy) {
    if (typeof(view) === 'string' && (view = this.findView(view)) === null) {
        return;
    }
    for (var i = this.views.length - 1; i >= 0; i--) {
        if (this.views[i].view === view) {
            this.views.splice(i, 1);
            break;
        }
    }
    if (destroy) {
        if (view === this.current) {
            this.current = null;
        }
        view.destroy();
    }
};

/**
 * Evalúa si eliminar instancias del tipo de vista especificado según el valor de la propiedad 'keepInstances' definido
 * en el prototipo de la vista.
 * @param {View} view Vista especificada.
 * @param {boolean} [view.keepInstances] Indica el criterio a seguir para eliminar instancias del tipo de vista.
 * @param {View} [curr] Vista actual a preservar junto con la primera (view) cuando se especifica el parámetro.
 * @private
 */
Viewport.prototype.clearViews = function(view, preserve) {
    var keep;
    switch (view.keepInstances) {
        case '*':
        case View.KEEP_MULTIPLE:
            // NOTE: Si es múltiple no es necesario hacer nada
            return;
        case View.KEEP_SINGLE:
            keep = 1;
            break;
        case View.KEEP_NONE:
            keep = 0;
            break;
        default:
            keep = parseInt(view.keepInstances);
            if (isNaN(keep)) {
                keep = 1;
            }
    }
    for (var i = this.views.length - 1, c = 0; i >= 0; i--) {
        var v =  this.views[i].view;
        if (v instanceof view.constructor) {
            if (++c > keep && (!preserve || preserve.indexOf(v) === -1)) {
                this.views.splice(i, 1);
                v.destroy();
            }
        }
    }
};


// Eventos -------------------------------------------------------------------------------------------------------------
/**
 * Añade el manejador de evento al tipo especificado.
 * @param {string} type Tipo de evento.
 * @param {function} handler Función manejadora.
 */
Viewport.prototype.on =
Viewport.prototype.addEventListener = function(type, handler) {
    (this.eventListeners[type] || (this.eventListeners[type] = [])).push(handler);
};

/**
 * Elimina el manejador de evento del tipo especificado.
 * @param {string} type Tipo de evento.
 * @param {function} handler Función manejadora.
 */
Viewport.prototype.off =
Viewport.prototype.removeEventListener = function(type, handler) {
    var list = this.eventListeners[type], i;
    if (list && (i = list.indexOf(handler)) !== -1) {
        list.splice(i, 1);
    }
};

/**
 * Emite el evento especificado.
 * @param {Event|string} event Evento especificado.
 */
Viewport.prototype.fire =
Viewport.prototype.dispatchEvent = function(event) {
    if (typeof(event) === 'string') {
        event = new CustomEvent(event);
    }
    var list = this.eventListeners[event.type];
    if (list) {
        event.target = this;
        for (var i = 0; i < list.length; i++) {
            list[i].call(this, event);
        }
    }
};


// ---------------------------------------------------------------------------------------------------------------------
/**
 * Encapsula los datos y el procesamiento de una petición de carga de una ruta y vista asociada.
 * @param {Viewport} viewport Objeto Viewport al que pertenece la petición.
 * @param {string} path Ruta especificada, puede incluir parámetros de consulta (query) y fragmento (hash).
 * @param {Object} options Opciones adicionales.
 * @param {boolean} [options.back=false] Indica si se trata de una vuelta atrás en el histórico de navegación.
 * @param {View.History} [options.history=View.History.PUSH] Indica que tipo de tratamiento realizar a nivel de
 * histórico de navegación. Por defecto se genera una nueva entrada (push).
 * @param {boolean} [options.reload=false] Indica si recargar la vista asociada a la ruta especificada en caso de que se
 * haya cargado previamente.
 * @param {string} [options.transition] Transición a realizar, por defecto ninguna.
 * @param {function(err: ?Object=)} [options.complete] Función de retorno que será llamada al completar la operación.
 * @constructor
 */
Viewport.Request = function(viewport, path, options) {

    /**
     * Objeto Viewport al que pertenece la petición.
     * @type {Viewport}
     */
    this.viewport = viewport;

    /**
     * Ruta solicitada original, puede incluir parámetros de consulta (query) y fragmento (hash).
     * @type {string}
     */
    this.path = path;

    /**
     * Opciones adicionales.
     * @type {Object}
     */
    this.options = options;

    /**
     * Parte de la ruta procesada hasta el momento.
     * @type {string}
     */
    this.pathPart = '';

    /**
     * Nodos extraídos de la ruta y pendientes de procesar.
     * @type {Viewport~PathNode[]}
     */
    this.pathNodes = null;

    /**
     * Nodo actual en proceso.
     * @type {Viewport~PathNode}
     */
    this.node = null;

    /**
     * Vista en proceso.
     * @type {View}
     */
    this.view = null;

    /**
     * Clave de búsqueda o localización de la vista compuesta por la ruta y los parámetros de consulta (query)
     * especificados en la definición del nodo.
     * @type {string}
     */
    this.viewPath = null;

    /**
     * Objeto de error.
     * @type {*}
     */
    this.error = null;

    /**
     * Transición a realizar.
     * @type {string}
     */
    this.transition = null;

    /**
     * Indica si la petición se ha cancelado.
     * @type {boolean}
     */
    this.cancelled = false;
};

/**
 * Inicia el procesamiento de la petición.
 */
Viewport.Request.prototype.start = function() {
    // Se muestra el indicador de carga
    if (this.viewport.topLevel && this.options.loader !== false) {
        uix.toggleLoader(true);
    }

    // Se parsea la ruta especificada
    var parts = URL.parse(this.path);
    this.options.path = parts.path;
    // Se extraen los parámetros de consulta (query) y el fragmento (hash) y se guardan como opciones
    if (parts.query) {
        this.options.query = URL.parseQuery(parts.query);
    }
    if (parts.fragment) {
        this.options.fragment = parts.fragment;
    }
    // Se resuelve y se guarda la localización completa de la ruta
    this.options.location = URL.qualify(this.path);
    // Si se ha especificado una ruta base se extrae de la ruta especificada
    var path2 = parts.path;
    if (this.viewport.basePath && path2.startsWith(this.viewport.basePath)) {
        path2 = path2.substr(this.viewport.basePath.length);
    }
    // Se buscan los nodos de ruta definidos que coinciden con la ruta anterior
    this.pathNodes = this.viewport.findPathNodes(path2);
    // Se inicia el procesamiento del primer nodo
    this.nextNode();
};

/**
 * Inicia el procesamiento del siguiente nodo.
 */
Viewport.Request.prototype.nextNode = function() {
    // Se comprueba si hay nodos que procesar
    if (this.pathNodes.length === 0) {
        this.showError({
            type: 'not_found',
            message: 'Unable to open: ' + this.path,
            // NOTE: Para simplificar el tratamiento de errores introducimos el código de estado HTTP equivalente.
            status: 404
        });
        return;
    }
    // Se extrae el siguiente nodo
    this.node = this.pathNodes.shift();
    // Se concatena a la ruta en proceso la parte de la ruta asociada al nodo
    this.pathPart += this.node.path;
    // Para evitar concatenar dos slash seguidos usar la siguiente expresión:
    // (this.pathPart.endsWith('/') && this.node.path.startsWith('/')) ? this.node.path.substr(1) : this.node.path
    // Se añaden los parámetros extraídos de la ruta definidos por el nodo
    Object.extend(this.options, this.node.params);
    // Si el nodo define una función manejadora adicional se procesa
    if (typeof this.node.handler === 'function') {
        var self = this;
        this.node.handler(this, function(err) {
            if (self.cancelled) {
                return;
            }
            if (err) {
                self.showError(err);
                return;
            }
            self.checkView();
        });
    } else {
        this.checkView();
    }
};

/**
 * Continua el proceso comprobando en primer lugar si el nodo actual hace referencia a una vista, realizando la carga
 * o recarga de la misma cuando sea necesario.
 */
Viewport.Request.prototype.checkView = function() {
    // Si el nodo no define vista pasamos al siguiente
    if (!this.node.view) {
        this.nextNode();
        return;
    }
    // Se compone la clave de búsqueda de la vista compuesta por la ruta y los parámetros de consulta (query)
    // especificados en la definición del nodo
    this.viewPath = this.pathPart;
    if (this.node.queryParams && this.options.query) {
        this.node.queryParams.forEach(function(name, i) {
            if (name in this.options.query) {
                this.viewPath += ((i > 0) ? '&' : '?') + name + '=' + this.options.query[name];
            }
        }, this);
    }
    // Se comprueba si ya hay una vista cargada asociada a la misma ruta
    this.view = this.viewport.findView(this.viewPath);
    if (this.view && !this.view.__error) {
        this.appendView(this.view, this.options.reload);
        // TO-DO: Incluir otros criterios de recarga, como pueda ser el tiempo de expiración, para lo cual se puede
        // consultar a la propia vista o llamar directamente a la función de recarga y que sea ella misma quien decida
        // cuando realizar la recarga. Con la opción 'reload' lo que haríamos es forzar la recarga en cualquier caso.
    } else {
        // Se carga la vista
        this.appendView(this.node.view);
    }
};

/**
 * Continua el proceso cargando o recargando la vista especificada y añadiéndola al contenedor cuando sea necesario.
 * @param {{View|string}} view Vista especificada.
 * @param {boolean} [reload] Indica si recargar la vista especificada.
 */
Viewport.Request.prototype.appendView = function(view, reload) {
    if (this.cancelled) {
        return;
    }
    if (typeof view === 'string') {
        var name = view;
        // Se carga la vista
        try {
            view = View.create(name, Object.extend(this.options, {
                parentView: this.viewport.parentView
            }));
        } catch (err) {
            console.log('Unable to create view "' + name + '" (' + this.viewPath + '): ' + err);
            this.showError(err);
            return;
        }
        if (this.error) {
            // Si hay un error se marca la vista como error
            view.__error = true;
        }
    }
    var self = this;
    // Guardamos la referencia a la vista
    this.view = view;
    // Se recarga la vista cuando corresponda
    if (reload) {
        setTimeout(function() {
            view.reload(self.options, function (err) {
                if (err) {
                    console.log('Unable to reload view "' + view.__view_name + '" (' + self.viewPath + '): ' + err);
                    self.showError(err);
                    return;
                }
                self.appendView(view)
            });
            // NOTE: Se retrasa la recarga de la vista un tiempo mínimo para no detener la secuencia actual
        }, 10);
        return;
    }
    // Se comprueba si se trata de la vista actual
    if (view === this.viewport.current) {
        this.nextStep();
    } else {
        // Se añade la vista al contenedor
        setTimeout(function() {
            view.include(self.viewport.container, Object.extend(self.options, {
                hide: true
            }), function(err) {
                if (err) {
                    console.log('Unable to append view "' + view.__view_name + '" (' + self.viewPath + '): ' + err);
                    self.showError(err);
                    return;
                }
                // Se continua el proceso
                self.nextStep();
            });
            // NOTE: Se retrasa la inclusión de la vista un tiempo mínimo para no detener la secuencia actual en el caso de
            // que la vista no requiera carga de datos asíncrona y su renderización inicial sea pesada
        }, 10);
    }
};

/**
 * Comprueba si la vista cargada define la función "open" para que procese el resto de la ruta.
 */
Viewport.Request.prototype.nextStep = function() {
    // Se comprueba si la vista implementa la función 'open' para continuar procesando la ruta
    if (typeof this.view.open === 'function') {
        var self = this;
        this.view.open(this.node.rest, Object.extend({}, this.options), function(err) {
            if (err) {
                // TODO: Traceamos el error o confiamos que lo haga la subvista?
                self.showError(err);
                return;
            }
            self.pushView();
        });
    } else {
        this.pushView();
    }
};

/**
 * Añade la vista a la pila, actualiza la ruta actual, evalua la transición a realizar y actualiza el histórico de
 * navegación.
 */
Viewport.Request.prototype.pushView = function() {
    // Se actualiza la ruta actual
    this.viewport.path = this.path;
    // Si se ha especificado ruta de referencia se actualiza
    if (this.options.referer) {
        this.viewport.referer = this.options.referer;
    }
    // Se comprueba si se trata de la vista actual
    if (this.view !== this.viewport.current) {
        // Se evalua la transición a realizar
        if (this.options.transition !== undefined) {
            this.transition = this.options.transition;
        } else {
            // NOTE: Si no se ha especificado transición en las opciones se obtiene de las clases de estilo añadidas en
            // la raíz de la vista
            var curr = this.options.back ? this.viewport.current : this.view;
            this.transition = curr ? (curr.transition || uix.getClassEnding(curr.root, 'uix-transition-') || null) : null;
        }
        // Si no se trata de una vuelta atrás, se guarda la transición para uso posterior
        if (!this.options.back) {
            this.viewport.backTransition = this.transition;
        }
    }

    // Se realiza la gestión del histórico de navegación
    if (this.viewport.topLevel && this.options.history !== View.History.NONE) {
        // TODO: No deberíamos comprobar primero si la ruta cambia???
        // TODO: Añadir (this.path !== this.viewport.path) sin cambiar previamente la ruta
        if (this.options.history === View.History.REPLACE) {
            history.replaceState({
                transition: this.transition,
                historyOrder: this.viewport.historyOrder
            }, '', this.path);
        } else {
            history.pushState({
                transition: this.transition,
                historyOrder: ++this.viewport.historyOrder
            }, '', this.path);
        }
        // Se notifica el cambio de estado, ruta o localización
        // this.viewport.fire('statechange');
        window.dispatchEvent(new Event('statechange'));
    }

    // Si continua el proceso
    if (this.view !== this.viewport.current) {
        this.switchView();
    } else {
        this.done();
    }
};

/**
 * Continua el proceso realizando el intercambio de vistas.
 */
Viewport.Request.prototype.switchView = function() {
    // En caso contrario se actualiza la referencia a la vista actual
    var self = this;
    var curr = this.viewport.current;
    // Se añade a la pila o se mueve a la cima de la misma
    this.viewport.pushView(this.viewPath, this.view);
    // Se cambia la referencia actual a la vista
    this.viewport.current = this.view; // TODO: Evaluar si hacerlo dentro del método anterior
    // Se realiza la transición entre las vistas
    this.view.toggle(true, {
        transition: this.transition,
        reverse: this.options.back,
        done: function() {
            // Se comprueba si eliminar de la pila otras instancias del mismo tipo de vista
            self.viewport.clearViews(self.view, [self.view, curr]);
        }
    })
    if (curr) {
        // Se oculta la vista anterior
        curr.toggle(false, {
            transition: this.transition,
            reverse: !this.options.back,
            done: function() {
                // Se extrae la vista del documento
                curr.remove();
                // Si es una vista de error, estamos volviendo atrás o estamos reemplazando la ruta actual, se extrae de
                // la pila y se destruye
                if (curr.__error || self.options.back || self.options.history === View.History.REPLACE) {
                    self.viewport.removeView(curr, true);
                }
                // Se comprueba si eliminar instancias del mismo tipo de vista
                self.viewport.clearViews(curr, [self.view]);
            }
        });
    }
    // Se finaliza el proceso
    this.done();
};

/**
 * En caso de error carga la vista de error.
 * @param {*} [err] Error especificado.
 */
Viewport.Request.prototype.showError = function(err) {
    // Si ya hay un error acaba el proceso
    if (this.error) {
        this.done();
        return;
    }
    // Se guarda el error
    this.error = err;
    // Si tenemos la referencia a una vista se extrae de la pila y se destruye
    if (this.view) {
        this.viewport.removeView(this.view, true);
        this.view = null;
    }
    // Se carga y se muestra la vista de error, si se ha definido
    if (View.exists('error')) {
        // Se añade el error a las opciones
        this.options.error = err;
        // Se realiza la carga de la vista de error
        this.appendView('error')
    } else {
        console.log('Error view is not defined: ' + err);
        this.done();
    }
};

/**
 * Finaliza el proceso.
 */
Viewport.Request.prototype.done = function() {
    // Se oculta el indicador de carga
    if (this.viewport.topLevel) {
        uix.toggleLoader(false);
    }
    // Se llama a la función de retorno
    // TODO: Notificamos un error si la petición se ha cancelado???
    if (this.options.complete) {
        this.options.complete(this.error, this.view);
    }
    // Se elimina del viewport
    if (this.viewport.request === this) {
        this.viewport.request = null;
    }
};

/**
 * Cancela la petición.
 */
Viewport.Request.prototype.cancel = function() {
    this.cancelled = true;
};


// ---------------------------------------------------------------------------------------------------------------------
/**
 * Posibles acciones a nivel de histórico de navegación a realizar en la apertura de rutas. Desde no realizar ninguna
 * acción (none), hasta añadir una nueva entrada (push) o reemplazar la actual (replace).
 * @enum {string}
 */
View.History = {
    NONE: 'none',
    PUSH: 'push',
    REPLACE: 'replace'
};

// ---------------------------------------------------------------------------------------------------------------------
// Posibles valores de la propiedad "keepInstances" de las instancias de View, que indica el número de instancias de una
// vista que se pueden mantener cargadas en memoria simultáneamente:
/**
 * Indica que no se debe mantener ninguna instancia de la vista cargada en memoria.
 * @type {string}
 * @constant
 */
View.KEEP_NONE = 'none';

/**
 * Indica que se debe mantener una única instancia de la vista cargada en memoria.
 * @type {string}
 * @constant
 */
View.KEEP_SINGLE = 'single';

/**
 * Indica que se pueden mantener múltiples instancias de la vista cargadas en memoria.
 * @type {string}
 * @constant
 */
View.KEEP_MULTIPLE = 'multiple';

// Se añade la propiedad al prototipo de View con el valor por defecto:
/**
 * Número de instancias de la vista que se pueden mantener cargadas en memoria simultáneamente.
 * @type {string|number}
 */
View.prototype.keepInstances = View.KEEP_SINGLE;

// ---------------------------------------------------------------------------------------------------------------------
/**
 * Definición de un nodo de ruta.
 * @typedef {Object} Viewport~RouteNode
 * @property {string} path Ruta parcial del nodo.
 * @property {string|function(new:View, Object=)} [view] Nombre de la vista o constructor del manejador.
 * @property {string[]} [queryParams] Nombre de los parámetros de consulta (query) asociados a la vista y que serán
 * incluidos en la clave de búsqueda o localización de la vista en la pila de vistas cargadas.
 * @property {function(request: Viewport.Request, callback: function)} [handler] Función manejadora adicional.
 * @property {boolean} [end] Indica si el patrón de ruta definido por el nodo debe ser evaluado hasta el final de la
 * cadena ruta especidada o no.
 */

/**
 * Información temporal extraída del procesamiento de la definición de un nodo de ruta.
 * @typedef {Object} Viewport~PathNode
 * @property {string} path Parte de la ruta coincidente con el patrón del nodo.
 * @property {Object.<string,string>} [params] Parámetros extraídos de la ruta.
 * @property {string} [rest] Parte restante de la ruta sin procesar.
 * @property {string|function(new:View, Object=)} [view] Nombre de la vista o constructor del manejador asociado.
 * @property {string[]} [queryParams] Nombre de los parámetros de consulta (query) asociados a la vista y que serán
 * incluidos en la clave de búsqueda o localización de la vista en la pila de vistas cargadas.
 * @property {function(request: Viewport.Request, callback: function)} [handler] Función manejadora adicional.
 */