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
            uix.showToast('No por mucho madrugar amanece más temprano');
        });
        root.querySelector('.toast2').addEventListener('tap', function() {
            // Usando un fragmento y añadiendo los nodos directamente:
            /*
            var frag = document.createDocumentFragment(), a;
            frag.appendChild(document.createTextNode('We\'re sorry, an error occurred. '));
            frag.appendChild(a = document.createElement('a'));
            a.appendChild(document.createTextNode('TRY AGAIN'));
            a.addEventListener('tap', function() {
                alert('Trying again...');
            });
            frag.appendChild(document.createTextNode('.'));
            uix.showToast(frag);
            */

            // Usando nuestra función uix.create():
            uix.showToast([
                'Something went wrong. ',
                uix.create('a', {}, 'Try Again', {
                    'tap': function() {
                        alert('Trying again...');
                    }
                }), '.'
            ]);
        });
        root.querySelector('.toast3').addEventListener('tap', function() {
            uix.showToast('<b>No internet connection</b><br/>Please check your connection and try again.', {
                close: false
            });
        });
        root.querySelector('.toast4').addEventListener('tap', function() {
            uix.showToast('<b>Something went wrong</b><br/>Please try again later.');
        });
    }

});