/*
 * Tareas de construcción y distribución de la librería UIX.
 *
 * @author angel.teran
 * @type {Gulp}
 */

var gulp            = require('gulp'),
    uglify          = require('gulp-uglify'),
    less            = require('gulp-less'),
	ejs             = require('gulp-ejs'),
    ejsCompiler     = require('gulp-ejs-compiler'),
	autoprefixer    = require('gulp-autoprefixer'),
    // cleanCss       = require('gulp-clean-css'),
	iconfont        = require('gulp-iconfont'),
    changed      	= require('gulp-changed'),
    concat      	= require('gulp-concat'),
	rename          = require('gulp-rename'),
    debug         	= require('gulp-debug'),
    zip             = require('gulp-zip'),
    mocha         	= require('gulp-mocha'),
    plumber         = require('gulp-plumber'),
    del         	= require('del'),
    exec            = require('child_process').exec,
    package         = require('./package.json');



// =====================================================================================================================
// Library
// =====================================================================================================================
/**
 * Genera el script completo de la librería, incluyendo los scritps de los add-ons.
 */
gulp.task('lib:build', function () {
    var name = 'uix'; // 'uix-' + package.version;
    return gulp.src([
            'lib/uix-core.js',
            'lib/util/**/*.js',
            'lib/polyfills/**/*.js',
            'lib/add-ons/**/*.js'
        ])
        .pipe(plumber())
        .pipe(concat(name + '.js'))
        .pipe(gulp.dest('lib/'))
        .pipe(rename(name + '.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('lib/'));
});

/**
 * Empaqueta la librería para su distribución.
 */
gulp.task('lib:dist', gulp.series('lib:build', function _pack() {
	return gulp.src('lib/**')
		.pipe(zip('uix-' + package.version + '.zip'))
		.pipe(gulp.dest('dist/lib'));
}));

/**
 * Detección de cambios en la librería.
 */
gulp.task('lib:watch', function () {
	// Cambios en scripts
	gulp.watch([
        'lib/uix-core.js',
        'lib/util/**/*.js',
        'lib/polyfills/**/*.js',
        'lib/add-ons/**/*.js'
    ], gulp.series('lib:build'));
});

/**
 * Ejecuta las pruebas de la librería.
 */
gulp.task('lib:test', function () {
    return gulp.src('lib/test/index.js')
        .pipe(mocha());
});



// =====================================================================================================================
// Web Application
// =====================================================================================================================
/**
 * Actualiza todos los ficheros de la librería en la aplicación web.
 */
gulp.task('web:update-lib', function() {
    var dest = 'web/lib/uix';
    return gulp.src([
        'lib/**'
    ])
    .pipe(plumber())
    .pipe(changed(dest))
    .pipe(gulp.dest(dest));
});

/**
 * Compone la página de inicio.
 */
gulp.task('web:build-index', gulp.series(
    gulp.parallel(
        function _js() {
            return gulp.src('web/index.js')
                .pipe(gulp.dest('build/web'));
        },
        function _css() {
            return gulp.src('web/index.less')
                .pipe(less())
                .pipe(autoprefixer({
                    browsers: ['last 2 versions']
                }))
                .pipe(gulp.dest('build/web'));
        }
    ),
    function _ejs() {
        return gulp.src('web/index.ejs')
            .pipe(gulp.dest('build/web'))
            .pipe(ejs({}, {
                ext: '.html'
            }))
            .pipe(gulp.dest('build/web'));
    },
    function _clean() {
        return del(['build/web/*.*', '!**/index.html']);
    }
));

/**
 * Genera la fuente de iconos, en diferentes formatos (eot, svg, ttf, woff), y el css con la definición de los mismos.
 */
gulp.task('web:build-glyphs', function() {
    var time = Math.round(Date.now() / 1000);
    return gulp.src(['web/lib/uix/glyphs/*.svg'])
        .pipe(iconfont({
            fontName: 'glyphs',
            fontHeight: 1000,
            prependUnicode: false,
            formats: ['ttf', 'eot', 'woff', 'svg'], // woff?
            normalize: true,
            timestamp: time
        }))
        .on('glyphs', function(glyphs) {
            gulp.src('web/lib/uix/css/glyphs.less.ejs')
                .pipe(ejs({
                    glyphs: glyphs,
                    timestamp: '' // time
                }, {
                    ext: ''
                }))
                .pipe(gulp.dest('web/css'));
        })
        .pipe(gulp.dest('build/web/fonts/glyphs'));
});

/**
 * Compila la hoja de estilos de la aplicación web con Less.
 */
gulp.task('web:build-css', function() {
    return gulp.src([
            'web/css/*.less',
            'web/views/**/*.less'
        ])
        .pipe(less())
        .pipe(autoprefixer({
            browsers: ['last 2 versions']
        }))
        .pipe(concat('app.css'))
        .pipe(gulp.dest('build/web/css'));
});

/**
 * Compila la hoja de estilos de la librería con Less.
 */
gulp.task('web:build-uix-css', function() {
    return gulp.src([
        'web/lib/uix/css/uix.less'
    ])
    .pipe(less())
    .pipe(autoprefixer({
        browsers: ['last 2 versions']
    }))
    .pipe(concat('uix.css'))
    .pipe(gulp.dest('build/web/css'));
});

/**
 * Precompilación de plantillas EJS.
 */
gulp.task('web:build-ejs', function () {
    var settings = {
            namespace: function(templateName, codeString) {
                return 'View.putTemplate(\'' + templateName + '\', ' + codeString + ');';
            }
        },
        escape = function(markup) {
            return View.escape(markup);
        };
    return gulp.src([
            'web/views/**/*.ejs'
        ])
        .pipe(plumber())
        //.pipe(debug({title: 'EJS:'}))
        .pipe(ejsCompiler({
            compileDebug: false,
            debug: false,
            _with: false,
            localsName: 'options',
            escape: escape,
            client: true
        }, settings))
        //.on('error', gutil.log)
        .pipe(concat('templates.js'))
        .pipe(gulp.dest('web/views'));
});

/**
 * Copia, transformación y concatenación de scripts de la aplicación.
 */
gulp.task('web:build-js', function () {
    return gulp.src([
            'web/js/main.js',
            'web/views/**/handler.js',
            'web/views/templates.js'
        ])
        .pipe(concat('app.js'))
        .pipe(gulp.dest('build/web/js'));
});

/**
 * Copia, transformación y concatenación de librerías Javascript.
 */
gulp.task('web:build-lib', function () {
    return gulp.src([
        'web/lib/uix/uix.js'
    ])
    .pipe(concat('lib.js'))
    .pipe(gulp.dest('build/web/js'));
});

/**
 * Copia del resto de ficheros que no requieren ninguna transformación.
 */
gulp.task('web:build-etc', function () {
    return gulp.src([
        'web/img/**',
        'web/test/**'
    ], {
        base: 'web/'
    })
    .pipe(gulp.dest('build/web/'));
});

/**
 * Construye la aplicación web.
 */
gulp.task('web:build', gulp.series('lib:build', 'web:build-index', 'web:update-lib', 'web:build-glyphs', 'web:build-css', 'web:build-uix-css', 'web:build-ejs', 'web:build-js', 'web:build-lib', 'web:build-etc'));

/**
 * Tarea para arrancar el servidor y ejecutar la aplicación web.
 */
gulp.task('web:run', function(done) {
    var p = exec('nodemon index.js 3300', function callback(err) { // stdout, stderr
                       // --debug
        if (err !== null) {
            console.error(err.toString());
        }
        done(err);
    });
    p.stdout.on('data', function(data) {
        process.stdout.write(data);
    });
    p.stderr.on('data', function(data) {
        process.stderr.write(data);
    });
});

/**
 * Tarea para limpiar el directorio temporal de construcción de la aplicación web.
 */
gulp.task('web:clean', function () {
    return del('build/web/');
});

/**
 * Detección de cambios de la aplicación web.
 */
gulp.task('web:watch', /*gulp.parallel('lib:watch', */function() {
    // Cambios en los ficheros de la librería
    gulp.watch([
        'lib/**'
    ], gulp.series('web:update-lib'));

    // Cambios en la hoja de estilos de la librería
    gulp.watch([
        'web/index.*'
    ], gulp.series('web:build-index'));

    // Cambios en los iconos o en la plantilla de generación de la definición de estilos
    gulp.watch([
        'web/lib/uix/glyphs/*.svg',
        'web/lib/uix/css/glyphs.less.ejs'
    ], gulp.series('web:build-glyphs'));

    // Cambios en la hoja de estilos de la librería
    gulp.watch([
        'web/lib/uix/css/*.less'
    ], gulp.series('web:build-uix-css'));

    // Cambios en las hojas de estilos de la aplicación
    gulp.watch([
        'web/css/*.less',
        'web/views/**/*.less',
        'web/lib/uix/css/uix-theme.less'
    ], gulp.series('web:build-css'));

    // Cambios en las plantillas EJS
    gulp.watch([
        'web/views/**/*.ejs'
    ], gulp.series('web:build-ejs'));

    // Cambios en los scripts de la aplicación
    gulp.watch([
        'web/js/main.js',
        'web/views/**/handler.js',
        'web/views/templates.js'
    ], gulp.series('web:build-js'));

    // Cambios en librerías
    gulp.watch([
        'web/lib/uix/uix.js'
    ], gulp.series('web:build-lib'));

    // Cambios en otros ficheros
    gulp.watch([
        'web/img/**',
        'web/test/**'
    ], gulp.series('web:build-etc'));
}/*)*/);