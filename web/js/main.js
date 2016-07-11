/*
 * UIX Web App.
 * @author angel.teran
 */

var app = {

    ready: function() {
        View.create('home', {}).include(document.getElementById('page-contents'), {}, function(err) {
            alert('Home Ok!');
        });
    }

};

uix.ready(function() {
    app.ready();
})