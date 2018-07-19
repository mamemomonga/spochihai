# spochihai

このアプリは、現在Spotifyで再生している曲をmstdn.jpで簡単にトゥートするためのツールです。

# 設定と起動

実行には、Dockerが必要です。

	$ docker build -t spochihai .

## 設定

Spotifyのトークンの取得方法は、[Spotify for Developers](https://developer.spotify.com/documentation/web-api/quick-start/)を参照。

	$ cp .env.example .env
	$ vim .env

# 起動

http://localhost:8888/ でサーバが起動される。 CTRL+Cで終了

	$ docker run --rm --env-file=.env -it -p 8888:8888 spochihai

以下の方法でバックグラウンド動作になる。

	$ docker run --rm --env-file=.env -d --name=spochihai -p 8888:8888 spochihai

終了は以下の通り

	$ docker rm -f spochihai

# License

MIT

except [\_reset.scss](src/client/sass/_reset.scss) (public domain)

