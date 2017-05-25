/**
 * Página de referencia del componente "uix-toast".
 * @alias ToastWidgetView
 * @class
 * @extends View
 */
View.define('widgets/toast', {

    /**
     * @see View.prototype.ready
     */
    ready: function(root) {
        root.querySelector('.toast1').addEventListener('tap', function() {
            uix.toast('No por mucho madrugar amanece más temprano');
        });
    }

});