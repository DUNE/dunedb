#!/bin/bash

# Most recent backup will be "today's"
date=`date -u +"%Y-%m-%d"`
# scp -r ubuntu@ec2:/sietch/database_backups/$date .

echo "Restoring dev->test database"
mongorestore \
  -d sietch_test --gzip $date/sietch_dev \
   --ssl --sslPEMKeyFile ~/okd/mongodb-config-test/auth-dev.pem --sslCAFile ~/okd/mongodb-config-test/root-ca.pem \
  "mongodb://dune-apa-dbdev01.fnal.gov,dune-apa-dbdev02.fnal.gov,dune-apa-dbdev03.fnal.gov/sietch_test?replicaSet=rs-mongodb-dev" 


# echo "Restoring dev database...."
# mongorestore \
#   -d sietch_dev --gzip $date/sietch_dev \
#   "mongodb://dune-apa-dbdev01.fnal.gov,dune-apa-dbdev02.fnal.gov,dune-apa-dbdev03.fnal.gov/sietch_test?replicaSet=rs-mongodb-dev" \
#    --ssl --sslPEMKeyFile ~/okd/mongodb-config-dev/auth-dev.pem --sslCAFile ~/okd/mongodb-config-dev/root-ca.pem

# echo "Resorting production database..."
# mongorestore \
#   -d sietch --gzip $date/sietch \
#   "mongodb://mongodb-p01.fnal.gov:27017,mongodb-p02.fnal.gov:27017,mongodb-p03.fnal.gov:27017/sietch?replicaSet=rs-mongodb-prod" \
#    --ssl --sslPEMKeyFile ~/okd/mongodb-config-production/auth-prod.pem --sslCAFile ~/okd/mongodb-config-production/root-ca.pem


