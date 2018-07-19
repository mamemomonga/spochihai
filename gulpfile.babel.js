// ------------------------
// gulpfile.babel.js
// ------------------------
import gulp           from 'gulp'
import log            from 'fancy-log'
import webpack        from 'webpack-stream'
import UglifyJSPlugin from 'uglifyjs-webpack-plugin'
import sass           from 'gulp-sass'
import htmlmin        from 'gulp-htmlmin'
import gls            from 'gulp-live-server'

// gulp-utilは終了しました
// https://medium.com/gulpjs/gulp-util-ca3b1f9f9ac5

// ------------------------
// NODE_ENV=development ならば DEVELOPMENT モードをtrueにする
// ------------------------
const DEVELOPMENT = process.env.NODE_ENV === 'development'
if(DEVELOPMENT) { log.info("DEVELOPMENT MODE") }

// ------------------------
// WebPack
// JavaScriptの連結圧縮
// ------------------------
const webpacks=(()=>{

	const common=(args)=>{
		return webpack({
			node: {
				__dirname: false,
				__filename: false,
				process: false,
			},
			devtool: DEVELOPMENT ? 'source-map' : undefined,
			plugins: DEVELOPMENT ? undefined : [ new UglifyJSPlugin() ],
			mode: DEVELOPMENT ? 'development' : 'production',
			module: { rules: [{
				test: /\.es$/,
				use: {
					loader: 'babel-loader',
					options: {
						presets: [
							[ "babel-preset-env", args.preset_env ]
						]
					}
				}
			}]},
			externals: args.server ? args.externals : [],
			output: {
				filename: args.filename,
				libraryTarget: args.server ? 'commonjs2' : undefined
			}
		})
	}

	return {
		// サーバサイドJS
		server: (filename)=>{
			return common({
				server: true,
				filename: filename,
				// node.jsのバージョン
				preset_env: { targets: { "node": "8.0" }},
				// 埋め込まないモジュール
				externals: [
					'express',
					'request',
					'cors',
					'querystring',
					'cookie-parser',
					'body-parser',
				]
			})
		},
		// クライアントサイドJS
		client: (filename)=>{
			return common({
				client: true,
				filename: filename,
				// 対象のブラウザバージョン
				preset_env: { targets: { browsers: "last 2 versions" }}
			})
		}

	}

})()

// ------------------------
// tasks
// ------------------------

// Hello World!
gulp.task('hello',(cb)=>{
	log.info('Hello World')
	cb()
})

// サーバサイドJS
gulp.task('build:server',()=>{
	return gulp.src('./src/server/server.es')
	.pipe(webpacks.server('server.js'))
	.pipe(gulp.dest('var/build'))
})

// クライアントサイドJS
gulp.task('build:client-index',()=>{
	return gulp.src('./src/client/es/index.es')
	.pipe(webpacks.client('index.js'))
	.pipe(gulp.dest('var/build/public'))
})

// SCSS展開とCSS圧縮
gulp.task('build:sass',()=>{
	return gulp.src('./src/client/sass/*.scss')
	.pipe(sass({ outputStyle: DEVELOPMENT ? 'expanded' : 'compressed'})
	.on('error',sass.logError))
	.pipe(gulp.dest('./var/build/public'))
})

// HTML圧縮
gulp.task('build:html',()=>{
	const src=['./src/client/index.html']
	if(DEVELOPMENT) {
		return gulp.src(src)
		.pipe(gulp.dest('var/build/public'))
	} else {
		return gulp.src(src)
		.pipe(htmlmin({collapseWhitespace: true}))
		.pipe(gulp.dest('var/build/public'))
	}

})

// 素材
gulp.task('build:assets',()=>{
	return gulp.src([
		'./src/client/assets/**/*',
		'./node_modules/handlebars/dist/handlebars.min.js'
	]).pipe(gulp.dest('var/build/public'))
})

gulp.task('build',gulp.parallel(
	'build:server',
	'build:sass',
	'build:client-index',
	'build:assets',
	'build:html',
))

gulp.task('serve:serve',()=>{
	const server = gls('var/build/server.js',{
		env: { NODE_ENV: process.env.NODE_ENV }
	});
    server.start();

	// 更新監視
	gulp.watch('./src/server/*.es',gulp.series(
		'build:server',
		(done)=>{ server.start(); done() }
	))

	gulp.watch('./src/client/es/**/*.es',gulp.series(
		'build:client-index',
		(done)=>{ server.start(); done() }
	))

	gulp.watch('./src/client/sass/**/*.scss',gulp.series(
		'build:sass',
		(done)=>{ server.start(); done() }
	))

	gulp.watch('./src/client/*.html',gulp.series(
		'build:html',
		(done)=>{ server.start(); done() }
	))

	gulp.watch('./src/client/assets/**/*.*',gulp.series(
		'build:assets',
		(done)=>{ server.start(); done() }
	))

})

gulp.task('serve',gulp.series(
	'build',
	'serve:serve'
))

