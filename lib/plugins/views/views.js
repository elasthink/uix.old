/*
 * @file Control y gestión de vistas, manejadores y plantillas.
 * @author angel.teran
 */

/**
 * Objeto base para manejadores de vistas.
 * @param {Object} [settings] Ajustes iniciales de creación de la vista.
 * @class
 */
function View(settings) {

    // Ajustes iniciales
    settings = settings || {};

    /**
     * Identificador único de la vista.
     * @type {number}
     * @private
     */
    this.uid = View.nextUId++;

    /**
     * Referencia al elemento raíz de la vista.
     * @type {Element}
     * @private
     */
    this.root = null;

    /**
     * Nombre de la plantilla asociada.
     * @type {string}
     * @private
     */
    this.template = settings.template || null;

    /**
     * Referencia a la vista padre, ascendiente o contenedora.
     * @type {View}
     * @private
     */
    this.parentView = settings.parentView || null;

    /**
     * URL de datos.
     * @type {string}
     * @private
     */
    this.dataURL = settings.dataURL || null;

    /**
     * Funciones manejadoras de eventos añadidas por tipo.
     * @type {Object.<string, function(event: Object)[]>}
     * @access private
     */
    this.eventListeners = {};


    // -----------------------------------------------------------------------------------------------------------------
    // Inicialización
    this.init(settings);
};

// ---------------------------------------------------------------------------------------------------------------------
/**
 * Siguiente identificador único de vista a asignar.
 * @type {number}
 */
View.nextUId = 1;

/**
 * Índice de manejadores de vista por nombre.
 * @type {Object.<string, function>}
 */
View.handlers = {};

/**
 * Índice de plantillas de vista por nombre.
 * @type {Object.<string, function>}
 */
View.templates = {};

// ---------------------------------------------------------------------------------------------------------------------
/**
 * Define un nuevo tipo de vista.
 * @param {string} name Nombre de la nueva vista.
 * @param {string|Object} [base] Nombre de la vista base de la cual extender o prototipo de la nueva vista.
 * @param {Object} proto Prototipo de la nueva vista.
 * @returns {function(new:View, Object=)} Devuelve la función constructora del nuevo tipo de vista creado.
 */
View.define = function(name, base, proto) {
    if (typeof(base) === 'object') {
        proto = base;
        base = null;
    }
    var baseHandler = (base) ? View.handlers[base] : View;
    var viewHandler = function(settings) {
        baseHandler.call(this, settings);
    };
    viewHandler.prototype = Object.extend(Object.create(baseHandler.prototype), proto);
    viewHandler.prototype.constructor = viewHandler;
    viewHandler.prototype.__view_name = name;
    return View.handlers[name] = viewHandler;
};

/**
 * Crea una nueva instancia del tipo de vista especificado. También se pueden crear vistas sin tipo definido a partir de
 * una plantilla.
 * @param {string} name Nombre del tipo de vista o plantilla.
 * @param {Object} [settings] Ajustes iniciales de creación de la vista.
 * @returns {View} Devuelve la nueva instancia de la vista creada.
 */
View.create = function(name, settings) {
    if (View.handlers[name]) {
        return new View.handlers[name](settings);
    } else if (View.templates[name]) {
        return new View(Object.extend(settings, {
            template: name
        }));
    } else {
        throw new Error('View \'' + name + '\' not found.');
    }
};

/**
 * Renderiza la plantilla especificada.
 * @param {View} view Instancia de la vista.
 * @param {string} name Nombre de la plantilla.
 * @param {Object|function} [options] Opciones adicionales de inclusión de la vista o función de retorno.
 * @param {function(err: ?Object, root: ?Element=)} complete Función de retorno donde se incluye la raíz de la vista
 * generada.
 */
View.render = function(view, name, options, complete) {
    // TODO: Evaluar si hacer que el parámetro 'view' sea opcional
    if (typeof(options) === 'function') {
        complete = options;
        options = {};
    }
    // Se comprueba si existe la plantilla
    if (!View.templates[name]) {
        complete(new Error('Template \'' + name + '\' not found.'));
    }
    // Se renderiza la plantilla
    var context = document.createElement('div'),
        includes = [],
        includeView = function(name, settings, options) {
            var v = View.create(name, Object.extend(settings, {
                    parentView: view
                })),
                id = '--view' + v.uid;
            includes.push({
                id: id,
                name: name,
                view: v,
                options: options
            });
            return '<div id="' + id + '"></div>';
        };
    context.innerHTML = View.templates[name].call(view, options, null, includeView);

    // Se obtiene el elemento raíz de la vista
    var root = context.firstElementChild;

    // Si hay inclusiones se resuelven
    if (includes.length > 0) {
        for (var i = 0, c = includes.length, anchor; i < includes.length; i++) {
            anchor = context.querySelector('#' + includes[i].id);
            includes[i].view.include(anchor, Object.extend(includes[i].options, {
                replace: true
            }), function(err) {
                if (err) {
                    console.log('Unable to include view "' + includes[i].name + '".');
                }
                if (--c === 0) {
                    complete(null, root);
                }
            });
        }
    } else {
        complete(null, root);
    }
};

