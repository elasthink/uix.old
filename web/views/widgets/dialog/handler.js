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
                title: 'DEMO DIALOG 1'
            });
        });
        root.querySelector('.demo2').addEventListener('tap', function() {
            uix.openDialog('widgets/dialog/demo2', {
                title: 'DEMO DIALOG 2',
                message: 'This is a demo dialog with header and close button.'
            });
        });
    }

});