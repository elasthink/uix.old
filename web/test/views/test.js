/***
 * ...
 * @type {{tests: Array, next: number, viewport: null, start: testSuite.start, next: number}}
 */
var testSuite = {

    /**
     * Definición de rutas.
     * @type {*[]}
     * @const
     */
    routes: [
        {
            path: '/test/views/v1/:color',
            view: 'test/views/v1'
        },
        {
            path: '/test/views/v2/:color',
            view: 'test/views/v2'
        },
        {
            path: '/test/views/v3/:color',
            view: 'test/views/v3'
        }
    ],

    /**
     * ...
     */
    tests: [],

    /**
     * ...
     */
    nextIndex: 0,

    /**
     * Marco de primer nivel de las pruebas.
     * @type {Viewport}
     */
    viewport: null,

    /**
     * ...
     */
    state: {},

    /**
     * ...
     */
    start: function() {
        console.log('Starting tests...');

        // Viewport
        this.viewport = new Viewport(document.querySelector('#test-viewport'), {
            routes: this.routes,
            topLevel: true
        });

        var testPanel = document.getElementById('test-panel');
        this.testList = View.create('test/views/test-list').include(testPanel.querySelector('.test-list'), {
            replace: true,
            tests: this.tests
        });


        var self = this;
        testPanel.querySelector('.btn-restart').addEventListener('click', function(event) {
            window.location = '/test/views/';
        });
        testPanel.querySelector('.btn-next').addEventListener('click', function(event) {
            self.next();
        });

        var path = location.pathname;
        if (path !== '/test/views/') {
            this.viewport.open(path, {
                history: View.History.NONE
            });
        }
    },

    /**
     * ...
     */
    next: function() {
        var self = this;
        if (this.nextIndex < this.tests.length) {
            var test = this.tests[this.nextIndex++],
                node = this.testList.root.querySelector('.test:nth-child(' + this.nextIndex + ')');
            console.log("Test " + this.nextIndex + ": " + test.title);
            uix.addClass(node, 'running');
            test.handler.call(this, function(err) {
                uix.removeClass(node, 'running');
                uix.addClass(node, (err) ? 'failed' : 'passed');
                self.next();
            });
        }
    },

    /**
     * ...
     */
    pushTest: function(test) {
        this.tests.push(test);
    }
};

// ---------------------------------------------------------------------------------------------------------------------

// Test 1
testSuite.pushTest({
    title: 'Abrir una primera vista',
    handler: function(callback) {
        var self = this;
        this.viewport.open('/test/views/v1/f44', {
            transition: 'fade'
        }, function(err, view) {
            if (err) {
                callback(err);
                return;
            }
            if (!view) {
                callback(new Error('View not loaded'));
                return;
            }
            // Se comprueba que dentro del viewport se encuentre la vista
            var vp = self.viewport.container;
            if (vp.childElementCount !== 1 ||
                !uix.matches(vp.firstElementChild, '.test-view1')) {
                return callback(new Error('The DOM is wrong'));
            }
            // Se comprueba la pila
            if (self.viewport.views.length !== 1 ||
                !(self.viewport.views[0].view instanceof View.handlers['test/views/v1'])) {
                return callback(new Error('The view stack is wrong'));
            }
            callback();
        });
    }
});

// Test 2
testSuite.pushTest({
    title: 'Abrir una segunda vista',
    handler: function(callback) {
        var self = this;
        this.viewport.open('/test/views/v2/4f6', {
            transition: 'fade'
        }, function(err, view) {
            if (err) {
                return callback(err);
            }
            if (!view) {
                callback(new Error('View not loaded'));
                return;
            }
            // Esperemos a que acabe la transición
            setTimeout(function() {
                // Se comprueba que dentro del viewport se encuentre la vista y solo la vista
                var vp = self.viewport.container;
                if (vp.childElementCount !== 1 ||
                    !uix.matches(vp.firstElementChild, '.test-view2')) {
                    return callback(new Error('The DOM is wrong'));
                }
                // Se comprueba la pila
                if (self.viewport.views.length !== 2 ||
                    !(self.viewport.views[1].view instanceof View.handlers['test/views/v2'])) {
                    return callback(new Error('The view stack is wrong'));
                }
                callback();
            }, 500);
        });
    }
});

// Test 3
testSuite.pushTest({
    title: 'Volver a la vista anterior',
    handler: function(callback) {
        var self = this;
        this.viewport.back({
            transition: 'fade'
        }, function(err) {
            if (err) {
                return callback(err);
            }
            // Esperemos a que acabe la transición
            setTimeout(function() {
                // Se comprueba que dentro del viewport se encuentre la vista y solo la vista
                var vp = self.viewport.container;
                if (vp.childElementCount !== 1 || !uix.matches(vp.firstElementChild, '.test-view1')) {
                    return callback(new Error('The DOM is wrong'));
                }
                // Se comprueba la pila
                if (self.viewport.views.length !== 1 || !(self.viewport.views[0].view instanceof View.handlers['test/views/v1'])) {
                    return callback(new Error('The view stack is wrong'));
                }
                callback();
            }, 500);
        });
    }
});

