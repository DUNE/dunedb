
const database = require("./database.js");
const ObjectID = require('mongodb').ObjectID;

module.exports = {
	getTestData,
	saveTestData,
  listComponentTests,
  listRecentTests
}


async function getTestData(form_id, record_id)
{
  var form_name = 'form_'+form_id.replace(/[^\w]/g,'');
  var col = db.collection(form_name);
  var data = await col.findOne({_id: new ObjectID(record_id)});
  console.log('getTestData',form_id, new ObjectID(record_id), data);
  return data;
}

async function saveTestData(form_id, testdata, ip, user)
{
  // Save. The testdata object should be: 
  //{ 
  //  data: <the submitted data>,
  //  metadata: <form submission metatadata from formio>, optional
  //}
  // User is the user profile record from req.user.
  // IP is the IP address
  // 
  // Returns the ObjectID of the saved record.
  //
  // assumes permissions have been dealt with by caller.

  console.log("saveTestData",form_id);

  // Generate an ID number for this record.  Usually, the driver does this, but we're going to do it manually.
  // First, is this a re-save or re-submission? If not, generate a testId.

  // What I really want is for the most recent test to have testId == _id, because that's easy to search for.
  // So:
  // Copy current version of record to new ID
  // Insert new version under the current ID
  var form_name = 'form_'+form_id.replace(/[^\w]/g,'');
  var col = db.collection(form_name);

    // ******FIXME HERE
   if(testdata.testId) {
    // This is not our first submission of this test record.
    // Find the current one, if any, and move it to a new record.
    var retval =  await col.findOne({_id: ObjectId(testdata.testId)})
                         .forEach(function(err,doc) {
                            delete doc._id;
                            col.insertOne(doc);
                           });
    console.log("moved testId",testdata.testId,"retval",retval);
  } else {
    testdata.testId = ObjectID();
    testdata._id = ObjectID(testdata.testId);
  }

  // metadata.
  testdata.form_id = form_id;
  testdata.insertDate= new Date();
  testdata.ip = ip;
  testdata.user = user;
  var result = await col.insertOne(testdata);
  console.log('  result',result.ops);
  return result.ops[0]._id;
}


async function listRecentTests(form_id,N)
{

  N = N || 10;

  var p = await db.collection("form_"+form_id)
                    .find({state:'submitted'})
                    .sort({ $natural: -1 })
                    .limit(N)
                    .project( {insertDate: 1, user:1} )
                    .toArray();
    console.log("listRecentTests",p)
    return p;
}


async function listComponentTests(form_id,componentUuid)
{
      var p = await db.collection("form_"+form_id)
                    .aggregate([
                      {$match: {"data.componentUuid":componentUuid}},
                      {$sort: {_id: -1}},
                      {$group: {_id:  "$testId",
                                insertDate: {$last: "$insertDate"},
                                user:       {$last: "$user"}
                              }
                      }
                    ]).toArray();

    // var p = await db.collection("form_"+form_id)
    //                 .find({$and: [
    //                               {"data.componentUuid":componentUuid},
    //                               {$expr: {$eq: ["$testId","$_id"]}}
    //                               ]}
    //                 )
    //                 // .find({"data.componentUuid":componentUuid})
    //                 .project({form_id:1, form_title:1, insertDate:1, user:1})
    //                 .toArray();
    console.log("peformed of type",form_id,":");
    console.dir(p);
    return p;
}
