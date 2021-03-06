var gulp = require('gulp');
var bowerfiles = require('main-bower-files');
var elixir = require('laravel-elixir');
var filter = require('gulp-filter');
var notify = require('gulp-notify');
var minify = require('gulp-minify-css');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var changed = require('gulp-changed');
var base64 = require('gulp-base64');
var test = require('gulp-if');
var ignore = require('gulp-ignore');
var rewrite = require('gulp-rewrite-css');
var filesize = require('filesize');
var path = require('path');
var validator = require('validator');
var isAbsolute = require('is-absolute-url');

var task = elixir.Task;
var config = elixir.config;
var notification = elixir.Notification;

var _ = require('lodash');

elixir.extend('bower', function (options) {

    var options = _.merge({
        debugging: false,
        flatten: true,
        css: {
            minify: true,
            file: 'vendor.css',
            extInline: ['gif', 'png'],
            maxInlineSize: 32 * 1024, //max 32k on ie8
            output: config.css.outputFolder ? config.publicPath + '/' + config.css.outputFolder : config.publicPath + '/css'
        },
        js: {
            uglify: true,
            file: 'vendor.js',
            output: config.js.outputFolder ? config.publicPath + '/' + config.js.outputFolder : config.publicPath + '/js'
        },
        font: {
            output: (config.font && config.font.outputFolder) ? config.publicPath + '/' + config.font.outputFolder : config.publicPath + '/fonts',
            filter: /\.(eot|svg|ttf|woff|woff2|otf)$/i
        },
        img: {
            output: (config.img && config.img.outputFolder) ? config.publicPath + '/' + config.img.outputFolder : config.publicPath + '/imgs',
            filter: /\.(png|bmp|gif|jpg|jpeg)$/i

        }
    }, options);

    var files = [];

    if (options.css !== false)
        files.push('bower-css');
    if (options.js !== false)
        files.push('bower-js');
    if (options.font !== false)
        files.push('bower-fonts');
    if (options.img !== false)
        files.push('bower-imgs');

    new task('bower', function () {
        return gulp.start(files);
    });

    var isInline = function (file) {

        var fsize = file.stat ? filesize(file.stat.size) : filesize(Buffer.byteLength(String(file.contents)));
        var fext = file.path.split('.').pop();

        if (options.debugging)
            console.log("Size of file:" + file.path + " (" + 1024 * parseFloat(fsize) + " / max=" + options.css.maxInlineSize + ")");

        return options.css.extInline.indexOf(fext) > -1 && 1024 * parseFloat(fsize) < options.css.maxInlineSize;
    }

    gulp.task('bower-css', function () {

        var onError = function (err) {
            new notification().error(err, "Bower Files CSS Compilation Failed! Error: <%= error.message %>");
            this.emit('end');
        };

        var rebase = function (context) {

            if (isAbsolute(context.targetFile) || validator.isURL(context.targetFile) || context.targetFile.indexOf('data:image') === 0) {
                return context.targetFile;
            }

            var targetPath = context.targetFile.split(/\?|#/).shift()

            if (options.flatten)
            {
                targetPath = targetPath.split('/').pop();
            } else
            {
                targetPath = path.relative(opts.base, context.sourceDir + '/' + targetPath);
            }

            var absolutePath = path.relative(context.destinationDir, targetPath)

            if (absolutePath.match(options.font.filter))
                targetPath = path.relative(context.destinationDir, process.cwd() + '/' + options.font.output + '/' + targetPath);

            if (absolutePath.match(options.img.filter))
                targetPath = path.relative(context.destinationDir, process.cwd() + '/' + options.img.output + '/' + targetPath);

            if (process.platform === 'win32')
                targetPath = targetPath.replace(/\\/g, '/');

            if (opts.debugging)
            {
                console.log(context.targetFile + " -> " + targetPath);
            }

            return targetPath;

        };

        var opts = {
            debugging: options.debugging
        };


        return gulp.src(bowerfiles(opts), options.flatten ? null : {base: opts.base})
                .on('error', onError)
                .pipe(filter('**/*.css'))
                .pipe(test(options.css.maxInlineSize > 0, base64({
                    extensions: options.css.extInline,
                    maxImageSize: options.css.maxInlineSize, // bytes 
                    debug: options.debugging,
                })))
                .pipe(rewrite({destination: options.css.output, debug: options.debugging, adaptPath: rebase}))
                .pipe(concat(options.css.file))
                .pipe(test(options.css.minify, minify()))
                .pipe(gulp.dest(options.css.output))
                .pipe(new notification('CSS Bower Files Imported!'));


    });

    gulp.task('bower-js', function () {

        var onError = function (err) {
            new notification().error(err, "Bower Files JS Compilation Failed! Error: <%= error.message %>");
            this.emit('end');
        };

        var opts = {
            debugging: options.debugging
        };

        return gulp.src(bowerfiles(opts))
                .on('error', onError)
                .pipe(filter('**/*.js'))
                .pipe(concat(options.js.file))
                .pipe(test(options.js.uglify, uglify()))
                .pipe(gulp.dest(options.js.output))
                .pipe(new notification('Javascript Bower Files Imported!'));

    });

    gulp.task('bower-fonts', function () {

        var onError = function (err) {
            new notification().error(err, "Bower Files Font Copy Failed! Error: <%= error.message %>");
            this.emit('end');
        };

        var opts = {
            debugging: options.debugging,
            filter: options.font.filter
        };

        return gulp.src(bowerfiles(opts), options.flatten ? null : {base: opts.base})
                .on('error', onError)
                .pipe(ignore.exclude(isInline)) // Exclude inlined images
                .pipe(changed(options.font.output))
                .pipe(gulp.dest(options.font.output))
                .pipe(new notification('Font Bower Files Imported!'));
    });

    gulp.task('bower-imgs', function () {

        var onError = function (err) {
            new notification().error(err, "Bower Files Images Copy Failed! Error: <%= error.message %>");
            this.emit('end');
        };

        var opts = {
            debugging: options.debugging,
            filter: options.img.filter
        };

        return gulp.src(bowerfiles(opts), options.flatten ? null : {base: opts.base})
                .on('error', onError)
                .pipe(ignore.exclude(isInline)) // Exclude inlined images
                .pipe(changed(options.img.output))
                .pipe(gulp.dest(options.img.output))
                .pipe(new notification('Images Bower Files Imported!'));

    });

});
