/**
 * Cabecera.
 * @alias HeaderView
 */
View.define('header', {

    /**
     * @see View.prototype.ready
     */
    ready: function(root) {
        root.querySelector('.header-menu').addEventListener('tap', function() {
            console.log('.header-menu(tap)');
            app.toggleMenu();
        });
    }

});