/*
 * UIX Web App.
 * @author angel.teran
 */

/**
 * Objeto principal de control de la aplicación.
 * @namespace
 */
var app = {

    /**
     * Menú lateral.
     * @type {SideMenu}
     */
    menu: null,

    /**
     * Marco de visualización de vistas y control de navegación.
     * @type {Viewport}
     */
    viewport: null,

    /**
     * Función de inicio.
     */
    start: function() {

        View.create('header').include(document.getElementById('header'), {
            replace: true
        });

        this.overlay = document.getElementById('overlay');
        this.overlay.addEventListener('tap', function() {
            app.toggleMenu(false);
        });

        this.menu = View.create('side-menu').include(document.getElementById('side-menu'), {
            replace: true
        });

        // Viewport
        this.viewport = new Viewport(document.getElementById('main-content'), {
            routes: this.routes,
            topLevel: true
        });

        this.open(location.pathname);
    },

    /**
     * Abre la ruta especificada.
     * @param {string} path Ruta especificada.
     */
    open: function(path) {
        this.viewport.open(path, function(err, view) {
            if (view) {
                var blocks = view.root.querySelectorAll('pre code');
                for (var i = 0; i < blocks.length; i++) {
                    hljs.highlightBlock(blocks[i]);
                }
            }
        });
    },

    /**
     * Muestra el menú lateral.
     * @param {boolean} [show] Indica si mostrar o no el menú lateral.
     */
    toggleMenu: function(show) {
        uix.toggle(this.overlay, show);
        this.menu.toggle(show);
    }

};
