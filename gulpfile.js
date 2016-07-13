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
    del         	= require('del'),
    package         = require('./package.json');



// =====================================================================================================================
// Library
// =====================================================================================================================
/**
 * Genera la fuente de iconos, en diferentes formatos (eot, svg, ttf, woff), y el css con la definición de los mismos.
 *
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
					timestamp: '' // time
				}, {ext: '.css'}))
				.pipe(gulp.dest('lib/css'));
		})
		.pipe(gulp.dest('lib/fonts/glyphs'));
});
*/

/**
 * Compila la hoja de estilos con LESS.
 *
gulp.task('lib:build-css', function() {
    return gulp.src('lib/css/uix.less')
        .pipe(less())
        .pipe(autoprefixer({
            browsers: ['last 2 versions']
        }))
        .pipe(gulp.dest('lib/css'))
        .pipe(rename('uix.min.css'))
        .pipe(minifyCss())
        .pipe(gulp.dest('lib/css'));
});
*/

/**
 * Genera el script completo de la librería, incluyendo los scritps de los plugins.
 */
gulp.task('lib:build-js', function () {
    return gulp.src([
            'lib/uix-core.js',
            'lib/plugins/**/*.js'
        ])
        .pipe(concat('uix.js'))
        .pipe(gulp.dest('lib/'))
        .pipe(rename('uix.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('lib/'));
});

/**
 * Empaqueta la librería para su distribución.
 */
gulp.task('lib:dist', gulp.series('lib:build-js', function _pack() {
	return gulp.src('lib/**')
		.pipe(zip('uix-' + package.version + '.zip'))
		.pipe(gulp.dest('dist/lib'));
}));

/**
 * Detección de cambios en la librería.
 */
gulp.task('lib:watch', function () {
	// Cambios en scripts
	gulp.watch(['lib/js/uix-core.js', 'lib/js/plugins/**/*.js'], gulp.series('lib:build-js'));
});



// =====================================================================================================================
// Web Application
// =====================================================================================================================
/**
 * Actualiza todos los ficheros de la librería en la aplicación web.
 */
gulp.task('web:update-lib', function() {
    return gulp.src([
        'lib/**'
    ])
        .pipe(gulp.dest('web/lib/uix'));
});

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
 * Compila la hoja de estilos de la aplicación web con Less.
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
        'web/*.*',
        'web/img/**'
    ], {
        base: 'web/'
    })
    .pipe(gulp.dest('build/web/'));
});

/**
 * Construye la aplicación web.
 */
gulp.task('web:build', gulp.series('web:update-lib', 'web:build-glyphs', 'web:build-css', 'web:build-uix-css', 'web:build-ejs', 'web:build-js', 'web:build-lib', 'web:build-etc'));

/**
 * Tarea para limpiar el directorio temporal de construcción de la aplicación web.
 */
gulp.task('web:clean', function () {
    return del('build/web/');
});

/**
 * Detección de cambios de la aplicación web.
 */
gulp.task('web:watch', function () {
    // Cambios en los ficheros de la librería
    gulp.watch([
        'lib/**'
    ], gulp.series('web:update-lib'));

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
        'web/*.*',
        'web/img/**',
    ], gulp.series('web:build-etc'));
});