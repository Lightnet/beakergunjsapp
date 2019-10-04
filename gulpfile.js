const mode = process.env.NODE_ENV || 'development';
const dev = mode === 'development';
const prod = mode === 'production';
//var started = false;

//const path        = require('path');
//const fs          = require('fs');
var gulp            = require('gulp');
const del           = require('del');
var rename          = require('gulp-rename');
//const babel         = require('rollup-plugin-babel');
const svelte        = require('rollup-plugin-svelte');
const resolve       = require('rollup-plugin-node-resolve');
const commonjs      = require('rollup-plugin-commonjs');
const rollup        = require('gulp-better-rollup');

//===============================================
// Rollup
//===============================================
var frontrollupconfig = {
    //input: 'src/main.js',
    plugins: [
        svelte({
			dev: !dev,
			css: css => {
				css.write('public/bundle.css');
			}
        }),
        resolve(),
        commonjs(),
    ]
}

frontrollupconfig = {
    //input: 'src/main.js',
    plugins: [
        //babel(),
        svelte({
			dev: !dev,
			css: css => {
				css.write('public/bundle.css');
			}
        }),
        resolve(),
        commonjs()
    ]
}


function frontrollup_build(){
    return gulp.src('src/client/cliententrypoint.js')
    //.pipe(rollup(frontrollupconfig, 'umd'))
    .pipe(rollup(
        frontrollupconfig,
        {
            //format: 'cjs',
            format: 'umd',
        }
    ))
    //.pipe(rollup(require('./rollup.config.js'), 'umd'))
    .pipe(rename('bundle.js'))
    .pipe(gulp.dest('public/'));
}

exports.frontrollup_build = frontrollup_build;

async function cleanbundle(done){
    del.sync([ 'public/bundle.js','public/bundle.js.map']);
    return done();
}
exports.cleanbundle = cleanbundle;

function watch(done) {
    gulp.watch(['./src/client/**/*.*'], gulp.series( cleanbundle, frontrollup_build));
    return done();
}

const build = gulp.series(
    frontrollup_build,
    watch
);

/*
 * Export a default task
 */
exports.default = build;
