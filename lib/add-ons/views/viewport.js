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
     * @type {{path: string, view: View}[]}
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

    // -----------------------------------------------------------------------------------------------------------------
    if (this.topLevel) {
        /**
         * Marca de tiempo de la entrada actual en el histórico de navegación.
         * @type {number}
         */
        // this.timestamp = 0;

        // Se añade el tratamiento del evento 'popstate'
        var self = this;
        window.addEventListener('popstate', function(event) {
            var options = {
                history: false
            };
            if (self.backRequest) {
                if (location.pathname === self.backRequest.path) {
                    Object.extend(options, self.backRequest.options);
                } else {
                    if (window.history.length > 0) {
                        window.history.back();
                        return;
                    } else {
                        self.backRequest = null;
                        console.log('Unable to find path \'' + self.backRequest.path + '\' in the history.');
                    }
                }
                self.backRequest = null;
            }

            // if (event.state && 'timestamp' in event.state) {
            //     // Se comprueba si se trata de una vuelta atrás
            //     options.back = event.state.timestamp < self.timestamp;
            //     self.timestamp = event.state.timestamp;
            // } else {
                options.back = true;
            //     self.timestamp = 0;
            // }
            // NOTE: La marca de tiempo parece que nos permitía distinguir el caso de que después de realizar una
            // navegación por la aplicación, salir de la misma y navegar por otras páginas, sin cambiar de ventana o
            // pestaña, si volvemos atrás a la aplicación a través de los controles del navegador por el histórico de
            // navegación, estábamos desactivando el flag "back" hasta cargar una entrada con la marca de tiempo.
            // La verdad es que no lo acabo de entender muy bien en que casos podría ser necesario esto, quizás es algo
            // que hemos arrastrado y con el flag "history" no es necesario hacer ningún tipo de distinción en estos
            // casos.
            // En cualquier caso parece lógico que siempre consideremos una vuelta atrás procesar cualquier ruta que
            // provenga de un evento 'popstate', por tanto lo comentamos hasta estar más seguros.

            self.open(location.pathname, options);

        });
    }
};

