/**
 * Menú de navegación principal.
 * @alias NavigationMenu
 */
View.define('nav-menu', {

    /**
     * @see View.prototype.ready
     */
    ready: function() {
        this.root.addEventListener('click', function (event) {
            if (event.target.matches('a.nav-item')) {
                if (event.ctrlKey || event.shiftKey || event.metaKey) {
                    return;
                }
                app.open(event.target.getAttribute('href'));
                event.preventDefault();
            }
        });
    }

});