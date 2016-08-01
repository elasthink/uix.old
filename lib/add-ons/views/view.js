/**
 * Objeto base para manejadores de vistas.
 * @param {Object} [settings] Ajustes iniciales de creación de la vista.
 * @author terangel
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
    var B = (base) ? View.handlers[base] : View;
    var T = function(settings) {
        B.call(this, settings);
    };
    T.prototype = Object.extend(Object.create(B.prototype), proto);
    T.prototype.constructor = T;
    T.prototype.__view_name = name;
    return View.handlers[name] = T;
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
 * @param {boolean} [options.hide] Indica si ocultar la vista, añadiendo la clase 'hide' al elemento raíz antes de
 * añadirlo al contenedor.
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
    var attach = function(load) {
        if (options.replace) {
            target.parentNode.replaceChild(self.root, target);
        } else {
            target.appendChild(self.root);
        }
        if (load) {
            self.ready(self.root);
            self.fire('vready');
        }
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
                if (options.hide) {
                    uix.addClass(root, '--hide');
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
                self.ready(root);
                self.fire('vready');
            }
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
 * @protected
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
    // NOTE: Implementar por objetos derivados para una implementación más específica de la destrucción de la vista.
    // No olvidar llamar a la función padre.
    this.remove();
};

/**
 * Visualiza u oculta la vista.
 * @param {boolean} show Indica si visualizar u ocultar la vista.
 * @param {function(view: View)} [complete] Función de retorno.
 */
View.prototype.toggle = function(show, complete) {
    var self = this;
    uix.toggle(this.root, show, function() {
        self.fire(show ? 'vshow' : 'vhide');
        if (complete) {
            complete(self);
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
