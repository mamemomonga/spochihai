# spochihai

このアプリは、現在Spotifyで再生している曲をmstdn.jpで簡単にトゥートするためのツールです。

# 実行方法

## 環境

実行には、DockerおよびDocker Compose (v2) が必要です。

	$ docker compose build

## 設定

.env を example.env を参考にして編集します。

Spotifyのトークンの取得方法は、[Spotify for Developers](https://developer.spotify.com/documentation/web-api/tutorials/getting-started)を参照。

SPCHI\_REDIRECT\_URI が `https://` で始まる場合、Cookieに Secure 属性が付与され、HSTSが有効になります。公開時はリバースプロキシでHTTPS化してください。

	$ cp example.env .env
	$ vim .env

## 起動

.envのSPCHI\_PORTで設定したポートでHTTPサーバが起動される。 CTRL+Cで終了

	$ docker compose up

以下の方法でバックグラウンド動作になる。

	$ docker compose up -d

終了は以下の通り

	$ docker compose down

## アップデート

最新版を git clone して docker compose buildし再起動する。以下のスクリプトでも可能。

	$ bin/update.sh

# 開発時のTIPS

## .env ファイルを現在のシェルの環境変数として設定する方法

ローカル環境での開発時に便利です。

	$ eval "$( cat .env | perl -E 'while(<>) { chomp; say "export $_" }' )" 

## ローカルでの開発

Node.js 24 以降が必要です。

	$ npm install
	$ npm run dev

`npm run build` でクライアントをビルドし、`npm start` でサーバを起動します。

# License

MIT

except [\_reset.scss](src/client/sass/_reset.scss) (public domain)

