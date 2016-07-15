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

        this.viewport.open('/');
    }

};
