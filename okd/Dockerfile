# very good doc at https://snyk.io/blog/10-best-practices-to-containerize-nodejs-web-applications-with-docker/
# build this with   docker build -t nathanieltagg/sietch .
# note that mongo on the host has to be set to 0.0.0.0 in /usr/local/etc/mongod.conf
# run an instance: 
# docker run -p 12313:12313/tcp --name sietch_container --rm -i -t  --mount type=bind,source="$(pwd)/docker_mount",target=/etc/sietch.d nathanieltagg/sietch

# this builds a complete working image, but has all the build cruft.
# using node:latest maybe useful
FROM node:lts-alpine AS buildimage
RUN apk add git
RUN apk add make
# if we want to use this image:
# RUN apk add dumb-init
# needed to run node-gyp for canvas
RUN apk add --no-cache make gcc g++ python pkgconfig pixman-dev cairo-dev pango-dev libjpeg-turbo-dev giflib-dev
RUN mkdir /etc/sietch.d
WORKDIR /app
RUN chown node:node /app
USER node
ENV NODE_ENV production

# if this is just a build stage, the package.json file is all that's needed.
# for a complete working version, you can get sietch code.
COPY --chmod=node:node package*.json /app/
# COPY  --chmod=node:node . .
# OR: RUN git clone <repo> --depth=1
RUN ls -al
RUN npm ci --only=production
EXPOSE 12313


# this gets a lean image
# may want to use a point-release instead of 'latest'
FROM node:lts-alpine 
RUN apk add dumb-init
RUN mkdir /etc/sietch.d
ENV NODE_ENV production
# for debugging:
RUN apk add nano less
RUN set -ex && apk --no-cache add sudo
USER node
WORKDIR /app
COPY  --chown=node:node --from=buildimage /app/node_modules /app/node_modules
COPY  --chmod=node:node . .
USER node
EXPOSE 12313
CMD ["dumb-init", "node", "index.js"]
