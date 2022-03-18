# Building OKD Infrastructure

Start with the NodeJS Alpine docker image.  Create an image stream with two tags,
one for production and one for staging.  Then create the build configs for pulling
the source code from GitHub and building the images before pushing them to the image
stream.

```bash
oc import-image node:lts-alpine --from=docker.io/library/node:lts-alpine --confirm --scheduled=true
oc create -f imagestream.yaml
oc process -f buildconfig.yaml -p RELEASE_BRANCH=production | oc create -f -
oc process -f buildconfig.yaml -p RELEASE_BRANCH=staging | oc create -f -
```

Create the deployment configuration for production and staging, along with their
respective services so that they are Internet-routeable.  These assume the secrets have
already been created.

```bash
oc process -f deploymentconfig.yaml -p DEPLOYMENT=staging -p EXTERNAL_IP=$(dig +short apa-dev.dunedb.org | tail -1) | oc create -f -
oc process -f deploymentconfig.yaml -p DEPLOYMENT=production -p EXTERNAL_IP=$(dig +short apa.dunedb.org | tail -1) | oc create -f -
```
