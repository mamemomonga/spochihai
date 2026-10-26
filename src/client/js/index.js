// ｽﾎﾟﾁﾊｲ

import {
	idE,
	idShow,
	idHide,
	getHashParams,
	el,
	safeURL,
	isHostname,
	openWindow
} from './utils.js'

const DEBUG=false
const VERSION="2.0.0"

const track_styles=[
	(t)=>`${t.name} / ${t.artist}\n${t.url}\n${t.tags}`,
	(t)=>`"${t.name}" from "${t.album}" / ${t.artist}\n${t.url}\n${t.tags}`,
	(t)=>`Track: ${t.name}\nArtist: ${t.artist}\nAlbum: ${t.album}\n${t.url}\n${t.tags}`,
]

class Index {
	constructor() {
		if(typeof localStorage == 'undefined') {
			window.alert("このブラウザではWebStorageが利用できません");
			return
		}
		this.storage = localStorage

		// 旧バージョンでWebStorageに保存していたトークンを削除する
		this.storage.removeItem('access_token')
		this.storage.removeItem('refresh_token')

		this.current_track_style=parseInt(this.storage.getItem('track-style'),10) || 0
		if(this.current_track_style >= track_styles.length) { this.current_track_style=0 }
	}

	async run() {
		console.log("version "+VERSION)
		const params=getHashParams()
		if(location.hash) {
			history.replaceState(null, '', location.pathname + location.search)
		}
		if(params.error) {
			alert('There was an error during the authentication');
		}
		this.regist_eventListeners()

		if(this.storage.getItem('append-tag')) {
			idE('append-tag').value=this.storage.getItem('append-tag')
		}

		idE('mstdn-instance').value=this.storage.getItem('mstdn-instance') || 'mstdn.jp'

		if(this.storage.getItem('trackinfo-us')) {
			idE('trackinfo-us').checked=true
		}

		if(this.storage.getItem('songwhip')) {
			idE('songwhip').checked=true
		}

		// アクセストークンはメモリ上にのみ保持する
		if(!await this.ajax_refresh_token()) {
			idShow('login'); idHide('loggedin')
			return
		}
		idHide('login'); idShow('loggedin')
		this.update_currently_playing()
	}

	async ajax_currently_playing(retry=true) {
		const query=idE('trackinfo-us').checked ? '?locale=en_US' : ''
		const r=await fetch(`https://api.spotify.com/v1/me/player/currently-playing${query}`,{
			headers: { 'Authorization': 'Bearer ' + this.access_token },
		})
		if(r.status === 401 && retry && await this.ajax_refresh_token()) {
			return this.ajax_currently_playing(false)
		}
		// 204: 再生中の曲がない
		if(r.status === 204 || !r.ok) { return null }
		return r.json()
	}

