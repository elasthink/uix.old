/**
 * Objeto de control de inicialización de la aplicación.
 * @type {object}
 */
function launch() {

    /**
     * Carga de ficheros requeridos: scripts, hojas de estilo y demás.
     */
    var importFiles = function(files, callback) {
        var head = document.getElementsByTagName('head')[0],
            count = files.length,
            check = function() {
                count--;
                if (count === 0) {
                    callback();
                }
            };
        for (var i = 0, e; i < files.length; i++) {
            if (files[i].type === 'javascript') {
                e = document.createElement('script');
                e.type = 'text/javascript';
                e.src = files[i].href;
                // e.async = true; ???
            } else { // stylesheet
                e = document.createElement('link');
                e.type = 'text/css';
                e.rel = 'stylesheet';
                e.href = files[i].href;
            }
            e.onload = check;
            head.appendChild(e);
        }
    };

    importFiles([
        { type: 'stylesheet', href: 'css/uix.css' },
        { type: 'stylesheet', href: 'css/app.css' },
        { type: 'javascript', href: 'js/lib.js' }
    ], function() {
        importFiles([
            { type: 'javascript', href: 'js/app.js' }
        ], function() {
            app.start();
        });
    });
};