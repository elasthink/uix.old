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
        root.querySelector('.uix-button.open').addEventListener('tap', function() {
            uix.openDialog('widgets/dialog/demo', {
                title: 'DEMO DIALOG'
            });
            setTimeout(function() {
                uix.openDialog('widgets/dialog/demo', {
                    title: 'DEMO DIALOG 1'
                });
            }, 100);
            setTimeout(function() {
                uix.openDialog('widgets/dialog/demo', {
                    title: 'DEMO DIALOG 2'
                });
            }, 200);
            setTimeout(function() {
                uix.openDialog('widgets/dialog/demo', {
                    title: 'DEMO DIALOG 3'
                });
            }, 300);
            setTimeout(function() {
                uix.openDialog('widgets/dialog/demo', {
                    title: 'DEMO DIALOG 4'
                });
            }, 400);
            setTimeout(function() {
                uix.openDialog('widgets/dialog/demo', {
                    title: 'DEMO DIALOG 5'
                });
            }, 500);
        });
    }

});