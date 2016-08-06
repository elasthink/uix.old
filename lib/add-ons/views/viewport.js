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
 * Marco de control de la navegación y visualización de vistas dentro de un elemento contenedor.
 * @param {Element} container Elemento contenedor.
 * @param {Object} options Opciones y ajustes de configuración.
 * @param {Viewport~RouteNode[]} options.routes Definición de rutas.
 * @param {boolean} [options.topLevel] Indica si el viewport es el de más alto nivel lo que implica realizar la gestión
 * y control del histórico de navegación y la visualización de errores. Por defecto es false.
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
     * @type {HTMLElement}
     */
    this.container = container;

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
     * @type {View}
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
     * Petición de vuelta atrás.
     * @type {{path: string, options: Object}}
     */
    this.backRequest = null;

    /**
     * Última transición realizada.
     * @type {string}
     * @see View.Transition
     */
    this.transition = null;

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
            var options = {
                history: View.History.NONE
            };
            if (self.backRequest) {
                if (!self.backRequest.path || self.backRequest.path === location.pathname) {
                    Object.extend(options, self.backRequest.options);
                } else {
                    if (window.history.length > 0) {
                        // Se eliminan las vistas cargadas en la pila asociadas a las rutas extraídas del histórico
                        var v = self.findView(location.pathname);
                        if (v) {
                            self.removeView(v, true);
                        }
                        // Se continua volviendo atrás en el histórico de navegación
                        window.history.back();
                        return;
                    } else {
                        self.backRequest = null;
                        console.log('Unable to find path \'' + self.backRequest.path + '\' in the history.');
                    }
                }
                self.backRequest = null;
            }

            if (event.state && 'timestamp' in event.state) {
                // Se comprueba si se está volviendo atrás o yendo hacía adelante en el histórico de navegación
                options.back = event.state.timestamp < self.timestamp;
                self.timestamp = event.state.timestamp;
            } else {
                options.back = true;
                self.timestamp = 0;
            }
            if (!options.transition) {
                options.transition = (options.back) ? self.transition : event.state.transition;
            }
            if (options.back && event.state && 'transition' in event.state) {
                self.transition = event.state.transition;
            }
            self.open(location.pathname, options);
        });
    }
};

/**
 * Abre la ruta especificada.
 * @param {string} path Ruta especificada.
 * @param {Object|function} [options] Opciones adicionales o función de retorno.
 * @param {boolean} [options.back=false] Indica si se trata de una vuelta atrás en el histórico de navegación.
 * @param {View.History} [options.history=push] Indica que tipo de tratamiento realizar a nivel de histórico de
 * navegación. Por defecto se genera una nueva entrada (push).
 * @param {boolean} [options.reload=false] Indica si recargar la vista asociada a la ruta especificada en caso de que ya
 * se haya cargado previamente.
 * @param {string} [options.transition] Transición a realizar, por defecto ninguna.
 * @param {function(err: ?Object=)} [options.complete] Función de retorno que será llamada al completar la operación.
 * @param {function(err: ?Object=)} [complete] Función de retorno que será llamada al completar la operación, tiene
 * mayor precedencia sobre la propiedad anterior.
 */
