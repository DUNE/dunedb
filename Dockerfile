FROM node:lts-alpine

VOLUME /app
WORKDIR /app
COPY ./app /

# Install node-gyp and dependencies
RUN apk add python3 make g++
RUN npm install

CMD ["node", "index.js"]
