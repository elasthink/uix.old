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
    options = options || defaults;

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
     * Ruta actualmente cargada.
     * @type {string}
     */
    this.path = null;

    /**
     * Definición de rutas.
     * @type {Viewport~RouteNode[]}
     */
    this.routes = options.routes || defaults.routes;

    /**
     * Indica si el marco está en proceso de carga.
     * @type {boolean}
     */
    this.loading = false;

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
     * Petición de vuelta atrás.
     * @type {{path: string, options: Object}}
     */
    this.backRequest = null;

    /**
     * Indica la transición a realizar al volver atrás.
     * @type {string}
     * @see View.Transition
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
                        console.log('Unable to find path \'' + self.backRequest.path + '\' in the history.');
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
 * @param {string} path Ruta especificada, puede incluir cadena de búsqueda o consulta y fragmento (hash).
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
    console.log('[Viewport] opening ' + path + '...');
    // Tratamiento de parámetros
    var defaults = {};
    if (typeof(options) === 'function') {
        complete = options;
        options = defaults;
    } else if (options) {
        if (!complete) {
            complete = options.complete;
        }
    } else {
        options = defaults;
    }

    // Se resuelve la ruta por si fuera relativa
    if (this.topLevel && this.path) {
        path = URL.resolve(path, this.path);
    }

    // Se parsea la ruta especificada para extraer los parámetros y el hash o fragmento e introducirlos como opciones si
    // se han especificado
    var parts = URL.parse(path);
    if (parts.query) {
        options.query = parts.query;
    }
    if (parts.hash) {
        options.hash = parts.hash;
    }

    // Si se ha especificado una ruta base se elimina de la ruta especificada
    var path2 = parts.pathname;
    if (this.basePath && path2.startsWith(this.basePath)) {
        path2 = path2.substr(this.basePath.length);
        // console.log('[Viewport] path -> ' + path2);
    }

    // Funciones -------------------------------------------------------------------------------------------------------
    var self = this,
        transition = null;

    /**
     * Función que se llama después de cargar la vista. Si queda ruta por procesar se comprueba si la vista implementa
     * el método 'open' para que la procese.
     * @param {View} view Vista en proceso.
     * @param {function} [view.open] Función de apertura de rutas.
     * @param {Viewport~PathNode} node Nodo de ruta.
     */
    var next = function(view, node) {
        // console.log('Viewport.open > next()');
        // Se añade a la pila
        self.pushView(path2, view);

        // Se comprueba si la vista implementa la función 'open' para procesar el resto de la ruta
        if (typeof(view.open) === 'function') {
            view.open(node.rest, options, function(err) {
                if (err) {
                    return error(err, view);
                }
                push(view);
            });
        } else {
            push(view);
        }
    };

    /**
     * Función que se encarga de actualizar la ruta actual y el histórico de navegación.
     * @param {View} view Vista en proceso.
     * @param {*} [err] Objeto de error si se ha producido.
     */
    var push = function(view, err) {
        // console.log('Viewport.open > push()');
        // Se actualiza la ruta actual
        self.path = path;

        // Se evalua el tipo de transición a realizar
        transition = options.transition || options.back
            ? (self.current ? self.current.transition || self.current.root.dataset.transition || null : null)
            : view.transition || view.root.dataset.transition || null;
        // NOTE: Si no se ha especificado transición en las opciones se intenta obtener como propiedad de la vista o de
        // su elemento raíz como atributo de datos.

        // Si no se trata de una vuelta atrás, se guarda la transición para uso posterior
        if (!options.back) {
            self.backTransition = transition;
        }

        // Se realiza la gestión del histórico de navegación
        if (self.topLevel && options.history !== View.History.NONE) {
            var state = {
                timestamp: self.timestamp = Date.now(),
                transition: transition
            };
            if (options.history === View.History.REPLACE) {
                history.replaceState(state, '', path);
            } else {
                history.pushState(state, '', path);
            }
        }

        // Se continua el proceso cambiando la vista actual
        swap(view, err);
    };

    /**
     * Realiza el intercambio de vistas.
     * @param {View} view Vista siguiente.
     * @param {*} err Objeto de error si ha ocurrido.
     */
    var swap = function(view, err) {
        // console.log('Viewport.open > swap()');
        // Se comprueba si la vista es la actual
        if (view === self.current) {
            return done(err);
        }

        // Se cambia la referencia a la vista actual
        var curr = self.current;
        self.current = view;

        // Se realiza la transición entre las vistas
        view.toggle(true, transition, {
            reverse: options.back,
            done: function() {
                // Se comprueba si eliminar de la pila otras instancias del mismo tipo de vista
                self.clearViews(view, [view, curr]);
            }
        });
        if (curr) {
            // Se oculta la vista actual
            curr.toggle(false, transition, {
                reverse: !options.back,
                done: function() {
                    // Se extrae la vista del documento
                    curr.remove();
                    // Si se trata de una vuelta atrás siempre la extraemos de la pila destruyendo la instancia
                    if (options.back) {
                        self.removeView(curr, true);
                    }
                    // Se comprueba si eliminar instancias del mismo tipo de vista
                    self.clearViews(curr);
                }
            });
        }

        // Se finaliza el proceso
        done(err);
    };

    /**
     * Carga la vista de error y continua el proceso. Si se especifica una vista, de donde procede el error, se elimina
     * y destruye.
     * @param {*} error Objeto de error.
     * @param {View} [view] Vista especificada
     */
    var error = function(error, view) {
        // console.log('Viewport.open > error()');
        // Si se especifica una vista se elimina y destruye
        if (view) {
            self.removeView(view, true);
        }
        // Se carga y se muestra la vista de error, si está definida
        if (View.exists('error')) {
            self.loadView('error', Object.extend(options, {
                error: error
            }), function(err, view) {
                if (err) {
                    console.log('Unable to load error view: ' + err);
                    return done(error);
                }
                // Se continua el proceso
                push(view, error);
            });
        } else {
            console.log('Error view is not defined: ' + error);
            done(error);
        }
    };

    /**
     * Finaliza y completa el proceso.
     */
    var done = function(err) {
        // console.log('Viewport.open > done()');
        // Se oculta el indicador de carga
        if (self.topLevel) {
            uix.toggleLoader(false, {
                inmediate: !transition
            });
        }

        // Se desactiva el flag de carga
        self.loading = false;

        // Se notifica que el proceso se ha completado
        if (complete) {
            complete(err);
        }
    };

    // -----------------------------------------------------------------------------------------------------------------
    // Estado de carga
    this.loading = true;

    // Indica si se ha resuelto la ruta
    var resolved = false;

    // Se buscan los nodos de ruta definidos que coinciden con la ruta especificada
    var nodes = this.findPath(path2, this.routes);
    if (nodes.length > 0) {
        // Se vacía el path para ir añadiendo las partes ligadas a cada nodo
        path2 = '';
        // Se procesan los nodos hallados
        for (var i = 0, node; i < nodes.length; i++) {
            node = nodes[i];
            // Se concatena la parte de la ruta ligada al nodo
            path2 += node.path;
            // Se acumulan los parámetros extraídos por el nodo
            Object.extend(options, node.params);
            // Si el nodo define una función manejadora adicional se procesa
            if (typeof(node.handler) === 'function') {
                node.handler(options, function(err) {
                    // TODO: ¿Que hacemos aquí?
                });
            }
            // Si se ha definido una vista se procesa
            if (node.view) {
                // Se comprueba si hay una vista ya cargada asociada a la misma ruta
                var view = this.findView(path2);
                if (view) {
                    // Se extrae temporalmente de la pila para añadirla posteriormente a la cima si no hay errores
                    self.removeView(view);
                    // TODO: Que tal un método pushUpView() que lo que haga sea llevar la vista a la cima de la pila sin tener que eliminarla previamente?

                    // Continua el proceso...
                    var cont = function(delay) {
                        // Se comprueba si se trata de la vista actual
                        if (view === self.current) {
                            // Se continua procesando el resto de la ruta
                            next(view, node);
                        } else {
                            // Se incluye de nuevo
                            var include = function() {
                                view.include(self.container, Object.extend(options, {
                                    hide: true
                                }), function(err) {
                                    if (err) {
                                        console.log('Unable to include view \'' + node.view + '\' (' + path2 + '): ' + err);
                                        return error(err, view);
                                    }
                                    // Se continua el proceso
                                    next(view, node);
                                });
                            };
                            if (delay) {
                                // NOTE: Se retrasa la inclusión de la vista para no detener el proceso actual
                                setTimeout(include, 10);
                            } else {
                                include();
                            }
                        }
                    };
                    // Se muestra el indicador de carga
                    if (this.topLevel) {
                        uix.toggleLoader(true);
                    }
                    if (options.reload) {
                        // TODO: Aquí se pueden incluir otros criterios de recarga de la vista como el tiempo de expiración
                        // NOTE: Se retrasa la recarga de la vista para posibilitar que el indicador de carga se muestre
                        // en caso de que no haya carga asíncrona y la renderización inicial de la vista retrase en
                        // exceso el proceso.
                        setTimeout(function() {
                            // Se recarga la vista si así se ha especificado
                            view.reload(options, function (err) {
                                if (err) {
                                    console.log('Unable to reload view \'' + node.view + '\' (' + path2 + '): ' + err);
                                    return error(err, view);
                                }
                                cont();
                            });
                        }, 10);
                    } else {
                        cont(true);
                    }
                } else { // if (view)
                    // Se muestra el indicador de carga
                    if (this.topLevel) {
                        uix.toggleLoader(true);
                    }
                    // Se carga la vista
                    // NOTE: Se retrasa la carga de la vista para posibilitar que el indicador de carga se muestre en
                    // caso de que no haya carga asíncrona y la renderización inicial de la vista retrase en exceso el
                    // proceso.
                    setTimeout(function() {
                        self.loadView(node.view, options, function(err, view) {
                            if (err) {
                                console.log('Unable to load view \'' + node.view + '\' (' + path2 + '): ' + err);
                                return error(err, view);
                            }
                            // Se continua el proceso
                            next(view, node);
                        });
                    }, 10);
                } // if (view) // else

                // Una vez hallada una vista se interrumpe el proceso, aunque no deberían quedar más nodos
                resolved = true;
                break;
            } // if (node.view)
        } // for (var i = 0; i < nodes.length; i++)
    } // if (nodes.length > 0)

    if (!resolved) {
        error({
            type: 'not_found',
            message: 'Unable to open: ' + path,
            // NOTE: Para simplificar el tratamiento de errores introducimos el código de estado HTTP equivalente.
            status: 404
        });
    }
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
 * Busca los nodos que coincidan con la ruta especificada.
 * @param {string} path Ruta especificada.
 * @param {Viewport~RouteNode[]} routes Definición de rutas en donde realizar la búsqueda.
 * @param {Viewport~PathNode[]} [nodes] Si se especifica se insertarán los nodos en el mismo en lugar de crear un nuevo
 * array.
 * @return {Viewport~PathNode[]} Array de nodos resultante.
 * @private
 */
Viewport.prototype.findPath = function(path, routes, nodes) {
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
                    this.findPath(n.rest, r.routes, nodes);
                }
            }
        }
    }
    return nodes;
};

/**
 * Carga la vista especificada.
 * @param {string} view Nombre de vista especificado.
 * @param {Object} options Opciones y parámetros especificados.
 * @param {function(err: ?Object, view: ?View=)} complete Función de retorno.
 * @private
 */
Viewport.prototype.loadView = function(name, options, complete) {
    var view;
    try {
        view = View.create(name, Object.extend(options, {
            parentView: this.parentView
        }));
    } catch (err) {
        return complete(err);
    }
    // NOTE: Los parámetros especificados se pasan tanto en la creación como en la inclusión, como ajustes y opciones
    // respectivamente, luego depende de la implementación de cada vista tomar unos parámetros u otros en cada método.
    var self = this;
    view.include(self.container, Object.extend(options, {
        hide: true
    }), function(err) {
        complete(err, view);
    });
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
 * @param {string} path Ruta especificada.
 * @param {View} view Vista especificada.
 * @private
 */
Viewport.prototype.pushView = function(path, view) {
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