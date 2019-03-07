'use strict';

/**
 * Defining base paths
 *
 */
var basePaths = {
	node: './node_modules/',                                        // Path to node packages
	projectPHPFiles: './**/*.php',                                  // Path to all PHP files.
	projectStylesheetFiles: './assets/stylesheets/src/',   // Path to all *.scss files inside css folder and inside them.
	projectJSFiles: './assets/js/src/'                          // Path to all custom JS files.
};

/**
 * Defining requirements
 *
 */
var gulp = require('gulp'),
	googleWebFonts = require('gulp-google-webfonts'),
	notify = require('gulp-notify'),
	del = require('delete'),
	merge = require('merge-stream'),
	uglify = require('gulp-uglify-es').default,
	sass = require('gulp-sass'),
	plumber = require('gulp-plumber'),
	concat = require('gulp-concat'),
	cleanCSS = require('gulp-clean-css'),
	sourcemaps = require('gulp-sourcemaps'),
	watch = require('gulp-watch'),
	livereload = require('gulp-livereload'),
	browserSync = require('browser-sync').create(),
	cachebust = require('gulp-cache-bust');
// sassVariables = require('gulp-sass-variables');

/**
 * Configure the javascript bundle for the application
 *
 */
gulp.task('scripts', function () {
	return gulp.src([
		basePaths.node + 'popper.js/dist/umd/popper.js',
		basePaths.node + 'bootstrap/dist/js/bootstrap.js',
		basePaths.projectJSFiles + 'vendor/*.js',
		basePaths.projectJSFiles + '*.js',
		'!assets/js/src/admin.js',
		'!assets/js/src/idg-wp-customizer.js'
	])
	// .pipe(plumber())
		.pipe(concat('bundle.min.js'))
		.pipe(uglify())
		.pipe(gulp.dest('./assets/js/dist/'))
		.pipe(notify('Arquivos JS recarregados!'))
		.pipe(livereload());
});

gulp.task('scripts-dev', function () {
	return gulp.src([
		basePaths.node + 'popper.js/dist/umd/popper.js',
		basePaths.node + 'bootstrap/dist/js/bootstrap.js',
		basePaths.projectJSFiles + 'vendor/*.js',
		basePaths.projectJSFiles + '*.js',
		'!assets/js/src/admin.js',
		'!assets/js/src/idg-wp-customizer.js'
	])
	// .pipe(plumber())
		.pipe(concat('bundle.js'))
		.pipe(sourcemaps.init())
		//.pipe(uglify())
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('./assets/js/dist/'))
		.pipe(notify('Arquivos JS recarregados!'))
		.pipe(livereload());
});

/**
 * Configure the javascript bundle for the application
 *
 */
gulp.task('scripts-admin', function () {
	return gulp.src([
		basePaths.projectJSFiles + 'admin.js'
	])
	// .pipe(plumber())
		.pipe(concat('admin.min.js'))
		.pipe(sourcemaps.init())
		.pipe(uglify())
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('./assets/js/dist/'))
		.pipe(notify('Arquivos JS recarregados!'))
		.pipe(livereload());
});

/**
 * Configure the javascript bundle for the application
 *
 */
gulp.task('scripts-customizer', function () {
	return gulp.src([
		basePaths.projectJSFiles + 'idg-wp-customizer.js'
	])
	// .pipe(plumber())
		.pipe(concat('idg-wp-customizer.min.js'))
		.pipe(sourcemaps.init())
		.pipe(uglify())
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('./assets/js/dist/'))
		.pipe(notify('Arquivos JS recarregados!'))
		.pipe(livereload());
});

/**
 * Configure the stylesheet bundle for the application
 *
 */
gulp.task('styles', function () {
	return gulp.src([
		// basePaths.node + 'font-awesome/scss/font-awesome.scss',
		basePaths.projectStylesheetFiles + 'main.scss'
	])
	// .pipe(sassVariables({
	// Set variables for define font-awesome fonts folder
	//    '$fa-font-path': '../../fonts'
	// }))
		.pipe(plumber())
		.pipe(sass())
		// .pipe(cleanCSS({
		// 	compatibility: 'ie8',
		// 	level: 2,
		// 	inline: ['none']
		// }))
		.pipe(concat('bundle.min.css'))
		.pipe(gulp.dest('./assets/stylesheets/dist/'))
		.pipe(notify('Folha de estilo recarregada'))
		.pipe(livereload());
});

/**
 * Configure the stylesheet bundle for the application
 *
 */
