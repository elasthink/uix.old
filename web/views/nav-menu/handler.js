/**
 * Menú de navegación principal.
 * @alias NavigationMenu
 */
View.define('nav-menu', {

    /**
     * @see View.prototype.ready
     */
    ready: function() {
        this.root.querySelector('.nav-button').addEventListener('click', function (event) {
            app.open(event.target.getAttribute('href'));
            event.preventDefault();
        });
    }

});