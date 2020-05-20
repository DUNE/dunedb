// global.config = require('./configuration.js');
// var database = require('./lib/database.js');
const ObjectID = require('mongodb').ObjectID;


async function insertBatch(collection, documents) {
  console.log("start insertBatch");
  var bulkInsert = collection.initializeUnorderedBulkOp();
  var insertedIds = [];
  var id;
  await documents.forEach(function(doc) {
    console.log("queue ",doc._id);
    id = doc._id;
    // Insert without raising an error for duplicates
    bulkInsert.find({_id: ObjectID(id)}).upsert().replaceOne(doc);
    insertedIds.push(id);
  });
  console.log("inserting",insertedIds);
  await bulkInsert.execute();
  console.log("inserted",insertedIds);

  return insertedIds;
}

async function deleteBatch(collection, documents) {
  var bulkRemove = collection.initializeUnorderedBulkOp();
  await documents.forEach(function(doc) {
    bulkRemove.find({_id: ObjectID(doc._id)}).removeOne();
  });
  await bulkRemove.execute();
}

async function moveDocuments(sourceCollection, targetCollection, filter, batchSize) {
  var count = await sourceCollection.find(filter).count();
  console.log("Moving " + count + " documents from " + sourceCollection.collectionName + " to " + targetCollection.collectionName);
  while (count > 0) {
    console.log(count + " documents remaining");
    sourceDocs = await sourceCollection.find(filter).limit(batchSize);
    idsOfCopiedDocs = await insertBatch(targetCollection, sourceDocs);

    targetDocs = await targetCollection.find({_id: {$in: idsOfCopiedDocs}});
    deleteBatch(sourceCollection, targetDocs);
    count = await sourceCollection.find(filter).count();
  }
  console.log("Done!")
}


async function concat_databases() {
  var collections = await db.collections({});
  var tests = db.collection('tests');
  for (var c of collections) {
    if(c.collectionName.match(/^form_/)) {
      console.log("Moving ",c.collectionName);
      await moveDocuments(c,tests,{},100);
      await c.drop();
    }
  }
};

module.exports = concat_databases;

// // main
// database.attach_to_database()
//    .then(main);