	async ajax_refresh_token() {
		clearTimeout(this.refresh_timer)
		const r=await fetch('/refresh_token',{
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				'X-Requested-With': 'spochihai'
			}
		})
		if(!r.ok) {
			this.access_token=null
			return false
		}
		const body=await r.json()
		this.access_token=body.access_token
		// 有効期限の5分前に更新する
		const expires_in=(body.expires_in || 3600) - 300
		this.refresh_timer=setTimeout(()=>{ this.ajax_refresh_token() }, Math.max(expires_in,60)*1000)
		return true
	}

	update_track_text() {
		if(!this.current_playing) { return }
		const append_tag = idE('append-tag').value ? ' '+idE('append-tag').value : ''
		const comment=idE('comment-textarea').value
		this.track_text=
			( comment ? comment+"\n\n" : '' )
			+track_styles[this.current_track_style]({
				tags: '#ｽﾎﾟﾁﾊｲ'+append_tag,
				...this.current_playing
			})
		idE('track-style').textContent=this.track_text
	}

	render_currently_playing() {
		const t=this.current_playing
		const placeholder=idE('currently-playing')
		if(!t) {
			placeholder.replaceChildren(el('p',{},'再生中の曲がありません'))
			return
		}
		const row=(name, ...value)=>el('tr',{},el('th',{},name),el('td',{},...value))
		const url=safeURL(t.url)
		const artwork=safeURL(t.artwork)
		const large_artwork=safeURL(t.large_artwork)
		placeholder.replaceChildren(
			el('div',{ class: 'artwork-box' },
				artwork ? el('a',{ href: large_artwork || artwork, target: '_blank', rel: 'noopener noreferrer' },
					el('img',{ src: artwork, class: 'artwork', alt: '' })) : ''
			),
			el('table',{ class: 'currently-playing' },
				row('Track',  t.name),
				row('Artist', t.artist),
				row('Album',  t.album),
				row('URL', url ? el('a',{ href: url, target: '_blank', rel: 'noopener noreferrer' }, url) : '')
			),
			el('div',{ class: 'clearfix' })
		)
	}

	async update_currently_playing() {
		const r=await this.ajax_currently_playing().catch((e)=>{ console.error(e); return null })
		const item=r && r.item
		if(!item) {
			this.current_playing=null
			this.render_currently_playing()
			return
		}
		const images=(item.album && item.album.images) || []
		const spotify_url=item.external_urls ? item.external_urls.spotify : ''
		this.current_playing={
			artist:  (item.artists || item.show && [item.show] || []).map((a)=>a.name).join(', '),
			name:    item.name,
			album:   item.album ? item.album.name : '',
			artwork: (images[1] || images[0] || {}).url,
			large_artwork: (images[0] || {}).url,
			url:     (idE('songwhip').checked ? 'https://songwhip.com/' : '') + spotify_url,
		}
		this.render_currently_playing()
		this.update_track_text()
		if(DEBUG) {
			idE('debug').replaceChildren(el('h2',{},'Debug'),el('pre',{},JSON.stringify(item, null, 2)))
		}
	}

	share_query() {
		return encodeURIComponent(this.track_text || '')
	}

	regist_eventListeners() {

		idE('logout').addEventListener('click',async ()=>{
			await fetch('/logout',{ method: 'POST', headers: { 'X-Requested-With': 'spochihai' } })
			this.storage.removeItem('append-tag')
			this.storage.removeItem('track-style')
			this.storage.removeItem('mstdn-instance')
			this.storage.removeItem('trackinfo-us')
			this.storage.removeItem('songwhip')
			location.href='/'
		}, false)

		idE('reconnect').addEventListener('click',()=>{
			location.href='/login'
		}, false)

		idE('update').addEventListener('click',()=>{
			this.update_currently_playing()
		}, false)

		idE('toot').addEventListener('click',()=>{
			const instance=idE('mstdn-instance').value.trim()
			if(!isHostname(instance)) {
				alert('インスタンス名が正しくありません')
				return
			}
			openWindow('https://'+instance+'/share?text='+this.share_query())
		}, false)

		idE('tweet').addEventListener('click',()=>{
			openWindow('https://twitter.com/intent/tweet?text='+this.share_query())
		}, false)

		idE('skeet').addEventListener('click',()=>{
			openWindow('https://bsky.app/intent/compose?text='+this.share_query())
		}, false)

		idE('track-style-change').addEventListener('click',()=>{
			this.current_track_style=(this.current_track_style+1) % track_styles.length
			this.update_track_text()
			this.storage.setItem('track-style',this.current_track_style)
		}, false)

		idE('mstdn-instance').addEventListener('change',()=>{
			this.storage.setItem('mstdn-instance',idE('mstdn-instance').value.trim())
		}, false)

		for(const a of document.querySelectorAll('.mstdn-instances a[data-instance]')) {
			a.addEventListener('click',()=>{
				idE('mstdn-instance').value=a.dataset.instance
				this.storage.setItem('mstdn-instance',a.dataset.instance)
			}, false)
		}

		idE('comment-textarea').addEventListener('input',()=>{
			this.update_track_text()
		}, false)

		idE('append-tag').addEventListener('change',()=>{
			this.storage.setItem('append-tag',idE('append-tag').value)
			this.update_track_text()
		}, false)

		const search_query=()=>this.current_playing
			? encodeURIComponent(`${this.current_playing.name} ${this.current_playing.artist}`) : ''

		idE('search-google').addEventListener('click',()=>{
			openWindow('https://www.google.co.jp/search?q='+search_query())
		}, false)

		idE('search-youtube').addEventListener('click',()=>{
			openWindow('https://www.youtube.com/results?search_query='+search_query())
		}, false)

		idE('auto-update').addEventListener('click',()=>{
			if(this.auto_update_int) { clearInterval(this.auto_update_int) }
			if( idE('auto-update').checked ) {
				this.auto_update_int=setInterval(()=>{ this.update_currently_playing() },1000*10)
				console.log('start autoupdate')
			}
		}, false)

		idE('trackinfo-us').addEventListener('change',()=>{
			if(idE('trackinfo-us').checked) {
				this.storage.setItem('trackinfo-us',true)
			} else {
				this.storage.removeItem('trackinfo-us')
			}
			this.update_currently_playing()
		}, false)

		idE('songwhip').addEventListener('change',()=>{
			if(idE('songwhip').checked) {
				this.storage.setItem('songwhip',true)
			} else {
				this.storage.removeItem('songwhip')
			}
			this.update_currently_playing()
		}, false)

		idE('copy-to-clipboard').addEventListener('click',()=>{
			const btn=idE('copy-to-clipboard')
			const done=(label)=>{
				btn.textContent=label
				btn.disabled=true
				setTimeout(()=>{
					btn.textContent="コピー"
					btn.disabled=false
				},5000)
			}
			navigator.clipboard.writeText(this.track_text || '').then(
				()=>done("コピー成功"),
				()=>done("コピー失敗")
			)
		},false)
	}
}

document.addEventListener('DOMContentLoaded',()=>{
	new Index().run()
})
