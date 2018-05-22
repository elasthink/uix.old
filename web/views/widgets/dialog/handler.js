/**
 * Página de referencia del componente "uix-dialog".
 * @class DialogWidgetView
 * @extends View
 */
View.define('widgets/dialog', {

    /**
     * @see View.prototype.ready
     */
    ready: function(root) {
        root.querySelector('.demo1').addEventListener('tap', function() {
            uix.openDialog('widgets/dialog/demo1', {
                fragment: 'demo1'
            });
        });
    }

});