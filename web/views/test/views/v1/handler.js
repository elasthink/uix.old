View.define('test/views/v1', {

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