import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import bodyParser from 'body-parser'
import { generateRandomString } from '../utils.es'

const configs={
	client_id:     process.env.SPCHI_CLIENT_ID,
	client_secret: process.env.SPCHI_CLIENT_SECRET,
	redirect_uri:  process.env.SPCHI_REDIRECT_URI
}

const stateKey='spotify_auth_state'

const app = express()

app.use(express.static(`${__dirname}/public`))
	.use(cors())
	.use(cookieParser())
	.use(bodyParser.json())

app.get('/login',(req,res)=>{
	const state=generateRandomString(16)
	res.cookie(stateKey,state)
	const scope = 'user-read-currently-playing'
	res.redirect('https://accounts.spotify.com/authorize?' +
		new URLSearchParams({
			response_type: 'code',
			client_id: configs.client_id,
			scope: scope,
			redirect_uri: configs.redirect_uri,
			state: state
		}).toString()
	)
})

app.get('/callback',(req,res)=>{
  const code = req.query.code || null
  const state = req.query.state || null
  const storedState = req.cookies ? req.cookies[stateKey] : null

	if (state === null || state !== storedState) {
		res.redirect('/#' + new URLSearchParams({ error: 'state_mismatch' }).toString())
	} else {
		res.clearCookie(stateKey)
		const authHeader = 'Basic ' + Buffer.from(configs.client_id + ':' + configs.client_secret).toString('base64')

		fetch('https://accounts.spotify.com/api/token', {
			method: 'POST',
			headers: {
				'Authorization': authHeader,
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: new URLSearchParams({
				code: code,
				redirect_uri: configs.redirect_uri,
				grant_type: 'authorization_code'
			})
		})
		.then(async (response)=>{
			const body = await response.json()
			if (response.ok) {
				res.redirect('/#' + new URLSearchParams({
					access_token: body.access_token,
					refresh_token: body.refresh_token
				}).toString())
			} else {
				res.redirect('/#' + new URLSearchParams({ error: 'invalid_token' }).toString())
			}
		})
		.catch(()=>{
			res.redirect('/#' + new URLSearchParams({ error: 'invalid_token' }).toString())
		})
  }
})

app.post('/refresh_token', (req, res)=>{
	const refresh_token = req.body.refresh_token
	const authHeader = 'Basic ' + Buffer.from(configs.client_id + ':' + configs.client_secret).toString('base64')

	fetch('https://accounts.spotify.com/api/token', {
		method: 'POST',
		headers: {
			'Authorization': authHeader,
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({
			grant_type: 'refresh_token',
			refresh_token: refresh_token
		})
	})
	.then(async (response)=>{
		if (response.ok) {
			const body = await response.json()
			res.send({
				'access_token': body.access_token
			})
		}
	})
})

const serve_port=process.env.SERVE_PORT ? process.env.SERVE_PORT : 8888
console.log(`Listening on ${serve_port}`)
app.listen(serve_port)
