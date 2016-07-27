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
     * ...
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
                history: false
            });
        }
    },

    /**
     * ...
     */
    next: function() {
        if (this.nextIndex < this.tests.length) {
            var test = this.tests[this.nextIndex++],
                node = this.testList.root.querySelector('.test:nth-child(' + this.nextIndex + ')');
            console.log("Test " + this.nextIndex + ": " + test.title);
            uix.addClass(node, 'running');
            test.handler.call(this, function(err) {
                uix.removeClass(node, 'running');
                uix.addClass(node, (err) ? 'failed' : 'passed');
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
    title: 'Open test view 1',
    handler: function(callback) {
        var self = this;
        this.viewport.open('/test/views/v1/f44', function(err) {
            if (err) {
                callback(err);
            }
            // Se comprueba que dentro del viewport se encuentre la vista
            var vp = self.viewport.container;
            if (vp.childElementCount !== 1 ||
                    !uix.matches(vp.firstElementChild, '.test-view1')) {
                callback(new Error('The DOM is wrong'));
            }
            // Se comprueba la pila
            if (self.viewport.views.length !== 1 ||
                    self.viewport.views[0] instanceof View.handlers['test/views/v1']) {
                callback(new Error('The view stack is wrong'));
            }
            callback();
        });
    }
});

// Test 2
testSuite.pushTest({
    title: 'Open test view 2',
    handler: function(callback) {
        var self = this;
        this.viewport.open('/test/views/v2/4f6', function(err) {
            if (err) {
                callback(err);
            }
            // Le damos un tiempo para que se complete la transición...
            setTimeout(function() {
                // Se comprueba que dentro del viewport se encuentre la vista y solo la vista
                var vp = self.viewport.container;
                if (vp.childElementCount !== 1 ||
                    !uix.matches(vp.firstElementChild, '.test-view2')) {
                    callback(new Error('The DOM is wrong'));
                }
                // Se comprueba la pila
                if (self.viewport.views.length !== 2 ||
                    self.viewport.views[1] instanceof View.handlers['test/views/v2']) {
                    callback(new Error('The view stack is wrong'));
                }
                callback();

            }, 500);
        });
    }
});

// Test 3
testSuite.pushTest({
    title: 'Open test view 3',
    handler: function(callback) {
        this.viewport.open('/test/views/v3/2af');
        callback(new Error('...'));
    }
});

// Test 4
/*
testSuite.pushTest({
    title: 'Back to view 2 with reload',
    handler: function(callback) {
        this.viewport.back('/test/views/v2', {
            reload: true
        });
        callback();
    }
});
*/