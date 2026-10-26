# ---- build ----
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY build.js ./
COPY src ./src
RUN NODE_ENV=production npm run build && npm prune --omit=dev

# ---- runtime ----
FROM node:24-alpine
RUN apk add --no-cache tzdata
ENV TZ=Asia/Tokyo \
    NODE_ENV=production \
    SERVE_PORT=8888
WORKDIR /home/node/app
COPY --from=build --chown=root:root /app/package.json ./
COPY --from=build --chown=root:root /app/node_modules ./node_modules
COPY --from=build --chown=root:root /app/src/server ./src/server
COPY --from=build --chown=root:root /app/var/build/public ./var/build/public
USER node
EXPOSE 8888
CMD ["node", "src/server/server.js"]
