/**
 * Objeto base para manejadores de vistas.
 * @param {Object} [settings] Ajustes iniciales de creación de la vista.
 * @class
 */
function View(settings) {

    // Ajustes por defecto
    settings = settings || {};

    /**
     * Identificador único de la vista.
     * @type {string}
     * @private
     */
    this.uid = View.cache.put(this);

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
     * Posición de scroll asociada a la vista.
     * @type {{top: number, left: number}}
     * @protected
     */
    this.scroll = null;

    /**
     * Funciones manejadoras de eventos añadidas por tipo.
     * @type {Object.<string, function(event: Object)[]>}
     * @private
     */
    this.eventListeners = {};


    // Creación e inicialización
    // -----------------------------------------------------------------------------------------------------------------
    this.create(settings);
};

// ---------------------------------------------------------------------------------------------------------------------
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
 * @param {string|Object} [base] Nombre de la vista base de la cual extender el prototipo de la nueva vista.
 * @param {Object} proto Prototipo de la nueva vista.
 * @returns {function(new:View, Object=)} Devuelve la función constructora del nuevo tipo de vista creado.
 */
View.define = function(name, base, proto) {
    if (typeof(base) === 'object') {
        proto = base;
        base = null;
    }
    var B = (base) ? View.handlers[base] : View;
    var T = function(settings) {
        B.call(this, settings);
    };
    T.prototype = Object.extend(Object.create(B.prototype), proto);
    T.prototype.constructor = T;
    /** @memberof View */
    T.prototype.__view_name = name;
    return View.handlers[name] = T;
};

/**
 * Comprueba si existe una vista o plantilla con el nombre especificado.
 * @param {string} name Nombre especificado.
 * @return {boolean} Devuelve verdadero si la vista existe y falso en caso contrario.
 */
View.exists = function(name) {
    return !!(View.handlers[name] || View.templates[name]);
};

/**
 * Crea una nueva instancia del tipo de vista especificado. También se pueden crear vistas sin tipo definido a partir de
 * una plantilla.
 * @param {string} name Nombre del tipo de vista o plantilla.
 * @param {Object} [settings] Ajustes iniciales de creación de la vista.
 * @return {View} Devuelve la nueva instancia de la vista creada.
 */
View.create = function(name, settings) {
    var view;
    if (View.handlers[name]) {
        view = new View.handlers[name](settings);
    } else if (View.templates[name]) {
        view = new View(Object.extend(settings, {
            template: name
        }));
    } else {
        throw new Error('View \'' + name + '\' not found.');
    }
    return view;
};

/**
 * Renderiza la plantilla especificada en el contexto de generación de una vista de manera asíncrona, pasando el
 * elemento raíz de la estructura HTML generada (root) a la función de retorno una vez completada la inclusión y
 * generación de todas las subvistas incluidas.
 * @param {View|string} [view] Instancia de la vista sobre la que llamar al renderizado de la plantilla a la que le
 * llegará como referencia 'this'.
 * @param {string} template Nombre de la plantilla.
 * @param {Object|function} [options] Opciones adicionales de inclusión de la vista o función de retorno.
 * @param {function(err: ?Object, root: ?Element=)} [complete] Función de retorno donde se incluye la raíz de la vista
 * generada.
 */
View.render = function(view, template, options, complete) {
    if (typeof(view) === 'string') {
        complete = options;
        options = template;
        template = view;
        view = null;
    }
    if (typeof(options) === 'function') {
        complete = options;
        options = {};
    }

    // Se comprueba si existe la plantilla
    if (!View.templates[template]) {
        return complete(new Error('Template \'' + template + '\' not found.'));
    }

    var context = document.createElement('div');
    var includeQueue = [];

    /**
     * Función para incluir sub-vistas o plantillas.
     * @param {string} name Nombre de vista o plantilla.
     * @param {Object|function} [settings] Ajustes iniciales de creación de la vista.
     * @param {View} [settings.parentView] Referencia a la vista padre contenedora.
     * @param {Object|function} [options] Opciones adicionales de inclusión de la vista.
     * @param {string} [options.member] Nombre de la variable a asignar en la instancia de la vista padre.
     * @param {function(err: ?Object, root: ?Element=)} complete Función de retorno.
     * @return {string} Código HTML para anclar la vista que luego se sustuirá por cada vista.
     */
    var includeView = function(name, settings, options, complete) {
        if (typeof settings === 'function') {
            complete = settings;
            settings = options = null;
        } else if (typeof options === 'function') {
            complete = options;
            options = null;
        }
        settings = settings || {};
        options = options || settings;
        if (view) {
            settings.parentView = view;
        }
        var v = View.create(name, settings);
        if (view && typeof options.member === 'string') {
            view[options.member] = v;
        }
        var id = 'include-view-' + v.uid;
        includeQueue.push({
            id: id,
            name: name,
            view: v,
            options: options,
            complete: complete
        });
        return '<div id="' + id + '"></div>';
    };
    try {
        context.innerHTML = View.templates[template].call(view, options, null, includeView);
    } catch (err) {
        complete(err);
        return;
    }

    // Se obtiene el elemento raíz de la vista
    var root = context.firstElementChild;

    // Si hay inclusiones se resuelven
    if (includeQueue.length > 0) {
        var errors = [];
        for (var i = 0, c = includeQueue.length, include, anchor; i < includeQueue.length; i++) {
            include = includeQueue[i];
            anchor = context.querySelector('#' + include.id);
            include.view.include(anchor, Object.extend(include.options, {
                replace: true
            }), function(err, view) {
                if (err) {
                    errors.push(err = new ViewError('Unable to include \'' + include.name + '\': ' + err.toString(), err));
                    console.log(err);
                }
                if (include.complete) {
                    include.complete(err, view);
                }
                if (--c === 0) {
                    if (errors.length > 0) {
                        var msg = 'Unable to complete render of \'' + template + '\':\n';
                        for (var i = 0; i < errors.length; i++) {
                            msg += '\t- ' + errors[i].toString() + '\n';
                        }
                        err = new ViewError(msg, errors);
                    }
                    complete(err, root);
                }
            });
        }
    } else {
        complete(null, root);
    }
};

