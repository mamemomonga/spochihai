
export function idE(name) {
	return document.getElementById(name)
}

export function idShow(name) {
	idE(name).style.display='block'
}
export function idHide(name) {
	idE(name).style.display='none'
}
export function idDisable(name) {
	idE(name).disabled='true'
}
export function idEnable(name) {
	idE(name).disabled=''
}

export class eventsController {
	constructor() {
		this.events=[]
	}	
	regist(id,type,func) {
		idE(id).addEventListener(type, func, false)
		this.events.push( [id, type, func] )
	}
	clear() {
		while(this.events.length > 0) {
			const eva=this.events.shift()
			idE(eva[0]).removeEventListener(eva[1],eva[2], false)
		}
	}
}

export function generateRandomString(length) {
	let text = ''
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
	for (var i = 0; i < length; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length))
	}
	return text
}

export function getHashParams() {
	let hashParams = {}
	let  e
	const r = /([^&;=]+)=?([^&;]*)/g
	const q = window.location.hash.substring(1)
	while ( e = r.exec(q)) {
		hashParams[e[1]] = decodeURIComponent(e[2])
	}
	return hashParams
}

export function escapeHTML(str) {
	return str.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;')
}

