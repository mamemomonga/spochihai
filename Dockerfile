FROM node:14-alpine

RUN set -xe && \
	apk --update add tzdata && \
	rm -rf /etc/localtime && \
	cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
	echo 'Asia/Tokyo' > /etc/timezone && \
	apk del tzdata && \
	rm -rf /var/cache/apk/*

RUN set -xe && \
	apk --update add su-exec && \
	rm -rf /var/cache/apk/*

RUN set -xe && \
	npm install yarn-install --global

ADD package.json /home/node/app/package.json
ADD yarn.lock /home/node/app/yarn.lock
RUN set -xe && \
	chown -R node:node /home/node/app && \
	su-exec node sh -c 'cd /home/node/app; yarn'

ENV NODE_ENV=production
ENV SERVE_PORT=8888
ADD gulpfile.babel.js /home/node/app/gulpfile.babel.js
ADD src /home/node/app/src
RUN set -xe && \
	chown -R node:node /home/node/app/src && \
	su-exec node sh -c 'cd /home/node/app; yarn run gulp build'

ADD entrypoint.sh /home/node/entrypoint.sh
EXPOSE 8888
CMD /home/node/entrypoint.sh
