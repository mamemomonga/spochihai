// vim:ft=javascript
// ｽﾎﾟﾁﾊｲ

import {
	idE,
	idShow,
	idHide,
	idDisable,
	idEnable,
	eventsController,
	getHashParams,
	escapeHTML
} from '../../utils.es'

const DEBUG=false

// HandlerBar
class HandleBarsUtil {
	constructor(targets) {
		this.hb={}
		for(let i in targets) {
			this.hb[i]={
				template: Handlebars.compile(idE(targets[i].template).innerHTML),
				placeholder: idE(targets[i].placeholder)
			}
			this[i]=(data)=>{
				const t=this.hb[i]
				t.placeholder.innerHTML=t.template(data)
			}
		}
	}
}

class Index {
	constructor() {
		if(typeof localStorage == 'undefined') {
  			window.alert("このブラウザではWebStorageが利用できません");
			return
		}
		this.storage = localStorage

		this.hb=new HandleBarsUtil({
			debug:            { template: 'debug-template', placeholder: 'debug' },
			currentlyPlaying: { template: 'currently-playing-template', placeholder: 'currently-playing' },
		})

		const track_styles=[
			"{{{name}}} / {{{artist}}}\n{{{url}}}\n{{{tags}}}",
			'"{{{name}}}" from "{{{album}}}" / {{{artist}}}'+"\n{{{url}}}\n{{{tags}}}",
			"Track: {{{name}}}\nArtist: {{{artist}}}\nAlbum: {{{album}}}\n{{{url}}}\n{{{tags}}}"
		]
		this.track_styles=[]
		for(let i in track_styles) {
			this.track_styles[i]=Handlebars.compile(track_styles[i])
		}
		this.current_track_style=this.storage.getItem('track-style') || 0
	}

	run() {
		const params=getHashParams()
		const error = params.error
		location.hash=''
        if(error) {
			alert('There was an error during the authentication');
			return
		}
		this.regist_eventListeners()

		// access_token 更新期間
		setInterval(()=>{ this.ajax_refresh_token() },1000*30)

		if(params.access_token){
			this.access_token  = params.access_token
			this.refresh_token = params.refresh_token
			this.storage.setItem('access_token',this.access_token)
			this.storage.setItem('refresh_token',this.refresh_token)

		} else if(this.storage.getItem('access_token')) {
			this.access_token  = this.storage.getItem('access_token')
			this.refresh_token = this.storage.getItem('refresh_token')
		}

		if(this.storage.getItem('append-tag')) {
			idE('append-tag').value=this.storage.getItem('append-tag')
		}

		if(this.storage.getItem('mstdn-instance')) {
			idE('mstdn-instance').value=this.storage.getItem('mstdn-instance')
		} else {
			idE('mstdn-instance').value='mstdn.jp'
		}

		if(!this.access_token) {
			idShow('login'); idHide('loggedin')
			return
		} else {
			idHide('login'); idShow('loggedin')
		}
		this.ajax_refresh_token().then(()=>{
			this.update_currently_playing()
		})
	}

	ajax_currently_playing() {
		return fetch('https://api.spotify.com/v1/me/player/currently-playing',{
			headers: { 'Authorization': 'Bearer ' + this.access_token },
			method: 'GET',
			mode: 'cors',
		})
		.then((r)=>{ return r.json() })
	}

	ajax_refresh_token() {
		return fetch('/refresh_token',{
			body: JSON.stringify({ 'refresh_token': this.refresh_token }),
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json'
			}
		})
		.then((r)=>{ return r.json() })
		.then((r)=>{
			this.access_token = r.access_token
			this.storage.setItem('access_token',this.access_token)
			return r
		})
	}

	update_track_text() {
		const append_tag = idE('append-tag').value ? ' '+idE('append-tag').value : ''
		const comment=idE('comment-textarea').value
		this.track_text=
			( comment ? comment+"\n\n" : '' )
			+this.track_styles[this.current_track_style](
				Object.assign({
					tags: '#ｽﾎﾟﾁﾊｲ'+append_tag,
				},this.current_playing)		
			)
		idE('track-style').innerHTML=escapeHTML(this.track_text).replace(/\n/g,"<br>");
	}

	update_currently_playing() {
		this.ajax_currently_playing()
		.then((r)=>{
			let artists=[]
			for (var i in r.item.artists) {
				artists.push(r.item.artists[i].name)
			}
			this.current_playing={
				artist:  artists.join(', ',artists),
				name:    r.item.name,
				album:   r.item.album.name,
				artwork: r.item.album.images[1].url,
				url: r.item.external_urls.spotify
			}
			this.hb.currentlyPlaying(this.current_playing)
			this.update_track_text()
			if(DEBUG) {
				this.hb.debug({ debug: JSON.stringify(r.item, null, 2) })
			}
		})
	}

	regist_eventListeners() {

		idE('logout').addEventListener('click',()=>{
			this.storage.removeItem('access_token')
			this.storage.removeItem('refresh_token')
			this.storage.removeItem('append-tag')
			this.storage.removeItem('track-style')
			this.storage.removeItem('mstdn-instance')
			location.href='/'
		}, false)

		idE('reconnect').addEventListener('click',()=>{
			this.storage.removeItem('access_token')
			this.storage.removeItem('refresh_token')
			location.href='/login'
		}, false)

		idE('update').addEventListener('click',()=>{
			this.update_currently_playing()
		}, false)

		idE('toot').addEventListener('click',()=>{
			const text=encodeURIComponent(this.track_text)
			window.open('https://'+idE('mstdn-instance').value+'/share?text='+text)
		}, false)

		idE('track-style-change').addEventListener('click',()=>{
			this.current_track_style++
			if(this.track_styles.length == this.current_track_style ) {
				this.current_track_style=0
			}
			this.update_track_text()
			this.storage.setItem('track-style',this.current_track_style)
		}, false)

		idE('mstdn-instance').addEventListener('change',()=>{
			this.storage.setItem('mstdn-instance',idE('mstdn-instance').value)
		}, false)

		idE('comment-textarea').addEventListener('change',()=>{
			this.update_track_text()
		}, false)

		idE('append-tag').addEventListener('change',()=>{
			this.update_track_text()
			this.storage.setItem('append-tag',idE('append-tag').value)
		}, false)

		idE('search-google').addEventListener('click',()=>{
			window.open('https://www.google.co.jp/search?q='
				+encodeURIComponent(
					`${this.current_playing.name} ${this.current_playing.artist}`
				)
			)
		}, false)

		idE('search-youtube').addEventListener('click',()=>{
			window.open('https://www.youtube.com/results?search_query='
				+encodeURIComponent(
					`${this.current_playing.name} ${this.current_playing.artist}`
				)
			)
		}, false)
	}
}

document.addEventListener('DOMContentLoaded',()=>{
	new Index(window).run()
})

