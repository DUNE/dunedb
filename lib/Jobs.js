
const database = require("./database.js");
const ObjectID = require('mongodb').ObjectID;

module.exports = {
	getJobData,
	saveJobData,
  listRecentJobs,
  listUserDrafts,
  deleteDraft
}


async function getJobData(record_id)
{
  console.log("getJobData",record_id);
  var record = await db.collection('jobs').findOne({_id: new ObjectID(record_id)});
  return record;
}


// FIXME: this is a dupe of Tests. Need to unify code.
async function saveJobData(record, ip, user)
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

  console.log("saveJobData",record.form_id,record.state);
  
  var result;
  var draft_id = record._id;

  if(record.state == "draft" && record._id) {
    // replace with updated draft.
    record._id = ObjectID(record._id);
    var result = await db.collection('jobs').replaceOne({_id: ObjectID(draft_id)}, record);
    if(result.modifiedCount!=1) throw ("Update draft job document failed.");
    console.log("updated record id",record._id)
    return record._id;
  } else {
    delete record._id;
    var result = await db.collection('jobs').insertOne(record);
    console.log("inserted record id",result.ops[0]._id);
    // delete in the background if there was a draft.
    if(draft_id) db.collection('jobs').deleteOne({_id:ObjectID(draft_id), state:"draft"},
                                                    function(){console.log("deleted draft "+draft_id)});
    return result.ops[0]._id;
  }
}


async function listRecentJobs(form_id,N)
{

  N = N || 30;
  var query = {state:'submitted'};
  if(form_id) query.form_id = form_id;
  var p = await db.collection("jobs")
                    .find(query)
                    .sort({ 'insertDate': -1 })
                    .limit(N)
                    .project( {form_id: 1, "form.form_title":1, insertDate: 1, user:1} )
                    .toArray();
    console.log("listRecentJobs",p)
    return p;
}



async function listUserDrafts(user_id)
{
  var query = {"state": "draft"};
  if(user_id) query["user.user_id"] = user_id;
  var p = await db.collection("jobs")
                    .find(query)
                    .project({form_id: 1, "form.form_title": 1, "data.componentUuid": 1, insertDate:1, user:1, _id:1})
                    .toArray();

    console.log("listUserJobs",user_id||"all",":");
    console.dir(p);
    return p;
}

async function deleteDraft(record_id)
{
  // caller should check authorization
  return await db.collection("jobs").deleteOne({_id: ObjectID(record_id), state:'draft'});
}