/**
 * Añade una nueva plantilla con el nombre especificado.
 * @param {string} name Nombre de la plantilla.
 * @param {function} template Función que genera el código de la plantilla.
 */
View.putTemplate = function(name, template) {
    var defaultIndex = '/layout',
        i = name.length - defaultIndex.length;
    if (i > 0 && name.indexOf(defaultIndex, i) === i) {
        name = name.substr(0, i);
    }
    View.templates[name] = template;
};

/**
 * Escapa el código de marcado especificado convirtiendo los cararácteres especiales a las entidades correspondientes.
 * @param {string} code Código especificado.
 * @returns {string} Código resultante.
 */
View.escape = function(code) {
    return (code === undefined) ? '' : String(code).replace(/[&<>'"]/g, function(c) {
        return View.escape.CHARS[c] || c;
    });
};

/**
 * Caracteres especiales de marcado y entidades correspondientes.
 * @type {Object.<string, string>}
 */
View.escape.CHARS = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&#34;',
    "'": '&#39;'
};

// ---------------------------------------------------------------------------------------------------------------------
/**
 * Función de inicialización de la vista.
 * @param {Object} [settings] Ajustes iniciales.
 */
View.prototype.init = function(settings) {
    // NOTE: Implementar por objetos derivados...
};

/**
 * Incluye la vista en el elemento destino especificado.
 * @param {Element} target Elemento destino especificado.
 * @param {Object|function} [options] Opciones adicionales de inclusión de la vista o función de retorno.
 * @param {Object} [options.replace] Indica si reemplazar el elemento destino especificado en lugar de añadir la vista
 * al final del mismo
 * @param {function(err: ?Object=)} [complete] Función de retorno.
 * @return {View} Devuelve la instancia de la vista.
 */
View.prototype.include = function(target, options, complete) {
    var self = this,
        defaults = {};
    if (typeof(options) === 'function') {
        complete = options;
        options = defaults;
    } else {
        options = options || defaults;
    }
    var attach = function() {
        if (options.replace) {
            target.parentNode.replaceChild(self.root, target);
        } else {
            target.appendChild(self.root);
        }
        self.ready(self.root);
        self.fire('vready');
        if (complete) {
            complete();
        }
    };
    if (this.root) {
        attach();
    } else {
        this.load(options, function (err, data) {
            if (err) {
                return (complete && complete(err));
            }
            self.render(Object.extend(options, {
                data: data
            }), function (err, root) {
                if (err) {
                    return (complete && complete(err));
                }
                self.root = root;
                attach();
            });
        });
    }
    return this;
};

/**
 * Genera la representación gráfica de la vista. Por defecto, si no se sobrescribe la función, se emplea el nombre de
 * plantilla especificado en la propiedad 'template'. Si este no se define se busca una plantilla con el mismo nombre
 * que la vista, dado al registrar el manejador. Los objetos derivados pueden variar este comportamiento, haciendo uso
 * de una o más plantillas, sin que sea necesario que el nombre de la plantilla y el manejador de la vista coincidan.
 * @param {?Object} options Opciones adicionales de inclusión de la vista.
 * @param {function(err: ?Object, root: ?Element=)} complete Función de retorno donde se incluye la raíz de la vista
 * generada si no hay errores.
 * @access protected
 */
View.prototype.render = function(options, complete) {
    // NOTE: Implementar por objetos derivados que requieran una implementación más específica del renderizado de la vista.
    View.render(this, this.template || this.__view_name, options, complete);
};

/**
 * Carga de datos. Por defecto, si no se sobrescribe la función, se intentará cargar la URL indicada en la propiedad
 * 'dataURL' si está definida.
 * @param {?Object} options Opciones adicionales de inclusión de la vista.
 * @param {function(err: ?Object=)} complete Función de retorno.
 * @access protected
 */
