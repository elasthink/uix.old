/**
 * Página de referencia del componente "uix-dialog".
 * @class DialogWidgetView
 * @extends View
 */
View.define('widgets/dialog/demo', {

    /**
     * @see View.prototype.ready
     */
    ready: function(root) {
        var self = this;
        root.querySelector('.uix-button.close').addEventListener('tap', function() {
            uix.closeDialog(self);
        });
    }

});