gulp.task('styles-dev', function () {
	return gulp.src([
		basePaths.projectStylesheetFiles + 'main.scss'
	])
		.pipe(plumber())
		.pipe(sourcemaps.init())
		.pipe(sass())
    .pipe(cachebust({
        type: 'timestamp'
    }))
		.pipe(concat('bundle.css'))
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('./assets/stylesheets/dist/'))
		.pipe(notify('Folha de estilo recarregada'))
		.pipe(livereload());
});

/**
 * Configure the stylesheet bundle for the wordpress admin styles
 *
 */
gulp.task('styles-admin', function () {
	return gulp.src([
		basePaths.projectStylesheetFiles + 'admin.scss'
	])
		.pipe(plumber())
		.pipe(sourcemaps.init())
		.pipe(sass())
		.pipe(cleanCSS({compatibility: 'ie8'}))
		.pipe(concat('admin.min.css'))
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('./assets/stylesheets/dist/'))
		.pipe(notify('Folha de estilo recarregada'))
		.pipe(livereload());
});

/**
 * Watch for PHP changes
 *
 */
gulp.task('php', function () {
	gulp.src(basePaths.projectPHPFiles).pipe(livereload());
});

/**
 * Synchronised browser testing
 *
 */
gulp.task('browser-sync', function () {
	browserSync.init([
		basePaths.projectPHPFiles,
		basePaths.projectStylesheetFiles,
		basePaths.projectJSFiles
	]);
});

/**
 * Watch for changes
 *
 */
gulp.task('watch', function () {
	livereload.listen();
	gulp.watch('./assets/stylesheets/src/**/*.scss', ['styles-dev', 'styles-admin', 'browser-sync-watch']);
	gulp.watch('./assets/js/src/*.js', ['scripts-dev', 'scripts-admin', 'scripts-customizer', 'browser-sync-watch']);
	gulp.watch('**/*.php', ['php', 'browser-sync-watch']);

	// browserSync.reload();
});

gulp.task('browser-sync-watch', function (done) {
	browserSync.reload();
	done();
});

/**
 *  Download Google webfonts and generate a stylesheet for them
 *
 */
gulp.task('fonts', ['generate-fonts'], function () {
	var fonts = gulp.src([
		'tmp/generate-fonts/assets/fonts/*.{ttf,woff,woff2,eof,svg}'
	]).pipe(gulp.dest('./assets/fonts/'));

	var css = gulp.src([
		'tmp/generate-fonts/assets/stylesheets/dist/_google-fonts.scss'
	]).pipe(gulp.dest('./assets/stylesheets/src/vendor/google-fonts/'));

	console.log('Google fonts are ready to use');
	return merge(fonts, css);
});

// Downloading google fonts and storing them into tmp folder, so we can move it later on
gulp.task('generate-fonts', function () {
	console.log('Downloading google fonts');

	var options = {
		fontsDir: 'assets/fonts/',
		cssDir: 'assets/stylesheets/dist/',
		cssFilename: '_google-fonts.scss',
		relativePaths: true
	};

	return gulp.src('./fonts.list')
		.pipe(googleWebFonts(options))
		.pipe(gulp.dest('tmp/generate-fonts'));
});

/**
 *  Copy bootstrap files to correct folder
 *
 */
gulp.task('bootstrap', function () {
	console.log('Copying contents from bootstrap sass folder');
	return gulp.src([
		basePaths.node + 'bootstrap/scss/**'
	]).pipe(gulp.dest('./assets/stylesheets/src/vendor/bootstrap/'));
});

/**
 * Prepare the environment for development
 *
 */
gulp.task('prepare-dev', ['fonts', 'bootstrap'], function () {
	// Delete temporary folder
	del(['tmp/**'], {force: true}, function (err, deleted) {
		if (err) throw err;
		// console.log(deleted); // deleted files
	});
	return gulp.src('.').pipe(notify('O ambiente está pronto para o desenvolvimento!'));
});

/**
 *  Browsersync
 *
 */
gulp.task('browser-sync', function () {
	browserSync.init({
		proxy: 'http://rouanet.localhost/'
	});
});

/**
 * Default task
 *
 */
gulp.task('default', ['styles', 'styles-admin', 'scripts', 'scripts-admin', 'scripts-customizer']);

// Task for dev
gulp.task('dev', ['styles-dev', 'styles-admin', 'scripts-dev', 'scripts-admin', 'browser-sync', 'watch']);