/**
 * Abre la ruta especificada.
 * @param {string} path Ruta especificada.
 * @param {Object|function} [options] Opciones adicionales o función de retorno.
 * @param {boolean} [options.back=false] Indica si se trata de una vuelta atrás en el histórico de navegación.
 * @param {boolean} [options.history=true] Indica si guardar la entrada en el histórico de navegación o no.
 * @param {boolean} [options.reload=false] Indica si recargar la vista asociada a la ruta especificada en caso de que ya
 * se haya cargado previamente.
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

    // Funciones adicionales -------------------------------------------------------------------------------------------
    var self = this;

    /**
     * Realiza el intercambio de vistas y finaliza el proceso llamando a la función de retorno.
     * @param {View} view Vista cargada.
     * @param {Object} [err] Error especificado.
     */
    var swap = function(view, err) {
        // Se oculta el indicador de carga
        uix.toggleLoader(false);

        // Se comprueba si la vista es diferente a la actual
        if (view !== self.current) {
            // Se realiza la transición entre las vistas y se evalúa si eliminar vistas cargadas, tanto de la saliente
            // como de la entrante
            if (self.current) {
                var curr = self.current;
                curr.toggle(false, function() {
                    curr.remove();
                    self.clearViewInstances(curr);
                });
            }
            view.toggle(true, function() {
                self.clearViewInstances(view, true);
            });
            self.current = view;
        }
        // NOTE: La nueva vista puede coincidir con la actual cuando parte de la ruta la procesa una vista interior
        // realiza su propio control de navegación o delegando en un objeto Viewport contenido dentro de la vista.

        // Si topLevel está activo...
        if (self.topLevel) {
            if (!('history' in options) || options.history) {
                // Se añade una nueva entrada en el histórico de navegación
                if (location.protocol !== 'file:') {
                    history.pushState({
                        // NOTE: De momento lo comentamos, más información en el tratamiento del evento 'popstate'
                        // timestamp: self.timestamp = Date.now()
                    }, '', path);
                }

                // Se ajusta la posición del scroll a la (0, 0)
                window.scrollTo(0, 0);
            }
        }

        // Se actualiza la ruta actual
        self.path = path;

        // Se llama a la función de retorno
        if (typeof(complete) === 'function') {
            complete(err);
        }
    };

    /**
     * Comprueba si queda ruta sin procesar y si la vista cargada define la interfaz para abrir rutas relativas.
     * @param {View} view Vista cargada.
     * @param {function} [view.open] Función de apertura de rutas relativas.
     * @param {string} [rest] Resto de ruta sin procesar.
     */
    var next = function(view, rest) {
        if (rest !== undefined && typeof(view.open) === 'function') {
            // TODO: Revisar la implementación del tratamiento delegado de rutas parciales por vistas ya que hemos realizado muchos cambios y puede ser que no funcione correctamente
            view.open(rest, options, function(err) {
                if (err) {
                    return error(err, view);
                }
                // Se realiza la transición
                swap(view);
            });
        } else {
            // Se realiza la transición
            swap(view);
        }
    };

    /**
     * Muestra la vista de error por defecto.
     * @param {Object} err Error especificado.
     * @param {View} [view] Vista parcialmente cargada.
     */
    var error = function(err, view) {
        // Si se especifica una vista se destruye
        if (view) {
            self.removeView(view, true);
        }

        // Se carga y se muestra la vista, si está definida
        if (View.handlers['error'] || View.templates['error']) {
            self.loadView('error', Object.extend(options, {
                error: err
            }), function(err, view) {
                if (err) {
                    console.log('Unable to load error view: ' + err);
                    return;
                }
                // Se añade a la pila como cualquier otra vista
                self.pushView(path, view);
                // Se realiza la transición
                swap(view, err);
            });
        } else {
            console.log('Error view is not defined: ' + err);
        }
    };
    // -----------------------------------------------------------------------------------------------------------------
    // Se muestra el indicador de carga
    uix.toggleLoader(true);

    // Indica si se ha resuelto la ruta o no se ha encontrado vista
    var resolved = false;

    // Se buscan los nodos de ruta definidos que coinciden con la ruta especificada
    var nodes = []; // Array donde se vuelca la información de los nodos hallados
    this.findPath(path, this.routes, nodes);

    // Se comprueba si se ha encontrado algún nodo
    if (nodes.length > 0) {

        // Se vacía el path para ir añadiendo las partes ligadas a cada nodo
        path = '';

        // Se procesan los nodos hallados
        for (var i = 0; i < nodes.length; i++) {

            // Se concatena la parte de la ruta ligada al nodo
            path += nodes[i].path;

            // Se acumulan los parámetros extraídos por el nodo
            Object.extend(options, nodes[i].params);

            // Si el nodo define una función manejadora adicional se procesa
            if (typeof(nodes[i].handler) === 'function') {
                nodes[i].handler(options, function(err) {
                    // TODO: ¿Que hacemos aquí?
                });
            }

            // Si se ha definido una vista se procesa
            if (nodes[i].view) {
                // Se comprueba si hay una vista ya cargada asociada a la misma ruta
                var view = this.findView(path);
                if (view) {
                    var done = function() {
                        // Se comprueba si se trata de la vista actual
                        if (view === self.current) {
                            // Se continua procesando el resto de la ruta
                            next(view, nodes[i].rest);
                        } else {
                            // Se extrae temporalmente de la pila para añadirla a la cima si no hay errores
                            self.removeView(view);
                            // Se incluye de nuevo
                            view.include(self.container, options, function(err) {
                                if (err) {
                                    console.log('Unable to include view \'' + nodes[i].view + '\' (' + path + '): ' + err);
                                    return error(err, view);
                                }
                                // Se introduce nuevamente en la pila
                                self.pushView(path, view);
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
                            done();
                        });
                    } else {
                        done();
                    }
                } else { // if (view)
                    // Se carga la vista
                    this.loadView(nodes[i].view, options, function(err, view) {
                        if (err) {
                            console.log('Unable to open ' + path + ': ' + err);
                            return error(err, view);
                        }
                        // Se añade a la pila
                        self.pushView(path, view);
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
 * @param {Viewport~PathNode[]} nodes Array de nodos resultante donde insertar los nodos que coincidan.
 * @private
 */
Viewport.prototype.findPath = function(path, routes, nodes) {
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
        view: view
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
        this.destroyView(view);
    }
};

/**
 * Evalúa si hay que eliminar alguna instancia de la vista especificada.
 * @param {View} view Vista especificada.
 * @param {boolean} [view.keepInstances] Indica como mantener las instancias de la vista.
 * @param {boolean} [active] Indica si la vista especificada está activa.
 * @private
 */
Viewport.prototype.clearViewInstances = function(view, active) {
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