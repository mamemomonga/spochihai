import express from 'express'
import request from 'request'
import cors from 'cors'
import querystring from 'querystring'
import cookieParser from 'cookie-parser'
import { generateRandomString } from '../utils.es'
import bodyParser from 'body-parser'

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
		querystring.stringify({
			response_type: 'code',
			client_id: configs.client_id,
			scope: scope,
			redirect_uri: configs.redirect_uri,
			state: state
		})
	)
})

app.get('/callback',(req,res)=>{
  const code = req.query.code || null
  const state = req.query.state || null
  const storedState = req.cookies ? req.cookies[stateKey] : null

	if (state === null || state !== storedState) {
		res.redirect('/#' + querystring.stringify({ error: 'state_mismatch' }))
	} else {
		res.clearCookie(stateKey)
		const authOptions = {
			url: 'https://accounts.spotify.com/api/token',
			form: {
				code: code,
				redirect_uri: configs.redirect_uri,
				grant_type: 'authorization_code'
			},
			headers: {
			  'Authorization': 'Basic ' + (new Buffer(configs.client_id + ':' + configs.client_secret).toString('base64'))
			},
			json: true
		}
		request.post(authOptions, (error, response, body)=>{
			if (!error && response.statusCode === 200) {
			const access_token = body.access_token
			const refresh_token = body.refresh_token
			res.redirect('/#' + querystring.stringify({
				access_token: access_token,
				refresh_token: refresh_token
			}))
		} else {
			res.redirect('/#' + querystring.stringify({ error: 'invalid_token' }))
		}
	})
  }
})

app.post('/refresh_token', (req, res)=>{
	const refresh_token = req.body.refresh_token
	const authOptions = {
		url: 'https://accounts.spotify.com/api/token',
		headers: {
			'Authorization': 'Basic ' + (new Buffer(configs.client_id + ':' + configs.client_secret).toString('base64'))
		},
		form: {
			grant_type: 'refresh_token',
			refresh_token: refresh_token
		},
		json: true
  }
  request.post(authOptions, (error, response, body)=>{
		if (!error && response.statusCode === 200) {
			const access_token = body.access_token
			res.send({
				'access_token': access_token
			})
		}
	})
})

const serve_port=process.env.SERVE_PORT ? process.env.SERVE_PORT : 8888
console.log(`Listening on ${serve_port}`)
app.listen(serve_port)

