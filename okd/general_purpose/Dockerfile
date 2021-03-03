# very good doc at https://snyk.io/blog/10-best-practices-to-containerize-nodejs-web-applications-with-docker/
# build this with   docker build -t nathanieltagg/sietch .
# note that mongo on the host has to be set to 0.0.0.0 in /usr/local/etc/mongod.conf
# run an instance: 
# docker run -p 12313:12313/tcp --name sietch_container --rm -i -t  --mount type=bind,source="$(pwd)/docker_mount",target=/etc/sietch.d nathanieltagg/sietch

# this builds a complete working image, but has all the build cruft.
# using node:latest maybe useful
FROM debian:stable
RUN apt-get update
RUN apt-get install -y wget curl
RUN curl -fsSL https://deb.nodesource.com/setup_14.x | bash -
RUN wget -qO - https://www.mongodb.org/static/pgp/server-4.4.asc | apt-key add -
RUN echo "deb http://repo.mongodb.org/apt/debian buster/mongodb-org/4.4 main" |  tee /etc/apt/sources.list.d/mongodb-org-4.4.list
RUN apt-get update
RUN apt-get install -y git nodejs mongodb-org make gcc g++ python 
# COPY bin/ /usr/local/bin/
RUN wget -O /usr/local/bin/rmate https://raw.githubusercontent.com/jeremejevs/rmate/master/rmate
RUN chmod +x /usr/local/bin/rmate
WORKDIR /app
CMD ["/bin/bash"]
