/**
 * Cabecera.
 * @alias HeaderView
 */
View.define('header', {

    /**
     * @see View.prototype.ready
     */
    ready: function(root) {

        root.addEventListener('tap', function() {
            console.log('.header(tap)');
        });
        root.addEventListener('mousedown', function() {
            console.log('.header(mousedown)');
        });

        root.querySelector('.header-menu').addEventListener('tap', function() {
            console.log('.header-menu(tap)');
            app.toggleMenu();
        });
    }

});