// ---------------------------------------------------------------------------------------------------------------------
/**
 * Cache de instancias de vistas por identificador único.
 */
View.cache = {

    /**
     * Mapa de instancias por identificador único.
     * @type {Object.<number, View>}
     */
    map: {},

    /**
     * Último identificador único asignado.
     * @type {number}
     */
    uid: 0,

    /**
     * Añade una nueva vista a la cache.
     * @param {View} view Vista especificada.
     * @return {string} Devuelve el identificador único asignado a la vista.
     */
    put: function(view) {
        this.map[++this.uid] = view;
        return this.uid.toString();
    },

    /**
     * Devuelve la instancia asignada al identificador único especificado.
     * @param {string} id Identificador único de la vista.
     * @return {View} Instancia de la vista o null si no existe ninguna vista con ese identificador.
     */
    get: function(id) {
        return (id && id in this.map) ? this.map[id] : null;
    },

    /**
     * Elimina de la cache la vista asociada al identificador especificado.
     * @param {string} id Identificador único de la vista.
     */
    remove: function(id) {
        delete this.map[id];
    }
};

/**
 * Busca la vista asociada al elemento especificado o si se especifica un selector al primer elemento contenido que
 * coincida con el mismo.
 * @param {Element|string} el Elemento especificado o selector.
 * @param {string} [selector] Selector especificado.
 * @return {View} Vista obtenida o null si no se encuentra ninguna vista.
 */
View.find = function(el, selector) {
    if (typeof el === 'string') {
        el = document.querySelector(el);
    } else if (selector) {
        el = el.querySelector(selector);
    }
    return (el && el.dataset.viewId) ? View.cache.get(el.dataset.viewId) : null;
};



// ---------------------------------------------------------------------------------------------------------------------
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
 * Función de creación e inicialización de la vista.
 * @param {Object} [settings] Ajustes u opciones iniciales.
 * @constructs
 */
View.prototype.create = function(settings) {
    // NOTE: Implementar por objetos derivados...
};

/**
 * Incluye la vista en el elemento destino especificado.
 * @param {Element} target Elemento destino especificado.
 * @param {Object|function} [options] Opciones adicionales de inclusión de la vista o función de retorno.
 * @param {Object} [options.replace] Indica si reemplazar el elemento destino especificado en lugar de añadir la vista
 * al final del mismo
 * @param {Object} [options.hide] Indica si ocultar el elemento en la inclusión.
 * @param {function(err: ?Error=, view: View=)} [complete] Función de retorno.
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
    var attach = function(load) {
        if (options.replace) {
            target.parentNode.replaceChild(self.root, target);
        } else {
            target.appendChild(self.root);
        }
        // TODO: Habría que forzar aquí un REFLOW ???
        if (load) {
            self.ready(self.root, options);
            self.fire('vready');
        } else {
            self.restoreScroll();
        }
        if (complete) {
            complete(null, self);
        }
    };
    if (this.root) {
        attach();
    } else {
        this.load(options, function (err, data) {
            if (err) {
                return (complete && complete(err));
            }
            if (data) {
                options.data = data;
            }
            self.render(options, function (err, root) {
                if (err) {
                    return (complete && complete(err));
                }
                self.root = root;
                root.dataset.viewId = self.uid;
                if (options.hide) {
                    uix.addClass(root, 'ui-hide');
                }
                attach(true);
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
 * @param {?Object} [options] Opciones adicionales de inclusión de la vista.
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
 * @param {?Object} options Opciones adicionales de carga.
 * @param {function(err: ?Object, data: Object=)} complete Función de retorno.
 * @access protected
 */
View.prototype.load = function(options, complete) {
    // NOTE: Implementar por objetos derivados que requieran una implementación específica de la carga de datos adicionales.
    var dataURL = this.dataURL || options.dataURL;
    if (dataURL) {
        uix.load(dataURL, complete);
    } else {
        complete(null, null);
    }
};

