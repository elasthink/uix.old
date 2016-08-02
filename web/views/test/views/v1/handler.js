View.define('test/views/v1', {

    loadTimes: 0,

    // transition: 'slide:down',

    ready: function(root) {
        root.querySelector('.btn-next').addEventListener('click', function() {
            testSuite.viewport.open('/test/views/v2/4f6', {
                // transition: 'fade'
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