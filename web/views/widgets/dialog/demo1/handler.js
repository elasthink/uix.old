/**
 * Diálogo de demostración 1.
 * @class DemoDialog1
 * @extends View
 */
View.define('widgets/dialog/demo1', {

    /**
     * @see View.prototype.ready
     */
    ready: function(root) {
        var self = this;
        root.querySelector('.uix-button.not-now').addEventListener('tap', function() {
            uix.closeDialog(self);
        });
        root.querySelector('.uix-button.accept').addEventListener('tap', function() {
            uix.closeDialog(self);
        });
    }

});