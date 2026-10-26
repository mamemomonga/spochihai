
export function idE(name) {
	return document.getElementById(name)
}

export function idShow(name) {
	idE(name).style.display='block'
}
export function idHide(name) {
	idE(name).style.display='none'
}

export function getHashParams() {
	return Object.fromEntries(new URLSearchParams(window.location.hash.substring(1)))
}

// 要素を生成する。子要素は文字列ならテキストノードとして追加する
export function el(tag, attrs={}, ...children) {
	const e=document.createElement(tag)
	for(const [k,v] of Object.entries(attrs)) {
		e.setAttribute(k,v)
	}
	e.append(...children)
	return e
}

// http(s) のURLのみ許可する
export function safeURL(str) {
	try {
		const u=new URL(str)
		return (u.protocol === 'https:' || u.protocol === 'http:') ? u.href : null
	} catch {
		return null
	}
}

// ホスト名(ポート付きも可)として妥当か
export function isHostname(str) {
	return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+(:\d{1,5})?$/i.test(str)
}

// 新しいウィンドウを開く(開いた先から window.opener を参照させない)
export function openWindow(url) {
	window.open(url, '_blank', 'noopener,noreferrer')
}