View.prototype.load = function(options, complete) {
    // NOTE: Implementar por objetos derivados que requieran una implementación específica de la carga de datos adicionales.
    var dataURL = this.dataURL || options.dataURL;
    if (dataURL) {
        uix.load(dataURL, complete);
    } else {
        complete();
    }
};

/**
 * Recarga la vista cuando sea necesario según el criterio implementado en cada caso, o siempre que se fuerce por medio
 * del parámetro 'force'.
 * @param {?Object|function} [options] Opciones adicionales de recarga de la vista o función de retorno.
 * @param {boolean} [options.force] Indica si forzar la recarga incondicionalmente.
 * @param {function(err: ?Object =)} [complete] Función de retorno.
 */
View.prototype.reload = function(options, complete) {
    // NOTE: Implementar por objetos derivados para una implementación específica de la recarga de la vista.
    if (!this.root) {
        throw new Error('View not previously loaded.');
    }
    // Tratamiento de parámetros
    if (typeof(options) === 'function') {
        complete = options;
        options = {};
    }
    // En la implementación por defecto se recarga y renderiza la vista al completo, reemplazando el elemento raíz, y
    // solo cuando se fuerce la recarga con el parámetro 'force'.
    if (options.force) {
        var self = this;
        this.load(options, function(err, data) {
            if (err) {
                return (complete && complete(err));
            }
            self.render(Object.extend(options, {
                data: data
            }), function (err, root) {
                if (err) {
                    return (complete && complete(err));
                }
                var prevRoot = self.root;
                self.root = root;
                if (prevRoot.parentNode) {
                    prevRoot.parentNode.replaceChild(root, prevRoot);
                    self.ready(root);
                    self.fire('vready');
                }
                if (complete) {
                    complete();
                }
            });
        });
    } else if (typeof(complete) === 'function') {
        complete();
    }
};

/**
 * A implementar por objetos derivados cuando sea necesario realizar algún tipo de inicialización específica, como
 * añadir el tratamiento de eventos, ajustes de dimensiones u otros; después de cargar los datos necesarios (load),
 * generar la representación gráfica (render) y añadir la vista al documento o elemento vinculado a un vista en
 * construcción.
 * @param {Element} root Elemento raíz de la vista, también accesible mediante <code>this.root</code>.
 */
View.prototype.ready = function(root) {
    // NOTE: Implementar por objetos derivados cuando proceda.
};

/**
 * Se extrae la vista del documento.
 */
View.prototype.remove = function() {
    if (this.root && this.root.parentNode) {
        uix.remove(this.root);
        this.fire('vremove');
    }
    // NOTE: Para una implementación más específica por objetos derivados no olvidar llamar a la función heredada.
};

/**
 * Destruye la vista.
 */
View.prototype.destroy = function() {
    // NOTE: Implementar por objetos derivados cuando sea necesario.
    // TODO: Implementación por defecto???
};

/**
 * Visualiza u oculta la vista.
 * @param {boolean} show Indica si visualizar u ocultar la vista.
 * @param {function} [complete] Función de retorno.
 */
View.prototype.toggle = function(show, complete) {
    var self = this;
    uix.toggle(this.root, show, function() {
        self.fire(show ? 'vshow' : 'vhide');
        if (complete) {
            complete();
        }
    });
};

// Eventos -------------------------------------------------------------------------------------------------------------
/**
 * Añade el manejador de evento al tipo especificado.
 * @param {string} type Tipo de evento.
 * @param {function} handler Función manejadora.
 */
View.prototype.on =
View.prototype.addEventListener = function(type, handler) {
    (this.eventListeners[type] || (this.eventListeners[type] = [])).push(handler);
};

/**
 * Elimina el manejador de evento del tipo especificado.
 * @param {string} type Tipo de evento.
 * @param {function} handler Función manejadora.
 */
View.prototype.off =
View.prototype.removeEventListener = function(type, handler) {
    var list = this.eventListeners[type], i;
    if (list && (i = list.indexOf(handler)) !== -1) {
        list.slice(i, 1);
    }
};

/**
 * Emite el evento especificado.
 * @param {Event|string} event Evento especificado.
 */