/**
 * Recarga la vista cuando sea necesario según el criterio implementado en cada caso, o siempre que se fuerce por medio
 * del parámetro 'force'.
 * @param {?Object|function} [options] Opciones adicionales de recarga de la vista o función de retorno siguiente.
 * @param {function(err: ?Object =)} [complete] Función de retorno.
 * @access protected
 */
View.prototype.reload = function(options, complete) {
    // NOTE: Implementar por objetos derivados para una implementación específica de la recarga de la vista.
    // En la implementación por defecto se recarga y renderiza la vista al completo, reemplazando el elemento raíz si
    // está enganchado a un documento o bajo la estructura de otra vista.
    if (!this.root) {
        throw new Error('View not previously loaded.');
    }
    // Tratamiento de parámetros
    if (typeof(options) === 'function') {
        complete = options;
        options = {};
    }

    var self = this;
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
            var prevRoot = self.root;
            self.root = root;
            if (prevRoot.parentNode) {
                prevRoot.parentNode.replaceChild(root, prevRoot);
            }
            self.ready(root, options);
            self.fire('vready');
            if (complete) {
                complete();
            }
        });
    });
};

/**
 * A implementar por objetos derivados cuando sea necesario realizar algún tipo de inicialización específica, como
 * añadir el tratamiento de eventos, ajustes de dimensiones u otros; después de cargar los datos necesarios (load),
 * generar la representación gráfica (render) y añadir la vista al documento o elemento vinculado a un vista en
 * construcción.
 * @param {Element} root Elemento raíz de la vista, también accesible mediante <code>this.root</code>.
 * @param {Object} [options] Opciones adicionales especificadas en la inclusión o recarga de la vista.
 */
View.prototype.ready = function(root, options) {
    // NOTE: Implementar por objetos derivados cuando proceda.
};

/**
 * Se extrae la vista del documento.
 */
View.prototype.remove = function() {
    if (this.root && this.root.parentNode) {
        this.saveScroll();
        this.fire('vremove');
        uix.remove(this.root);
        // this.root = null; // NOTE: Si hacemos esto no podríamos recuperar la vista y volverla a añadir al documento
    }
    // NOTE: Para una implementación más específica por objetos derivados no olvidar llamar a la función heredada.
};

/**
 * Destruye la vista.
 */
View.prototype.destroy = function() {
    // NOTE: Implementar por objetos derivados para una implementación más específica de la destrucción de la vista.
    // No olvidar llamar a la función padre.

    // Si sigue añadido al documento o a un elemento de otra vista se elimina.
    this.remove();
    // Se pone a null el elemento raíz.
    this.root = null;
    // Se elimina la instancia de la cache
    View.cache.remove(this.uid);
};

/**
 * Visualiza u oculta la vista.
 * @see uix.toggle
 */
View.prototype.toggle = function(show, options) {
    // Tratamiento de parámetros
    if (typeof show === 'object' && show !== null && !Array.isArray(show)) {
        // ...(options)
        options = show;
        show = options.show;
    } else {
        // ...(show, options)
        if (options == null || typeof options !== 'object' || Array.isArray(options)) {
            options = {};
        } else if (show == null) {
            show = options.show;
        }
    }
    var self = this;
    uix.toggle(this.root, show, Object.extend({}, options, {
        done: function() {
            self.fire(show ? 'vshow' : 'vhide');
            if (options.done) {
                options.done(self);
            }
        }
    }));
};

/**
 * @return {boolean} Devuelve verdadero si la vista es visible o falso en caso contrario.
 */
View.prototype.isVisible = function(toggling) {
    return uix.isVisible(this.root, toggling);
};

/**
 * Guarda la posición de scroll de los elementos marcados con la clase 'save-scroll'.
 */
View.prototype.saveScroll = function() {
    var nodes = this.root.querySelectorAll('.save-scroll');
    for (var i = 0; i < nodes.length; i++) {
        nodes[i].dataset.scrollTop = nodes[i].scrollTop;
        nodes[i].dataset.scrollLeft = nodes[i].scrollLeft;
    }
};

/**
 * Recupera la posición de scroll de los elementos marcados con la clase 'save-scroll'.
 */
View.prototype.restoreScroll = function() {
    var nodes = this.root.querySelectorAll('.save-scroll');
    for (var i = 0; i < nodes.length; i++) {
        nodes[i].scrollTop = nodes[i].dataset.scrollTop;
        nodes[i].scrollLeft = nodes[i].dataset.scrollLeft;
    }
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
// Include Error
// ---------------------------------------------------------------------------------------------------------------------
/**
 * Error de inclusión de vistas.
 * @param {string} message Mensaje de error.
 * @param {Error|Error[]} [cause] Causa o causas del error.
 * @class
 */
function ViewError(message, cause) {
    this.name = 'ViewError';
    this.message = message;
    this.stack = (new Error()).stack;
    /**
     * Causa o causas del error.
     * @type {Error|Error[]}
     */
    this.cause = cause;
}
ViewError.prototype = Object.create(Error.prototype);
ViewError.prototype.constructor = ViewError;