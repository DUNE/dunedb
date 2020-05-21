"use strict";

const database = require("./database.js");
const ObjectID = require('mongodb').ObjectID;

//
// db.tests schema:
//
// _id:             --> ObjectId assigned by mongo, at time of first draft-save
//                      For strict time ordering, use insertDate below.
// form_id:         --> name of the form>   REQUIRED
// form: {          --> Relevant lookup info for the form schema used.>
//    _id:
//    form_id:     
//    form_title:
//    version:
//    effectiveDate:
//    insertDate: 
//  }
//
// data: {            --> The actual payload
//        componentUuid: <hexstring>  --> REQUIRED for test, not for jobs
//       }
// metadata: {}       --> Formio junk. Trash?
// state:             --> Required. "submitted" for final data, "draft" for a draft verison.
//                       Also reserved: 'trash'
//
// Added by Sietch in saveTestData, below:
// insertDate: <     --> timestamp of submission recieved by DB
// user: {
//   user_id:
//   displayName:
//   emails: 
//  } 



module.exports = {
	getTestData,
	saveTestData,
  listComponentTests,
  listRecentTests,
  listUserDrafts,
  deleteDraft,
}


async function getTestData(record_id)
{
  console.log("getTestData",record_id);
  var record = await db.collection('tests').findOne({_id: new ObjectID(record_id)});
  return record;
}


async function saveTestData(record, ip, user)
{
  // Save. The record object should be as the schema above.
  // User is the user profile record from req.user.
  // IP is the IP address
  // 
  // Returns the ObjectID of the saved record.
  //
  // assumes permissions have been dealt with by caller.

  // if record.state is "submit":
  //    insert with new _id
  //    if _id exists in original record, delete any draft with that _id.
  // if record.state is "draft" and id exists, replace it

  // returns the text _id of the inserted record.


  if(!record.form_id) throw("form_id not defined");

  // metadata.
  record.state = record.state || "submitted";
  record.insertDate= new Date();
  record.ip = ip;
  const {user_id, displayName, emails} = user;  // equivalent to user_id = user.user_id, etc
  record.user = {user_id, displayName, emails};  // destructuring verison. I like it.

  console.log("saveTestData",record.form_id,record.state);
  
  var result;
  var draft_id = record._id;

  if(record.state == "draft" && record._id) {
    // replace with updated draft.
    record._id = ObjectID(record._id);
    var result = await db.collection('tests').replaceOne({_id: ObjectID(draft_id)}, record);
    if(result.modifiedCount!=1) throw ("Update draft test document failed.");
    console.log("updated record id",record._id)
    return record._id;
  } else {
    delete record._id;
    var result = await db.collection('tests').insertOne(record);
    console.log("inserted record id",result.ops[0]._id);
    // delete in the background if there was a draft.
    if(draft_id) db.collection('tests').deleteOne({_id:ObjectID(draft_id), state:"draft"},
                                                    function(){console.log("deleted draft "+draft_id)});
    return result.ops[0]._id;
  }
}


async function listRecentTests(form_id,N)
{

  N = N || 30;
  var query = {state:'submitted'};
  if(form_id) query.form_id = form_id;
  var p = await db.collection("tests")
                    .find(query)
                    .sort({ 'insertDate': -1 })
                    .limit(N)
                    .project( {insertDate: 1, user:1} )
                    .toArray();
    console.log("listRecentTests",p)
    return p;
}


async function listComponentTests(componentUuid, form_id)
{
  var query = {"data.componentUuid": componentUuid,
                           "state" : "submitted"};
  if(form_id) query.form_id = form_id;
      var p = await db.collection("tests")
                    .find(query)
                    .project({form_id: 1, "form.form_title": 1, insertDate:1, user:1, _id:1})
                    .toArray();

    console.log("peformed of type",form_id||"all",":");
    console.dir(p);
    return p;
}

async function listUserDrafts(user_id)
{
  var query = {"state": "draft"};
  if(user_id) query["user.user_id"] = user_id;
  var p = await db.collection("tests")
                    .find(query)
                    .project({form_id: 1, "form.form_title": 1, "data.componentUuid": 1, insertDate:1, user:1, _id:1})
                    .toArray();

    console.log("listUserDrafts",user_id||"all",":");
    console.dir(p);
    return p;
}

async function deleteDraft(record_id)
{
  // caller should check authorization
  return await db.collection("tests").deleteOne({_id: ObjectID(record_id), state:'draft'});
}