View.define('test/views/v3', {

    keepInstances: View.KEEP_NONE,

    loadTimes: 0,

    ready: function() {
        // ...
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