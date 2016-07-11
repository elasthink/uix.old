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
    minifyCss       = require('gulp-minify-css'),
	iconfont        = require('gulp-iconfont'),
    concat      	= require('gulp-concat'),
	rename          = require('gulp-rename'),
    zip             = require('gulp-zip'),
    package         = require('./package.json');



// =====================================================================================================================
// Library
// =====================================================================================================================
/**
 * Genera la fuente de iconos, en diferentes formatos (eot, svg, ttf, woff), y el css con la definición de los mismos.
 */
gulp.task('lib:build-glyphs', function() {
	var time = Math.round(Date.now() / 1000);
	return gulp.src(['lib/glyphs/*.svg'])
		.pipe(iconfont({
			fontName: 'glyphs',
			fontHeight: 1000,
			prependUnicode: false,
			formats: ['ttf', 'eot', 'woff', 'svg'], // woff?
            normalize: true,
			timestamp: time
		}))
		.on('glyphs', function(glyphs) {
			gulp.src('lib/css/glyphs.ejs')
				.pipe(ejs({
                    glyphs: glyphs,
					timestamp: time
				}, {ext: '.css'}))
				.pipe(gulp.dest('lib/css'));
		})
		.pipe(gulp.dest('lib/fonts/glyphs'));
});

/**
 * Compila la hoja de estilos con Less.
 */
gulp.task('lib:build-css', gulp.series(
    function _css() {
        return gulp.src('lib/css/uix.less')
            .pipe(less({
				paths: [ 'lib/css' ]
			}))
            .pipe(autoprefixer({
                browsers: ['last 2 versions']
            }))
            .pipe(gulp.dest('lib/css'));
    },
    function _min() {
        return gulp.src('lib/css/uix.css')
            .pipe(rename('uix.min.css'))
            .pipe(minifyCss())
            .pipe(gulp.dest('lib/css'));
    }
));

/**
 * Genera el script completo de la librería, incluyendo los plugins.
 */
gulp.task('lib:build-js', function () {
    return gulp.src([
            'lib/js/uix.js',
            'lib/js/plugins/taps/*.js',
            'lib/js/plugins/views/*.js'
        ])
        .pipe(concat('uix_all.js'))
        .pipe(gulp.dest('lib/js'))
        .pipe(rename('uix_all.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('lib/js'));
});

/**
 * Construye la librería al completo.
 */
gulp.task('lib:build', gulp.parallel(gulp.series('lib:build-glyphs', 'lib:build-css'), 'lib:build-js'));

/**
 * Empaqueta la librería para su distribución.
 */
gulp.task('lib:dist', function () {
	return gulp.src('lib/**')
		.pipe(zip('uix-' + package.version + '.zip'))
		.pipe(gulp.dest('dist'));
});

/**
 * Detección de cambios en la librería.
 */
gulp.task('lib:watch', function () {
    // Cambios en los iconos o en la plantilla de generación de la hoja de estilos
	gulp.watch(['lib/glyphs/*.svg', 'lib/css/glyphs.ejs'], gulp.series('lib:build-glyphs'));

	// Cambios en ficheros Less y CSS
	gulp.watch(['lib/css/*.less', 'lib/css/glyphs.css'], gulp.series('lib:build-css'));
	// Cambios en scripts
	gulp.watch('lib/js/uix.js', gulp.series('lib:build-js'));

});



// =====================================================================================================================
// Web Application
// =====================================================================================================================
/**
 * Compila la hoja de estilos de la aplicación web con Less.
 */
gulp.task('web:build-css', function() {
    return gulp.src([
            'web/css/main.less',
            'web/views/**/*.less'
        ])

        .pipe(less({
            paths: ['web/css']
        }))
        .pipe(autoprefixer({
            browsers: ['last 2 versions']
        }))
        .pipe(concat('app.css'))
        .pipe(gulp.dest('web/css'));
});

/**
 * Precompilación de plantillas EJS.
 */
gulp.task('web:build-ejs', function () {
    var suffix = '/layout',
        settings = {
            namespace: function(templateName, codeString) {
                var i = templateName.length - suffix.length;
                if (templateName.indexOf(suffix, i) !== -1) {
                    templateName = templateName.substr(0, i);
                }
                return 'View.templates[\'' + templateName + '\'] = ' + codeString + ';';
            }
        };
    return gulp.src([
            'web/views/**/*.ejs'
        ])
        //.pipe(debug({title: 'EJS:'}))
        .pipe(ejsCompiler({
            compileDebug: false,
            debug: false,
            _with: false,
            localsName: 'options',
            // escape: ...
            client: true
        }, settings))
        //.on('error', gutil.log)
        .pipe(concat('templates.js'))
        .pipe(gulp.dest('web/views'));
});

/**
 * Copia, transformación y concatenación de librerías Javascript propias en orden de inclusión.
 */
gulp.task('web:build-js', function () {
    return gulp.src([
            'web/js/main.js',
            'web/views/**/handler.js',
            'web/views/templates.js'
        ])
        .pipe(concat('app.js'))
        .pipe(gulp.dest('web/js'));
});

/**
 * Actualiza los cambios de la librería en la aplicación web.
 */
gulp.task('web:update-lib', function() {
	return gulp.src([
			'lib/css/uix*.css',
            'lib/css/uix-theme.less',
			'lib/fonts/glyphs/**',
			'lib/js/*.js'
		], {
            base: 'lib/'
        })
		.pipe(gulp.dest('web/'));
});

/**
 * Construye la aplicación web.
 */
gulp.task('web:build', gulp.series('web:update-lib', 'web:build-css', 'web:build-ejs', 'web:build-js'));

/**
 * Detección de cambios de la aplicación web.
 */
gulp.task('web:watch', function () {
    // Cambios en la hoja de estilos
    gulp.watch([
            'web/css/*.less',
            'web/views/**/*.less'
        ], gulp.series('web:build-css'));

    // Cambios en las plantillas EJS
    gulp.watch(['web/views/**/*.ejs'], gulp.series('web:build-ejs'));

    // Cambios en los scripts de la aplicación
    gulp.watch([
            'web/js/main.js',
            'web/views/**/handler.js',
            'web/views/templates.js'
        ], gulp.series('web:build-js'));

    // Actualización de la librería en la aplicación web
    gulp.watch([
        'lib/js/*.js',
        'lib/css/uix*.css',
        'lib/css/uix-theme.less',
        'lib/fonts/glyphs/**'
    ], gulp.series('web:update-lib'));
});