// Test 4
testSuite.pushTest({
    title: 'Comprobar que solo queda una instancia de una vista de tipo \'single\' en memoria',
    handler: function(callback) {
        var self = this;
        this.viewport.open('/test/views/v1/fa4', {
            transition: 'fade'
        }, function(err) {
            if (err) {
                return callback(err);
            }
            // Esperemos a que acabe la transición
            setTimeout(function() {
                // Se comprueba que dentro del viewport solo quede una vista
                var vp = self.viewport.container;
                if (vp.childElementCount !== 1 || !uix.matches(vp.firstElementChild, '.test-view1')) {
                    return callback(new Error('The DOM is wrong'));
                }
                // Se comprueba la pila
                if (self.viewport.views.length !== 1 || !(self.viewport.views[0].view instanceof View.handlers['test/views/v1']) ||
                    self.viewport.views[0].path !== '/test/views/v1/fa4') {
                    return callback(new Error('The view stack is wrong'));
                }
                callback();
            }, 500);
        });
    }
});

// Test 5
testSuite.pushTest({
    title: 'Comprobar que no se excede el número de instancias máximo establecido para un tipo de vista',
    handler: function(callback) {
        var self = this;
        this.viewport.open('/test/views/v2/333', {
            transition: 'fade'
        }, function(err) {
            if (err) {
                return callback(err);
            }
            self.viewport.open('/test/views/v2/666', {
                transition: 'fade'
            }, function(err) {
                if (err) {
                    return callback(err);
                }
                self.viewport.open('/test/views/v2/999', {
                    transition: 'fade'
                }, function(err) {
                    if (err) {
                        return callback(err);
                    }
                    // Esperemos a que acabe la transición
                    setTimeout(function() {
                        // Se comprueba la pila
                        var views = self.viewport.views;
                        if (views[2].path !== '/test/views/v2/999' ||
                            views[1].path !== '/test/views/v2/666') {
                            return callback(new Error('The view stack is wrong'));
                        }
                        callback();
                    }, 500);
                });
            });
        });
    }
});

// Test 6
testSuite.pushTest({
    title: 'Comprobar que no se conserva ninguna instancia de una vista de tipo \'none\'',
    handler: function(callback) {
        var self = this;
        this.viewport.open('/test/views/v3/48c', {
            transition: 'fade'
        }, function(err) {
            if (err) {
                return callback(err);
            }
            self.viewport.open('/test/views/v2/888', {
                transition: 'fade'
            }, function(err) {
                if (err) {
                    return callback(err);
                }
                // Esperemos a que acabe la transición
                setTimeout(function() {
                    // Se comprueba la pila
                    var views = self.viewport.views;
                    for (var i = 0; i < views.length; i++) {
                        if (views[i].view instanceof View.handlers['test/views/v3']) {
                            return callback(new Error('The view stack is wrong'));
                        }
                    }
                    callback();
                }, 500);
            });
        });
    }
});

// Test 7
testSuite.pushTest({
    title: 'Comprobar que al abrir una ruta con vista ya cargada no sea crea una instancia nueva',
    handler: function(callback) {
        var self = this;
        var views = self.viewport.views;
        if (views[1].path !== '/test/views/v2/999') {
            return callback(new Error('The view stack is wrong'));
        }
        var prev = views[1];

        this.viewport.open('/test/views/v2/999', {
            transition: 'fade'
        }, function(err) {
            if (err) {
                return callback(err);
            }
            // Esperemos a que acabe la transición
            setTimeout(function() {
                // Se comprueba la pila
                if (views[2].path !== prev.path || views[2].view !== prev.view) {
                    return callback(new Error('The view stack is wrong'));
                }
                callback();
            }, 500);
        });
    }
});

// Test 8
testSuite.pushTest({
    title: 'Comprobar que al abrir una ruta con vista ya cargada se recargue correctamente al solicitar la recarga',
    handler: function(callback) {
        var self = this;
        var views = self.viewport.views;
        if (views[1].path !== '/test/views/v2/888') {
            return callback(new Error('The view stack is wrong'));
        }
        var prev = views[1];

        this.viewport.open('/test/views/v2/888', {
            reload: true,
            transition: 'fade'
        }, function(err) {
            if (err) {
                return callback(err);
            }
            // Esperemos a que acabe la transición
            setTimeout(function() {
                // Se comprueba la pila
                var v = views[2];
                if (v.path !== prev.path || v.view !== prev.view || v.view.loadTimes !== 2) {
                    return callback(new Error('The view stack is wrong'));
                }
                callback();
            }, 500);
        });
    }
});

// Test 9
testSuite.pushTest({
    title: 'Comprobar que al volver a una ruta no inmediatamente anterior, y con la opción de recarga, la vista asociada se recarga correctamente',
    handler: function(callback) {
        var self = this;
        var views = self.viewport.views;
        if (views[0].path !== '/test/views/v1/fa4') {
            return callback(new Error('The view stack is wrong'));
        }
        var prev = views[0];

        this.viewport.back('/test/views/v1/fa4', {
            reload: true,
            transition: 'fade'
        }, function(err) {
            if (err) {
                return callback(err);
            }
            // Esperemos a que acabe la transición
            setTimeout(function() {
                // Se comprueba la pila
                if (views.length !== 1) {
                    return callback(new Error('The view stack is wrong'));
                }
                var v = views[0];
                if (v.path !== prev.path || v.view !== prev.view || v.view.loadTimes !== 2) {
                    return callback(new Error('The view stack is wrong'));
                }
                callback();
            }, 500);
        });
    }
});