Viewport.prototype.open = function(path, options, complete) {
    if (typeof(options) === 'function') {
        complete = options;
        options = {};
    } else if (options) {
        if (!complete) {
            complete = options.complete;
        }
    } else {
        options = {};
    }

    // Funciones -------------------------------------------------------------------------------------------------------
    var self = this;

    /**
     * Función que se llama después de cargar la vista. Si queda ruta por procesar se comprueba si la vista implementa
     * el método 'open' para que la procese.
     * @param {View} view Vista en proceso.
     * @param {string} rest Resto de ruta por procesar.
     */
    var next = function(view, rest) {
        // Se añade a la pila
        self.pushView(path, view);

        // Se comprueba si queda ruta por procesar y si la vista implementa el método 'open'
        if (rest && typeof(view.open) === 'function') {
            view.open(rest, options, function(err) {
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
        // Se actualiza la ruta actual
        self.path = path;
        // Se evalua la transición a realizar
        if (!options.transition) {
            // Si no se ha especificado transición se intenta obtener de la vista o de su elemento raíz
            options.transition = (options.back)
                ? (self.current ? self.current.transition || self.current.root.dataset.transition || null : null)
                : view.transition || view.root.dataset.transition || null;
        }
        // Si no se trata de una vuelta atrás guardamos la transición de entrada de la nueva vista para uso posterior
        if (!options.back) {
            self.transition = options.transition;
        }
        // Se realiza la gestión del histórico de navegación
        if (self.topLevel && options.history !== View.History.NONE) {
                // && location.protocol !== 'file:'
            var state = {
                timestamp: self.timestamp = Date.now(),
                transition: options.transition
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
        // Se comprueba si la vista es la actual
        if (view === self.current) {
            return done(err);
        }
        // Se actualiza la referencia a la vista actual
        var curr = self.current;
        self.current = view;
        // Se oculta el indicador de carga
        uix.toggleLoader(false);
        // Se crea e inicia la transición
        Transition.create(options.transition, view.root, curr ? curr.root : null, {
            reverse: options.back
        }).start(function () {
            // Se ajusta la posición del scroll a la (0, 0)
            window.scrollTo(0, 0);
            if (curr) {
                curr.fire('vhide');
                // Se extrae la vista del documento
                curr.remove();
                // Si se trata de una vuelta atrás siempre eliminamos de la vista de la pila y destruimos la instancia
                if (options.back) {
                    self.removeView(curr, true);
                }
                // Se comprueba si eliminar de la pila la instancia y otras instancias del mismo tipo de vista
                self.clearViews(curr);
            }
            view.fire('vshow');
            // Se comprueba si eliminar de la pila otras instancias del mismo tipo de vista
            self.clearViews(view, true);
            // Se finaliza el proceso
            done(err);
        });
    };

    /**
     * Carga la vista de error y continua el proceso. Si se especifica una vista, de donde procede el error, se elimina
     * y destruye.
     * @param {*} error Objeto de error.
     * @param {View} [view] Vista especificada
     */
    var error = function(error, view) {
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
            console.log('Error view is not defined: ' + err);
            done(error);
        }
    };

    /**
     * Finaliza y completa el proceso.
     */
    var done = function(err) {
        uix.toggleLoader(false);
        self.loading = false;
        if (complete) {
            complete(err);
        }
    };

    // -----------------------------------------------------------------------------------------------------------------
    // Estado de carga
    this.loading = true;

    // Se muestra el indicador de carga
    uix.toggleLoader(true);

    // Indica si se ha resuelto la ruta
    var resolved = false;

    // Se buscan los nodos de ruta definidos que coinciden con la ruta especificada
    var nodes = this.findPath(path, this.routes);
    if (nodes.length > 0) {
        // Se vacía el path para ir añadiendo las partes ligadas a cada nodo
        path = '';
        // Se procesan los nodos hallados
        for (var i = 0, node; i < nodes.length; i++) {
            node = nodes[i];
            // Se concatena la parte de la ruta ligada al nodo
            path += node.path;
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
                var view = this.findView(path);
                if (view) {
                    // Se extrae temporalmente de la pila para añadirla posteriormente a la cima si no hay errores
                    self.removeView(view);

                    var cont = function() {
                        // Se comprueba si se trata de la vista actual
                        if (view === self.current) {
                            // Se continua procesando el resto de la ruta
                            next(view, nodes[i].rest);
                        } else {
                            // Se incluye de nuevo
                            view.include(self.container, Object.extend(options, {
                                style: {
                                    visibility: 'hidden'
                                }
                            }), function(err) {
                                if (err) {
                                    console.log('Unable to include view \'' + node.view + '\' (' + path + '): ' + err);
                                    return error(err, view);
                                }
                                // Se continua el proceso
                                next(view, nodes[i].rest);
                            });
                        }
                    };
                    if (options.reload) {
                        // TODO: Incluir aquí otros criterios de recarga de la vista como el tiempo de expiración
                        // Se recarga la vista si así se ha especificado
                        view.reload(options, function(err) {
                            if (err) {
                                console.log('Unable to reload view \'' + nodes[i].view + '\' (' + path + '): ' + err);
                                return error(err, view);
                            }
                            cont();
                        });
                    } else {
                        cont();
                    }
                } else { // if (view)
                    // Se carga la vista
                    this.loadView(nodes[i].view, options, function(err, view) {
                        if (err) {
                            console.log('Unable to load view \'' + nodes[i].view + '\' (' + path + '): ' + err);
                            return error(err, view);
                        }
                        // Se continua el proceso
                        next(view, nodes[i].rest);
                    });
                } // if (view) // else

                // Una vez hallada una vista se interrumpe el proceso, aunque no deberían quedar más nodos
                resolved = true;
                break;
            } // if (nodes[i].view)
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
 * Vuelta atrás en el histórico de navegación. Si se especifica una ruta volveré atrás hasta localizar la misma.
 * @param {string|Object|function} [path] Ruta especificada, opciones o función de retorno.
 * @param {Object|function} [options] Opciones adicionales o función de retorno.
 * @param {boolean} [options.reload=false] Indica si recargar la vista .
 * @param {function(err: ?Object=)} [options.complete] Función de retorno que será llamada al completar la operación.
 * @param {function(err: ?Object=)} [complete] Función de retorno que será llamada al completar la operación, tiene
 * mayor precedencia sobre la propiedad anterior.
 * @private
 */
Viewport.prototype.back = function(path, options, complete) {
    if (window.history.length > 0) {
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
        view = View.create(name, options);
    } catch (err) {
        return complete(err);
    }
    // NOTE: Los parámetros especificados se pasan tanto en la creación como en la inclusión, como ajustes y opciones
    // respectivamente, luego depende de la implementación de cada vista tomar unos parámetros u otros en cada método.
    view.include(this.container, Object.extend(options, {
        style: {
            visibility: 'hidden'
        }
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
 * @param {View} view Vista especificada.
 * @param {boolean} [destroy=false] Indica si también destruir la vista.
 * @private
 */
Viewport.prototype.removeView = function(view, destroy) {
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
 * Evalúa si hay que eliminar alguna instancia de la vista especificada.
 * @param {View} view Vista especificada.
 * @param {boolean} [view.keepInstances] Indica como mantener las instancias de la vista.
 * @param {boolean} [active] Indica si la vista especificada está activa.
 * @private
 */
Viewport.prototype.clearViews = function(view, active) {
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
    for (var i = this.views.length - 1, c = 0, v; i >= 0; i--) {
        v = this.views[i].view;
        if (v instanceof view.constructor) {
            if (++c > keep && (!active || v !== view)) {
                this.views.splice(i, 1);
                v.destroy();
            }
        }
    }
};

/**
 * Cambia la vista actual por la siguiente especificada.
 * @param {View} next Vista siguiente especificada.
 * @param {Object} options Opciones adicionales especificadas.
 * @param {function} complete Función de retorno que se llamará al concluir la transición entre las vistas.
 */
Viewport.prototype.switchView = function(next, options, complete) {
    var curr = this.current, self = this;
    // Se evalua la transición a realizar
    if (!options.transition) {
        options.transition = (options.back)
            ? (curr ? curr.transition || curr.root.dataset.transition || null : null)
            : next.transition || next.root.dataset.transition || null;
    }
    Transition.create(options.transition, next.root, curr ? curr.root : null, {
        reverse: options.back
    }).start(function() {
        self.current = next;
        if (!options.back) {
            self.transition = options.transition;
        }
        if (curr) {
            curr.fire('vhide');
            curr.remove();
            if (options.back) {
                self.removeView(curr, true);
            }
            self.clearViews(curr);
        }
        next.fire('vshow');
        self.clearViews(next, true);
        if (complete) {
            complete();
        }
    });
};



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