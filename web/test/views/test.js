var test = {

    nextTest: 0,

    tests: [
        {
            desc: 'Open test view 1',
            handler: function(callback) {
                this.viewport.open('/test/views/v1');
            }
        },
        {
            desc: 'Open test view 2',
            handler: function(callback) {
                this.viewport.open('/test/views/v2');
            }
        },
        {
            desc: 'History back',
            handler: function(callback) {
                history.back();
            }
        },
        {
            desc: 'Open test view 3',
            handler: function(callback) {
                this.viewport.open('/test/views/v3');
            }
        },
        {
            desc: 'Re-Open test view 2',
            handler: function(callback) {
                this.viewport.open('/test/views/v2');
            }
        },
        {
            desc: 'Back to test view 1 with reload',
            handler: function(callback) {
                this.viewport.open('/test/views/v1', {
                    back: true,
                    reload: true
                });
            }
        }

    ],

    viewport: null,

    start: function() {
        console.log('Starting tests...');

        // Viewport
        this.viewport = new Viewport(document.getElementById('test-viewport'), {
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
            topLevel: true
        });

        var self = this;
        document.getElementById('restart-button').addEventListener('click', function(event) {
            window.location = '/test/views/index.html';
        });
        document.getElementById('next-button').addEventListener('click', function(event) {
            self.next();
        });
    },

    next: function() {
        if (this.nextTest < this.tests.length) {
            var test = this.tests[this.nextTest++];
            console.log("Test " + this.nextTest + ": " + test.desc);
            test.handler.call(this, function(err) {
                console.log("OK!");
            });
        }
    }
};