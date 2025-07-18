# Building OKD Infrastructure

Ensure openshift-cli is installed on your local machine. That program is the `oc` command referenced below.

Obtain the login command that uses `oc` from the OKD interface by clicking on your username in the upper right corner of the page and selecting the `Copy login command` option from the dropdown menu. Run the login command you copied and the proceed to the next step.

Start with the NodeJS Alpine docker image.  Create an image stream with two tags, one for production and one for staging.  Then create the build configs for pulling the source code from GitHub and building the images before pushing them to the image stream.

```bash
oc import-image node:lts-alpine --from=docker.io/library/node:lts-alpine --confirm --scheduled=true
oc create -f imagestream.yaml
oc process -f buildconfig.yaml -p RELEASE_BRANCH=production | oc create -f -
oc process -f buildconfig.yaml -p RELEASE_BRANCH=staging | oc create -f -
```
If you are migrating from one OKD instance to another, copy the YAML format for each of the following Secrets on the old instance and create them in the new instance:

```bash
production
staging
production-db-tls
staging-db-tls
tls
```

Create the deployment configuration for production and staging, along with their respective services so that they are Internet-routeable.  These assume the secrets have already been created.

```bash
oc process -f deploymentconfig.yaml -p DEPLOYMENT=staging -p EXTERNAL_IP=$(dig +short apa-staging.dunedb.org | tail -1) | oc create -f -
oc process -f deploymentconfig.yaml -p DEPLOYMENT=production -p EXTERNAL_IP=$(dig +short apa.dunedb.org | tail -1) | oc create -f -
```
If you are migrating from on OKD instance to another: 

* the locations of the staging and production interfaces may need to be changed from `apa.dunedb.org` to `okdprodX-apa.dunedb.org`. The DNS will be updated after the migration such that `apa.dunedb.org` points to `okdprodX-apa.dunedb.org`. The DNS change is done via a request to Fermilab.
  
* you will need to add the `staging-db-tls` and `production-db-tls` Secrets to mount points for the staging and production deployments.  Navigate to the `Workloads->Secrets` page and select the desired secret from the list. Then on that secret's page, click the `Add secret to workload` button, select the appropriate workload, and add the secret as a volume with the mount path as `/db-tls`.
