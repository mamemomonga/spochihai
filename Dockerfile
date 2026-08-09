# syntax=docker/dockerfile:1

# ------------------------------------------------------------
# 1. deps: 依存パッケージのインストール(devDependencies含む)
# ------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /home/node/app

RUN corepack enable

COPY package.json yarn.lock ./
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn \
	yarn install --frozen-lockfile

# ------------------------------------------------------------
# 2. build: gulpでサーバ/クライアントJS・CSS・HTMLをビルド
# ------------------------------------------------------------
FROM deps AS build
WORKDIR /home/node/app

COPY gulpfile.babel.js ./
COPY src ./src

ENV NODE_ENV=production
RUN yarn run gulp build

# ------------------------------------------------------------
# 3. prod-deps: 本番用(devDependenciesを含まない)依存関係のみ
# ------------------------------------------------------------
FROM node:22-alpine AS prod-deps
WORKDIR /home/node/app

RUN corepack enable

COPY package.json yarn.lock ./
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn \
	yarn install --frozen-lockfile --production

# ------------------------------------------------------------
# 4. runtime: 実行用の最小イメージ
# ------------------------------------------------------------
FROM node:22-alpine AS runtime

RUN apk add --no-cache su-exec tzdata && \
	cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
	echo 'Asia/Tokyo' > /etc/timezone && \
	apk del tzdata

ENV NODE_ENV=production
ENV SERVE_PORT=8888

WORKDIR /home/node/app
COPY --chown=node:node --from=prod-deps /home/node/app/node_modules ./node_modules
COPY --chown=node:node --from=build /home/node/app/var/build ./var/build
COPY --chown=node:node package.json ./package.json

COPY entrypoint.sh /home/node/entrypoint.sh
RUN chmod +x /home/node/entrypoint.sh

EXPOSE 8888
CMD ["/home/node/entrypoint.sh"]
