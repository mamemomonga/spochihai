import crypto from 'node:crypto'
import path from 'node:path'
import express from 'express'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'

const configs={
	client_id:     process.env.SPCHI_CLIENT_ID,
	client_secret: process.env.SPCHI_CLIENT_SECRET,
	redirect_uri:  process.env.SPCHI_REDIRECT_URI
}
for(const [k,v] of Object.entries(configs)) {
	if(!v) {
		console.error(`missing config: ${k}`)
		process.exit(1)
	}
}

const DEVELOPMENT = process.env.NODE_ENV === 'development'
const PUBLIC_DIR = path.resolve(import.meta.dirname, '../../var/build/public')
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'

const stateKey='spotify_auth_state'
const refreshKey='spotify_refresh_token'

// HTTPSで公開されている場合のみSecure属性を付ける
const cookieBase={
	httpOnly: true,
	secure:   configs.redirect_uri.startsWith('https://'),
	sameSite: 'lax',
	path:     '/',
}

const basicAuth='Basic ' + Buffer.from(`${configs.client_id}:${configs.client_secret}`).toString('base64')

async function requestToken(params) {
	const res = await fetch(SPOTIFY_TOKEN_URL, {
		method: 'POST',
		headers: {
			'Authorization': basicAuth,
			'Content-Type':  'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams(params),
		signal: AbortSignal.timeout(10_000)
	})
	if(!res.ok) {
		throw new Error(`token request failed: ${res.status}`)
	}
	return res.json()
}

function setRefreshToken(res, token) {
	res.cookie(refreshKey, token, { ...cookieBase, maxAge: 1000*60*60*24*180 })
}

const app = express()

app.disable('x-powered-by')
app.use(helmet({
	contentSecurityPolicy: {
		directives: {
			'default-src': ["'self'"],
			'script-src':  ["'self'"],
			'style-src':   ["'self'"],
			'img-src':     ["'self'", 'https://*.scdn.co', 'https://*.spotifycdn.com'],
			'connect-src': ["'self'", 'https://api.spotify.com'],
			'form-action': ["'self'"],
			'frame-ancestors': ["'none'"],
			// HTTPで動かす開発環境では無効にする
			'upgrade-insecure-requests': cookieBase.secure ? [] : null,
		}
	},
	strictTransportSecurity: cookieBase.secure,
	referrerPolicy: { policy: 'no-referrer' },
}))
app.use(cookieParser())
app.use(express.static(PUBLIC_DIR))

app.get('/login',(req,res)=>{
	const state=crypto.randomBytes(16).toString('hex')
	res.cookie(stateKey, state, { ...cookieBase, maxAge: 1000*60*10 })
	const scope = 'user-read-currently-playing'
	res.redirect('https://accounts.spotify.com/authorize?' +
		new URLSearchParams({
			response_type: 'code',
			client_id: configs.client_id,
			scope: scope,
			redirect_uri: configs.redirect_uri,
			state: state
		})
	)
})

app.get('/callback', async (req,res)=>{
	const code  = typeof req.query.code  === 'string' ? req.query.code  : null
	const state = typeof req.query.state === 'string' ? req.query.state : null
	const storedState = req.cookies[stateKey]
	res.clearCookie(stateKey, cookieBase)

	if(req.query.error) {
		return res.redirect('/#error=access_denied')
	}
	if(!code || !state || !storedState || state.length !== storedState.length
		|| !crypto.timingSafeEqual(Buffer.from(state), Buffer.from(storedState))) {
		return res.redirect('/#error=state_mismatch')
	}

	try {
		const body = await requestToken({
			code: code,
			redirect_uri: configs.redirect_uri,
			grant_type: 'authorization_code'
		})
		// トークンはURLに載せず、HttpOnly Cookieにリフレッシュトークンのみ保存する
		setRefreshToken(res, body.refresh_token)
		res.redirect('/')
	} catch(e) {
		console.error(e.message)
		res.redirect('/#error=invalid_token')
	}
})

// 他サイトからのリクエストを拒否するため、カスタムヘッダを必須とする
// (CORSを許可していないので、クロスオリジンではこのヘッダを付けられない)
function requireXHR(req,res,next) {
	if(req.get('X-Requested-With') !== 'spochihai') {
		return res.status(403).json({ error: 'forbidden' })
	}
	next()
}

app.post('/refresh_token', requireXHR, async (req, res)=>{
	const refresh_token = req.cookies[refreshKey]
	if(!refresh_token) {
		return res.status(401).json({ error: 'not_logged_in' })
	}
	try {
		const body = await requestToken({
			grant_type: 'refresh_token',
			refresh_token: refresh_token
		})
		// リフレッシュトークンがローテーションされた場合は更新する
		if(body.refresh_token) {
			setRefreshToken(res, body.refresh_token)
		}
		res.set('Cache-Control', 'no-store')
		res.json({
			access_token: body.access_token,
			expires_in:   body.expires_in
		})
	} catch(e) {
		console.error(e.message)
		res.clearCookie(refreshKey, cookieBase)
		res.status(401).json({ error: 'invalid_token' })
	}
})

app.post('/logout', requireXHR, (req, res)=>{
	res.clearCookie(refreshKey, cookieBase)
	res.status(204).end()
})

const serve_port=process.env.SERVE_PORT || 8888
app.listen(serve_port, ()=>{
	console.log(`Listening on ${serve_port}${DEVELOPMENT ? ' (development)' : ''}`)
})
