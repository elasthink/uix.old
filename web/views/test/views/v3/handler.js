View.define('test/views/v3', {

    keepInstances: View.KEEP_NONE,

    // transition: 'fade',

    loadTimes: 0,

    ready: function(root) {
        root.querySelector('.btn-back').addEventListener('click', function() {
            testSuite.viewport.back();
        });
        root.querySelector('.btn-next').addEventListener('click', function() {
            testSuite.viewport.back('/test/views/v1/fa4');
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