/*
 * index.js
 */

var http            = require('http');
var express         = require('express');
var path            = require('path');
//var favicon         = require('serve-favicon');
var logger          = require('morgan');
//var methodOverride  = require('method-override');
//var cookieParser    = require('cookie-parser');
//var bodyParser      = require('body-parser');
//var multer          = require('multer');
//var errorHandler    = require('errorhandler');

// ---------------------------------------------------------------------------------------------------------------------
// Inicialización de la aplicación
var app = express();
app.set('port', 3300);

var staticPath = path.join(__dirname, 'build/web');

// Middlewares
//app.use(favicon(__dirname + '/static/favicon.ico'));
app.use(logger('dev')); // TODO: Condicional al entorno de desarrollo ???
//app.use(methodOverride());
//app.use(cookieParser());
//app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({ extended: true }));
//app.use(multer());

app.use(express.static(staticPath));

app.use('/test/views/*', function(req, res, next) {
    res.sendFile(path.join(staticPath, 'test/views/index.html'));
});

app.use('/*', function(req, res, next) {
    res.sendFile(path.join(staticPath, 'index.html'));
});

var server = http.createServer(app);
server.listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
});
