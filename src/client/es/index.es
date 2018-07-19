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
} from '../../utils.es'

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
			debug:       { template: 'debug-template', placeholder: 'debug' },
			currentlyPlaying: { template: 'currently-playing-template', placeholder: 'currently-playing' }
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

	regist_eventListeners() {
		idE('logout').addEventListener('click',()=>{
			this.storage.removeItem('access_token')
			this.storage.removeItem('refresh_token')
			location.href='/'
		}, false)
		idE('update').addEventListener('click',()=>{
			this.update_currently_playing()
		}, false)
		idE('toot').addEventListener('click',()=>{
			const comment=idE('toot-comment-textarea').value
			const text=
				( comment ? comment+"\n" : '' )
				+`[#ｽﾎﾟﾁﾊｲ] ${this.current_playing.name} / ${this.current_playing.artist}\n`
				+`${this.current_playing.url}`
			window.open('https://mstdn.jp/share?text='+encodeURIComponent(text))
		}, false)
	}

	update_currently_playing() {
		this.ajax_currently_playing()
		.then((r)=>{
			this.current_playing={
				artist: r.item.artists[0].name,
				name:   r.item.name,
				artwork: r.item.album.images[1].url,
				url: r.item.external_urls.spotify
			}
			this.hb.currentlyPlaying(this.current_playing)
//			this.hb.debug({ debug: JSON.stringify(r.item, null, 2) })
		})
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

		if(params.access_token){
			this.access_token  = params.access_token
			this.refresh_token = params.refresh_token
			this.storage.setItem('access_token',this.access_token)
			this.storage.setItem('refresh_token',this.refresh_token)

		} else if(this.storage.getItem('access_token')) {
			this.access_token  = this.storage.getItem('access_token')
			this.refresh_token = this.storage.getItem('refresh_token')
		}

		if(!this.access_token) {
			idShow('login'); idHide('loggedin')
			return
		} else {
			idHide('login'); idShow('loggedin')
		}
		this.update_currently_playing()
	}
}

document.addEventListener('DOMContentLoaded',()=>{
	new Index(window).run()
})

