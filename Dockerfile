FROM node:16.15.0-alpine

# Install node-gyp and dependencies
WORKDIR /build
RUN apk add python3 make g++
COPY app/package.json app/package-lock.jso[n] /build/
RUN npm ci

VOLUME /app
WORKDIR /app
COPY ./app /

COPY entrypoint.sh /usr/bin/
RUN chmod +x /usr/bin/entrypoint.sh
ENTRYPOINT ["entrypoint.sh"]