View.prototype.fire =
View.prototype.dispatchEvent = function(event) {
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



// =====================================================================================================================
/**
 * Marco de control de la navegación y visualización de vistas dentro de un elemento contenedor.
 * @param {HTMLElement} container Elemento contenedor.
 * @param {Object} options Opciones y ajustes de configuración.
 * @param {Viewport~RouteNode[]} options.routes Definición de rutas.
 * @param {boolean} [options.topLevel] Indica si el viewport es el de más alto nivel lo que implica realizar la gestión
 * y control del histórico de navegación y la visualización de errores. Por defecto es false.
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

    // -----------------------------------------------------------------------------------------------------------------
    if (this.topLevel) {
        /**
         * Marca de tiempo de la entrada actual del histórico de navegación.
         * @type {number}
         */
        this.timestamp = 0;

        // Se añade el tratamiento del evento 'popstate'
        var self = this;
        window.addEventListener('popstate', function(event) {
            var options = {
                history: false
            };
            if (event.state && 'timestamp' in event.state) {
                // Se comprueba si se trata de una vuelta atrás
                options.back = event.state.timestamp < self.timestamp;
                self.timestamp = event.state.timestamp;
            } else {
                options.back = true;
                self.timestamp = 0;
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
 * @param {boolean} [options.history=true] Indica si guardar la entrada en el histórico de navegación o no.
 * @param {boolean} [options.reload=false] Indica si recargar la vista asociada a la ruta especificada en caso de que ya
 * se haya cargado previamente.
 * @param {function(err: ?Object=} [options.complete] Función de retorno que será llamada al completar la operación.
 * @param {function(err: ?Object=} [complete] Función de retorno que será llamada al completar la operación, tiene
 * mayor precedencia sobre la propiedad anterior.
 */
Viewport.prototype.open = function(path, options, complete) {
    // Tratamiento de parámetros
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

            // Se evalúa si eliminar instancias de las vistas cargadas, tanto de la saliente (actual) como de la entrante
            if (self.current) {
                self.clear(self.current);
            }
            self.clear(view, true);

            // Se realiza la transición entre las vistas
            self.switchView(view);
        }
        // NOTE: La nueva vista puede coincidir con la actual cuando parte de la ruta la procesa una vista interior
        // realiza su propio control de navegación o delegando en un objeto Viewport contenido dentro de la vista.

        // Si topLevel está activo...
        if (self.topLevel) {
            if (!('history' in options) || options.history) {
                // Se añade una nueva entrada en el histórico de navegación
                if (location.protocol !== 'file:') {
                    history.pushState({
                        timestamp: self.timestamp = Date.now()
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
                    console.log('View ' + view.name + ' can\'t open the path ' + rest + ': ' + err);

                    // Se elimina la vista de la pila
                    this.remove(view);

                    // Se carga la vista de error
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
        // Se elimina la vista parcialmente cargada del documento
        if (view) {
            self.removeView(view);
        }

        // Se carga y se muestra la vista de error, si está definida
        if (View.handlers['error']) {
            // Incluimos el error en los parámetros acumulados
            params.error = err;
            self.load('error', params, function(err, view) {
                if (err) {
                    console.log('Unable to load error view: ' + err);
                    return;
                }

                // Se añade a la pila como cualquier otra vista
                self.push(path, view);

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
    var nodes = []; // Array donde se vuelva la información de los nodos hallados
    this.findPath(path, this.routes, nodes);

    // Se comprueba si se ha encontrado algún nodo
    if (nodes.length > 0) {

        // Se vacía el path para ir añadiendo las partes ligadas a cada nodo
        path = '';

        // Se procesan los nodos hallados
        for (var i = 0, params = {}; i < nodes.length; i++) {

            // Se concatena la parte de la ruta ligada al nodo
            path += nodes[i].path;

            // Se acumulan los parámetros extraídos por el nodo
            Object.extend(params, nodes[i].params);

            // Si el nodo define una función manejadora adicional se procesa
            if (typeof(nodes[i].handler) === 'function') {
                nodes[i].handler(params, function() {
                    // TODO: ¿Que hacemos aquí?
                });
            }

            // Si se ha definido una vista se procesa
            if (nodes[i].view) {

                // Se comprueba si hay una vista ya cargada asociada a la misma ruta
                var view = this.find(path);
                if (view) {
                    // Se comprueba si es la vista actual
                    if (view === this.current && !options.reload) {
                        // Se continua el proceso
                        next(view, nodes[i].rest);

                    } else {
                        // Se extrae temporalmente la vista de la pila para añadirla posteriormente a la cima si no hay
                        // errores de carga
                        this.remove(view);

                        // Se recarga la vista
                        view.reload(options.reload, function(err) {
                            if (err) {
                                console.log('Unable to reload view \'' + nodes[i].view + '\' (' + path + '): ' + err);
                                return error(err, view);
                            }

                            // Se introduce nuevamente en la pila
                            self.push(path, view);

                            // Se continua el proceso
                            next(view, nodes[i].rest);
                        });
                    }
                } else { // if (view)

                    // Si no está cargada se inicia la carga
                    this.load(nodes[i].view, params, function(err, view) {
                        if (err) {
                            console.log('Unable to load view \'' + nodes[i].view + '\' (' + path + '): ' + err);
                            return error(err, view);
                        }

                        // Se añade a la pila
                        self.push(path, view);

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
            message: 'Unable to open the specified path: ' + path,
            // NOTE: Para simplificar el tratamiento de errores introducimos el código de estado HTTP equivalente.
            status: 404
        });
    }
};

/**
 * Busca los nodos que coincidan con la ruta especificada.
 * @param {string} path Ruta especificada.
 * @param {Viewport~RouteNode[]} routes Definición de rutas en donde realizar la búsqueda.
 * @param {Viewport~PathNode[]} nodes Array de nodos resultante donde insertar los nodos que coincidan.
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
 * @param {Object} params Parámetros especificados extraídos de la ruta.
 * @param {function(err: ?Object, view: ?View)} complete Función de retorno.
 */
Viewport.prototype.load = function(name, params, complete) {
    if (View.handlers[name]) {
        var view = View.create(name, params);
        view.include(this.container, function(err) {
            complete(err, view);
        });
    } else {
        complete(new Error('View \'' + name + '\' not found.'), null);
    }
};

/**
 * Busca una vista cargada asociada a la ruta especificada.
 * @param {string} path Ruta especificada.
 * @return {?View} Devuelve la vista correspondiente o null si no se encuentra.
 */
Viewport.prototype.find = function(path) {
    for (var i = this.views.length - 1; i >= 0; i--) {
        if (this.views[i].path === path) {
            return this.views[i].view;
        }
    }
    return null;
};

/**
 * Evalúa si hay que eliminar alguna instancia de la vista especificada.
 * @param {View} view Vista especificada.
 * @param {boolean} [view.keepInstances] Indica como mantener las instancias de la vista.
 * @param {boolean} [active] Indica si la vista especificada está activa.
 */
Viewport.prototype.clear = function(view, active) {
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
        if (this.views[i].view instanceof view.constructor) {
            if (++c > keep && (!active || this.views[i].view !== view)) {
                this.removeView(this.views[i].view);
                this.views.splice(i, 1);
            }
        }
    }
};

/**
 * Añade la vista a la pila asociándola a la ruta especificada.
 * @param {string} path Ruta especificada.
 * @param {View} view Vista especificada.
 */
Viewport.prototype.push = function(path, view) {
    this.views.push({
        path: path,
        view: view
    });
};

/**
 * Extrae la vista especificada de la pila.
 * @param {View} view Vista especificada.
 */
Viewport.prototype.remove = function(view) {
    for (var i = this.views.length - 1; i >= 0; i--) {
        if (this.views[i].view === view) {
            this.views.splice(i, 1);
        }
    }
};

/**
 * Elimina la vista especificada, tanto de la pila como del documento. Si se trata de la vista actual, se marca para su
 * posterior eliminación cuando pase a segundo plano.
 * @param {View} view Vista especificada.
 * @param {function} complete Función de retorno.
 */
Viewport.prototype.removeView = function(view) {
    // Antes de eliminar la vista se comprueba si es la vista actual
    if (view === this.current) {
        // Si se trata de la vista actual se marca para que se elimine al ocultarse
        uix.addClass(view.root, '--remove-view');
    } else {
        view.remove();
    }
};

/**
 * Realiza la transición entre vistas.
 * @param {View} next Siguiente vista a visualizar.
 * @param {function} [complete] Función de retorno.
 */
Viewport.prototype.switchView = function(next, complete) {
    if (this.current) {
        this.current.toggle(false);
    }
    (this.current = next).toggle(true, complete);
};

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
 * @property {params: Object.<string,string>} params Parámetros extraídos de la ruta.
 * @property {string} [rest] Parte restante de la ruta sin procesar.
 * @property {string|function(new:View, Object=)} [view] Nombre de la vista o constructor del manejador asociado.
 * @property {function} [handler] Función manejadora adicional.
 */
