# spochihai

このアプリは、現在Spotifyで再生している曲をmstdn.jpで簡単にトゥートするためのツールです。

# 実行方法

## 環境

実行には、DockerおよびDocker Composeが必要です。

	$ docker-compose build

## 設定

.env を .env.example を参考にして編集します。

Spotifyのトークンの取得方法は、[Spotify for Developers](https://developer.spotify.com/documentation/web-api/quick-start/)を参照。

	$ cp .env.example .env
	$ vim .env

## 起動

.envのSPCHI\_PORTで設定したポートでHTTPサーバが起動される。 CTRL+Cで終了

	$ docker-compose up

以下の方法でバックグラウンド動作になる。

	$ docker-compose up -d

終了は以下の通り

	$ docker-compose down

## アップデート

最新版を git clone して docker-compose buildし再起動する。以下のスクリプトでも可能。

	$ bin/update.sh

# 開発時のTIPS

## .env ファイルを現在のシェルの環境変数として設定する方法

ローカル環境での開発時に便利です。

	$ eval "$( cat .env | perl -E 'while(<>) { chomp; say "export $_" }' )" 

## serverプロセスがdetachされたときにkillする方法

エラーがでるとたまにdetachされてしまう

	$ ps ax | grep 'node var/build/server.js' | grep -v 'grep' | awk '{ print $1 }' | xargs kill

# License

MIT

except [\_reset.scss](src/client/sass/_reset.scss) (public domain)

