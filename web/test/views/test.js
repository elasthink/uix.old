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
            path: '/test/views/v1',
            view: 'test/views/v1'
        },
        {
            path: '/test/views/v2',
            view: 'test/views/v2'
        },
        {
            path: '/test/views/v3',
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
            window.location = '/test/views/index.html';
        });
        testPanel.querySelector('.btn-next').addEventListener('click', function(event) {
            self.next();
        });
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
        this.viewport.open('/test/views/v1');
        callback();
    }
});

// Test 2
testSuite.pushTest({
    title: 'Open test view 2',
    handler: function(callback) {
        this.viewport.open('/test/views/v2');
        callback();
    }
});

// Test 3
testSuite.pushTest({
    title: 'Open test view 3',
    handler: function(callback) {
        this.viewport.open('/test/views/v3');
        callback(new Error('...'));
    }
});

// Test 4
testSuite.pushTest({
    title: 'Back to view 2 with reload',
    handler: function(callback) {
        this.viewport.back('/test/views/v2', {
            reload: true
        });
        callback();
    }
});