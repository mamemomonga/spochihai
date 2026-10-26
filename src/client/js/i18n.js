// 国際化
//   翻訳文は locales/*.js に言語ごとにまとめてある
//   HTMLでは data-i18n="キー" (テキスト) / data-i18n-placeholder="キー" (placeholder) で指定する
//   JSでは t('キー') で文言を取得する

import en from './locales/en.js'
import ja from './locales/ja.js'
import it from './locales/it.js'

// 対応言語。言語を追加する場合は locales/ にファイルを作り、ここに加える
export const locales={ en, ja, it }

const DEFAULT_LANG='en'
// 手動で選択した言語の保存先(ログアウトで削除する)
export const LANG_STORAGE_KEY='lang'

let current=DEFAULT_LANG

function storedLang() {
	try {
		const lang=localStorage.getItem(LANG_STORAGE_KEY)
		return locales[lang] ? lang : null
	} catch {
		return null
	}
}

// ブラウザの言語設定から対応言語を選ぶ(なければ英語)
function browserLang() {
	for(const tag of navigator.languages || [navigator.language]) {
		const lang=(tag || '').toLowerCase().split('-')[0]
		if(locales[lang]) { return lang }
	}
	return DEFAULT_LANG
}

// 文言を取得する。現在の言語に無ければ英語、それも無ければキーを返す
export function t(key) {
	return locales[current][key] ?? locales[DEFAULT_LANG][key] ?? key
}

// ページ内の data-i18n 属性を持つ要素を翻訳する
export function translatePage() {
	document.documentElement.lang=current
	for(const e of document.querySelectorAll('[data-i18n]')) {
		e.textContent=t(e.dataset.i18n)
	}
	for(const e of document.querySelectorAll('[data-i18n-placeholder]')) {
		e.placeholder=t(e.dataset.i18nPlaceholder)
	}
}

// 言語を設定する。lang が空なら手動選択を解除してブラウザの設定に従う
export function setLang(lang) {
	try {
		if(locales[lang]) {
			localStorage.setItem(LANG_STORAGE_KEY, lang)
		} else {
			localStorage.removeItem(LANG_STORAGE_KEY)
		}
	} catch {}
	current=locales[lang] ? lang : browserLang()
	translatePage()
}

// 言語メニューを作る。onChange は言語を切り替えた後に呼ばれる
export function setupLangMenu(select, onChange) {
	const auto=document.createElement('option')
	auto.value=''
	auto.dataset.i18n='lang.auto'
	select.replaceChildren(auto, ...Object.entries(locales).map(([lang, messages])=>{
		const opt=document.createElement('option')
		opt.value=lang
		opt.textContent=messages['lang.name']
		return opt
	}))
	select.value=storedLang() || ''
	select.addEventListener('change', ()=>{
		setLang(select.value)
		onChange()
	}, false)
}

current=storedLang() || browserLang()
