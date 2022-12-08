#!/bin/sh
set -e

# Ensure node_modules are found
cp /build/package-lock.json /app/
if [ ! -d /app/node_modules ]; then
  echo "Copying node_modules from build directory to app directory..."
  cp -a /build/node_modules /app
fi

# Then exec the container's main process (what's set as CMD in the Dockerfile).
exec "$@"
