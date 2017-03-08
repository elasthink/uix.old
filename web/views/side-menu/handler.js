/**
 * Menú lateral.
 * @alias SideMenu
 */
View.define('side-menu', {

    /**
     * @see View.prototype.ready
     */
    ready: function() {
        this.root.addEventListener('click', function (event) {
            if (event.target.matches('a')) {
                if (event.ctrlKey || event.shiftKey || event.metaKey) {
                    return;
                }
                app.toggleMenu(false);
                app.open(event.target.getAttribute('href'));
                event.preventDefault();
            }
        });
    }

});