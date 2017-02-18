/**
 * Marco de control de la navegación y visualización de vistas dentro de un elemento contenedor.
 * @param {Element} container Elemento contenedor.
 * @param {Object} options Opciones y ajustes de configuración.
 * @param {Viewport~RouteNode[]} options.routes Definición de rutas.
 * @param {boolean} [options.topLevel] Indica si el viewport es el de más alto nivel lo que implica realizar la gestión
 * y control del histórico de navegación y la visualización de errores. Por defecto es false.
 * @param {string} [options.basePath] Ruta base especificada.
 * @param {View} [options.parentView] Vista contenedora del marco.
 * @author terangel
 * @class
 */
function Viewport(container, options) {

    // Opciones por defecto
    var defaults = {
        routes: [],
        topLevel: false
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
    this.parentView = options.parentView || null;

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
     * Definición de rutas.
     * @type {Viewport~RouteNode[]}
     */
    this.routes = options.routes || defaults.routes;

    /**
     * Indica si el viewport es el de más alto nivel lo que implica realizar la gestión y control del histórico de
     * navegación y la visualización de errores. Por defecto es falso.
     * @type {boolean}
     */
    this.topLevel = options.topLevel || defaults.topLevel;

    /**
     * Ruta base a partir de la cual se extraerán las rutas a vistas.
     * @type {string}
     */
    this.basePath = options.basePath || '';

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

    // -----------------------------------------------------------------------------------------------------------------
    if (this.topLevel) {
        /**
         * Marca de tiempo de la entrada actual en el histórico de navegación.
         * @type {number}
         */
        this.timestamp = 0;

        // Se añade el tratamiento del evento 'popstate'
        var self = this;
        window.addEventListener('popstate', function(event) {
            // Estado
            var state = event.state || {};
            // Opciones
            var options = {
                history: View.History.NONE
            };
            // Se obtiene la ruta de la URL en el navegador incluyendo la cadena de búsqueda o consulta y el fragmento (hash)
            var path = location.pathname + location.search + location.hash;
            // Se comprueba si hay una petición de vuelta atrás
            if (self.backRequest) {
                // Se comprueba si la ruta coincide o no se ha especificado
                if (!self.backRequest.path || self.backRequest.path === path) {
                    // Se añaden las opciones incluidas
                    Object.extend(options, self.backRequest.options);
                } else {
                    if (window.history.length > 0) {
                        // Se eliminan la vista cargada asociada a las ruta extraída del histórico no coincidente con la
                        // ruta de la petición de vuelta atrás
                        self.removeView(location.pathname, true);
                        // Se continua volviendo atrás en el histórico de navegación
                        window.history.back();
                        return;
                    } else {
                        console.log('Unable to find path "' + self.backRequest.path + '" in the history.');
                    }
                }
                self.backRequest = null;
            }

            if (state.timestamp) {
                // Se comprueba si se está volviendo atrás o yendo hacía adelante en el histórico de navegación
                options.back = state.timestamp < self.timestamp;
                self.timestamp = state.timestamp;
            } else {
                options.back = true;
                self.timestamp = 0;
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
 * @param {boolean} [options.reload=false] Indica si recargar la vista asociada a la ruta especificada en caso de que se
 * haya cargado previamente.
 * @param {string} [options.transition] Transición a realizar, por defecto ninguna.
 * @param {function(err: ?Object=)} [options.complete] Función de retorno que será llamada al completar la operación.
 * @param {function(err: ?Object=)} [complete] Función de retorno que será llamada al completar la operación, tiene
 * mayor precedencia sobre la propiedad anterior.
 */
Viewport.prototype.open = function(path, options, complete) {
    console.log('[Viewport] Opening ' + path + '...');
    // Tratamiento de parámetros
    var defaults = {};
    if (typeof options === 'function') {
        // ...(url, complete)
        options = Object.extend(defaults, {
            complete: options
        })
    } else {
        // ...(url, options, complete)
        if (options === undefined || options === null) {
            options = defaults;
        } if (typeof options === 'object' && !Array.isArray(options)) {
            options = Object.extend(defaults, options);
        } else {
            throw new TypeError('options parameter must be an object');
        }
        if (typeof complete === 'function') {
            options.complete = complete;
        } else if (complete !== undefined && complete !== null) {
            throw new TypeError('complete parameter must be a function');
        }
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
            if (r.end === undefined) {
                r.end = !(Array.isArray(r.routes) && r.routes.length > 0);
            }
            r.regexp = pathToRegexp(r.path, r.keys = [], {
                end: r.end
            });
        }
        m = r.regexp.exec(path);
        if (m) {
            var n = {
                // Metemos la parte de ruta coincidente con el patrón definido por el nodo
                path: m[0]
            };
            if (r.handler) {
                n.handler = r.handler;
            }
            if (r.view) {
                n.view = r.view;
            };
            n.params = {};
            for (var j = 0; j < r.keys.length; j++) {
                n.params[r.keys[j].name] = m[j + 1];
            }
            nodes.push(n);

            if (!r.end) {
                // Si el nodo no es terminal se extrae la parte de la ruta que queda por procesar
                n.rest = path.substr(m[0].length);
                // Si el nodo incluye subrutas se continua buscando la parte restante de la ruta
                if (Array.isArray(r.routes) && r.routes.length > 0) {
                    this.findPathNodes(n.rest, r.routes, nodes);
                }
            }
        }
    }
    return nodes;
};

/**
 * Vuelta atrás en el histórico de navegación. Si se especifica una ruta se vuelve atrás hasta la misma.
 * @param {string|Object|function} [path] Ruta especificada, opciones o función de retorno.
 * @param {Object|function} [options] Opciones adicionales o función de retorno.
 * @param {boolean} [options.reload=false] Indica si recargar la vista .
 * @param {function(err: ?Object=)} [options.complete] Función de retorno que será llamada al completar la operación.
 * @param {function(err: ?Object=)} [complete] Función de retorno que será llamada al completar la operación, tiene
 * mayor precedencia sobre la propiedad anterior.
 * @private
 */
Viewport.prototype.back = function(path, options, complete) {
    // TO-DO: Aquí podríamos tener una implementación alternativa para cuando el viewport no es 'top level', y entonces
    // requerir la especificación de ruta para llamar a la función 'open' añadiendo la opción 'back'.
    if (!this.topLevel) {
        return;
    }
    // Se comprueba que el histórico tenga alguna entrada
    if (window.history.length > 0) {
        // Se analizan los parámetros recibidos
        if (typeof(path) === 'object') {
            if (typeof(options) === 'function') {
                complete = options;
            }
            options = path;
            path = null;
        } else if (typeof(path) === 'function') {
            complete = path;
            path = options = null;
        } else {
            if (typeof(options) === 'function') {
                complete = options;
                options = null;
            }
        }
        options = options || {};
        if (complete) {
            options.complete = complete;
        }
        // Se muestra el indicador de carga
        uix.toggleLoader(true);
        // Se inicia la vuelta atrás en el histórico de navegación
        this.backRequest = {
            path: path,
            options: options
        }
        window.history.back();
    }
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
 * Añade la vista a la pila asociándola a la ruta especificada.
 * Si la vista ya está añadida se mueve a la cima de la pila.
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
            if (view === this.current) {
                this.current = null;
            }
        }
    }
    if (destroy) {
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
    if (this.viewport.topLevel) {
        uix.toggleLoader(true);
    }
    // Se parsea la ruta especificada
    var parts = URL.parse(this.path);
    // Se extraen los parámetros de consulta (query) y el fragmento (hash) y se guardan como opciones
    if (parts.query) {
        this.options.query = parts.query;
    }
    if (parts.hash) {
        this.options.hash = parts.hash;
    }
    // Si se ha especificado una ruta base se extrae de la ruta especificada
    var path2 = parts.pathname;
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
    // Se concatena la parte de la ruta asociada al nodo a la ruta en proceso
    this.pathPart += this.node.path;
    // Se añaden los parámetros extraídos de la ruta definidos por el nodo
    Object.extend(this.options, this.node.params);
    // Si el nodo define una función manejadora adicional se procesa
    if (typeof this.node.handler === 'function') {
        var self = this;
        this.node.handler(this.options, function(err) {
            // TODO: Comprobar cancelación de la petición !!!
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
    var self = this;
    // Se comprueba si ya hay una vista cargada asociada a la misma ruta
    this.view = this.viewport.findView(this.pathPart);
    if (this.view) {
        this.appendView(this.view, this.options.reload)
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
    if (typeof view === 'string') {
        var name = view;
        // Se carga la vista
        try {
            view = View.create(name, Object.extend(this.options, {
                parentView: this.viewport.parentView
            }));
        } catch (err) {
            console.log('Unable to create view "' + name + '" (' + this.pathPart + '): ' + err);
            this.showError(err);
            return;
        }
    }
    var self = this;
    // Guardamos la referencia a la vista
    this.view = view;
    // Se recarga la vista cuando corresponda
    if (reload) {
        view.reload(this.options, function(err) {
            if (err) {
                console.log('Unable to reload view "' + view.__view_name + '" (' + self.pathPart + '): ' + err);
                self.showError(err);
                return;
            }
            self.appendView(view)
        });
        return;
    }
    // Se comprueba si se trata de la vista actual
    if (view === this.viewport.current) {
        this.nextStep();
    }
    // Se añade la vista al contenedor
    setTimeout(function() {
        view.include(self.viewport.container, Object.extend(self.options, {
            hide: true
        }), function(err) {
            if (err) {
                console.log('Unable to append view "' + view.__view_name + '" (' + self.pathPart + '): ' + err);
                self.showError(err);
                return;
            }
            // Se continua el proceso
            self.nextStep();
        });
        // NOTE: Se retrasa la inclusión de la vista un tiempo mínimo para no detener la secuencia actual en el caso de
        // que la vista no requiera carga de datos asíncrona y su renderización inicial sea pesada
    }, 10);
};

/**
 * Comprueba si la vista cargada define la función "open" para que procese el resto de la ruta.
 */
Viewport.Request.prototype.nextStep = function() {
    // Se comprueba si la vista implementa la función 'open' para procesar el resto de la ruta
    if (typeof this.view.open === 'function') {
        var self = this;
        this.view.open(this.node.rest, this.options, function(err) {
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
    // Se añade a la pila
    // NOTE: Si ya estaba se mueve a la cima
    this.viewport.pushView(this.pathPart, this.view);
    // Se actualiza la ruta actual
    this.viewport.path = this.path;
    // Se evalua la transición a realizar
    if (this.options.transition !== undefined) {
        this.transition = this.options.transition;
    } else {
        // NOTE: Si no se ha especificado transición en las opciones se intenta obtener como propiedad de la vista o de
        // su elemento raíz como atributo de datos.
        var curr = this.options.back ? this.viewport.current : this.view;
        this.transition = curr ? (curr.transition || curr.root.dataset.transition || null) : null;
    }
    // Si no se trata de una vuelta atrás, se guarda la transición para uso posterior
    if (!this.options.back) {
        this.viewport.backTransition = this.transition;
    }
    // Se realiza la gestión del histórico de navegación
    if (this.viewport.topLevel && this.options.history !== View.History.NONE) {
        var state = {
            timestamp: this.viewport.timestamp = Date.now(),
            transition: this.transition
        };
        if (this.options.history === View.History.REPLACE) {
            history.replaceState(state, '', this.path);
        } else {
            history.pushState(state, '', this.path);
        }
    }
    // Se continua el proceso cambiando la vista actual
    this.switchView();
};

/**
 * Continua el proceso realizando el intercambio de vistas.
 */
Viewport.Request.prototype.switchView = function() {
    // Si se trata de la vista actual acaba el proceso
    if (this.view === this.viewport.current) {
        this.done();
        return
    }
    // En caso contrario se actualiza la referencia a la vista actual
    var self = this;
    var curr = this.viewport.current;
    this.viewport.current = this.view;
    // Se realiza la transición entre las vistas
    this.view.toggle(true, {
        transition: this.transition,
        reverse: this.options.back,
        done: function() {
            // Se comprueba si eliminar de la pila otras instancias del mismo tipo de vista
            self.viewport.clearViews(self.view, [self.view, curr]);
        }
    });
    if (curr) {
        // Se oculta la vista actual
        curr.toggle(false, {
            transition: this.transition,
            reverse: !this.options.back,
            done: function() {
                // Se extrae la vista del documento
                curr.remove();
                // Si se trata de una vuelta atrás se extrae de la pila y se destruye
                if (self.options.back) {
                    self.viewport.removeView(curr, true);
                }
                // Se comprueba si eliminar instancias del mismo tipo de vista
                self.viewport.clearViews(curr);
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
        uix.toggleLoader(false, {
            inmediate: !this.transition
        });
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

/**
 * Indica si la vista implementa el método 'open' para procesar rutas internas. Cualquier valor equivalente a 'true' es
 * aceptado por lo que se puede usar la variable para la definición de rutas.
 * @type {(boolean|Viewport~RouteNode[])}
 */
View.prototype.routes = false;

// ---------------------------------------------------------------------------------------------------------------------
/**
 * Definición de un nodo de ruta.
 * @typedef {Object} Viewport~RouteNode
 * @property {string} path Ruta parcial del nodo.
 * @property {string|function(new:View, Object=)} [view] Nombre de la vista o constructor del manejador.
 * @property {function(params: {}, done: function)} [handler] Función manejadora adicional.
 */

/**
 * Información temporal extraída del procesamiento de la definición de un nodo de ruta.
 * @typedef {Object} Viewport~PathNode
 * @property {string} path Parte de la ruta coincidente con el patrón del nodo.
 * @property {Object.<string,string>} params Parámetros extraídos de la ruta.
 * @property {string} [rest] Parte restante de la ruta sin procesar.
 * @property {string|function(new:View, Object=)} [view] Nombre de la vista o constructor del manejador asociado.
 * @property {function} [handler] Función manejadora adicional.
 */