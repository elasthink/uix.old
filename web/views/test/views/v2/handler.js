View.define('test/views/v2', {

    keepInstances: 2,

    // transition: 'slide:right',

    loadTimes: 0,

    ready: function(root) {
        root.querySelector('.btn-back').addEventListener('click', function() {
            testSuite.viewport.back();
        });
        root.querySelector('.btn-next').addEventListener('click', function() {
            testSuite.viewport.open('/test/views/v3/48c', {
                // transition: 'slide:up'
            });
        });
    },

    load: function(options, complete) {
        var self = this;
        View.prototype.load.call(this, options, function(err, data) {
            self.loadTimes++;
            if (complete) {
                complete(err, data);
            }
        });
    }

});