// ------------------------
// build.js
//   node build.js          ビルド
//   node build.js --watch  更新監視
// ------------------------
import fs from 'node:fs/promises'
import { watch } from 'node:fs'
import path from 'node:path'
import * as esbuild from 'esbuild'
import * as sass from 'sass'
import { minify } from 'html-minifier-terser'

const DEVELOPMENT = process.env.NODE_ENV === 'development'
const WATCH = process.argv.includes('--watch')
const OUT = 'var/build/public'

if(DEVELOPMENT) { console.log('DEVELOPMENT MODE') }

// クライアントサイドJS
const esbuildOptions = {
	entryPoints: ['src/client/js/index.js'],
	outfile: `${OUT}/index.js`,
	bundle: true,
	format: 'iife',
	target: ['es2020'],
	minify: !DEVELOPMENT,
	sourcemap: DEVELOPMENT,
	logLevel: 'info',
}

// SCSS展開とCSS圧縮
async function buildSass() {
	const result = await sass.compileAsync('src/client/sass/base.scss', {
		style: DEVELOPMENT ? 'expanded' : 'compressed',
	})
	await fs.writeFile(`${OUT}/base.css`, result.css)
}

// HTML圧縮
async function buildHtml() {
	const src = await fs.readFile('src/client/index.html', 'utf8')
	const html = DEVELOPMENT ? src : await minify(src, { collapseWhitespace: true })
	await fs.writeFile(`${OUT}/index.html`, html)
}

// 素材
async function buildAssets() {
	await fs.cp('src/client/assets', OUT, { recursive: true }).catch((e)=>{
		if(e.code !== 'ENOENT') { throw e }
	})
}

async function buildStatic() {
	await Promise.all([ buildSass(), buildHtml(), buildAssets() ])
}

await fs.mkdir(OUT, { recursive: true })
await buildStatic()

if(WATCH) {
	const ctx = await esbuild.context(esbuildOptions)
	await ctx.watch()
	for(const dir of ['src/client/sass', 'src/client']) {
		watch(dir, { recursive: dir !== 'src/client' }, (_ev, file)=>{
			if(!file || path.extname(file) === '.js') { return }
			buildStatic()
				.then(()=>console.log(`rebuilt: ${file}`))
				.catch((e)=>console.error(e.message))
		})
	}
} else {
	await esbuild.build(esbuildOptions)
}
