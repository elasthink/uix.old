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
     * Rutas de la aplicación.
     * @type {{path: string, view: string, handler: function}[]}
     */
    routes: [
        {
            path: '/',
            view: 'home'
        },
        {
            path: '/widgets',
            routes: [
                {
                    path: '/button',
                    view: 'widgets/button'
                },
                {
                    path: '/select',
                    view: 'widgets/select'
                },
                {
                    path: '/text',
                    view: 'widgets/text'
                }
            ]
        },
        {
            path: '/views',
            view: 'views/overview'
        }
    ],

    /**
     * Menú de navegación principal.
     * @type {NavigationMenu}
     */
    navMenu: null,

    /**
     * Marco de visualización de vistas y control de navegación.
     * @type {Viewport}
     */
    viewport: null,

    /**
     * Función de inicio.
     */
    start: function() {
        this.navMenu = View.create('nav-menu').include(document.getElementById('page'), function(err) {
            //alert('Home Ok!');
        });

        // Viewport
        this.viewport = new Viewport(document.getElementById('page-contents'), {
            routes: this.routes,
            topLevel: true
        });

        this.open('/');
    },

    /**
     * Abre la ruta especificada.
     * @param {string} path Ruta especificada.
     */
    open: function(path) {
        this.viewport.open(path);
    }

};
