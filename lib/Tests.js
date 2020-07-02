"use strict";

const database = require("./database.js");
const ObjectID = require('mongodb').ObjectID;
const commonSchema = require("./commonSchema");
const permissions = require('./permissions');


module.exports = {
	save,
  retrieve,
  listComponentTests,
  listRecentTests,
  listUserDrafts,
  deleteDraft,
}

var _type = "test";
var _collection = 'tests';
var _formCollection = 'testForms';

async function save(input, req)
{
  // Save. The input object should be as the schema:
  //  
  // supplied by caller:

  // componentUuid,  // BSON component UUID. Required for 'test', should not be there for 'job'
  // formId: <string>, 
  // formRecordId: <ObjectId>,  // objectID of the form record used.
  // state: <string>         // Required. "submitted" for final data, "draft" for a draft verison.
  //                         // Also reserved: 'trash'
  // data: { ...  }      // actual test data. (Also contains uuid?)
  // metadata: { ... }   // optional, Formio stuff.

  // supplied by API:
  //{}
  // _id: <ObjectId>,    // Auto-set by Mongo, Includes insertion timestamp redundantly.
  // recordType: <string>   //  "test" or "job" respectively
  // insertion: <insertion block>

  // Returns the ObjectID of the saved record.
  //
  // req must contain user and ip objects.

  if(!input) throw new Error("saveTestData: no input data provided");
  if(!input.formId) throw new Error("saveTestData: formId not defined");
  if(!input.formName) throw new Error("saveTestData: formName not defined");
  // Ensure ObjectID typing:
  input.formObjectId = new ObjectID(input.formObjectId);
  if(!ObjectID.isValid(input.formObjectId) ) throw new Error("saveTestData: formObjectId not correctly");
  if(!input.data) throw new Error("saveTestData: no data given");

  if(_type === "test" && !input.componentUuid) throw new Error("Tests::save() No componentUuid provided.")
  var record = {...input};
  record.recordType = _type; // required
  console.log('req.user',req.user);
  record.insertion = commonSchema.insertion(req);

  // metadata.
  record.state = record.state || 'submitted'; // ensure 'state' is set.
  console.log("Tests::save()",record.formId,record.state);

  if(!permissions.hasPermission(req,'tests:submit'))  throw new Error("You don't have permission to edit forms.");
  
  var result;
  var draft_id = input._id;

  // If it's a draft and already has a record number, replace it.
  if(input.state == "draft" && draft_id) {
    // replace with updated draft.
    record._id = ObjectID(draft_id);
    var old = await retrieve(record._id);
    console.log("old",old)
    if(old.state !== "draft") throw new Error("Attempted to replace final submission of a form.")
    var result = await db.collection(_collection).replaceOne({_id: ObjectID(draft_id)}, record);
    if(result.modifiedCount!=1) throw new Error("Update draft test document failed.");
    console.log("updated record id",record._id)
    return record._id;
  } else {
    delete record._id;
    var result = await db.collection(_collection).insertOne(record);
    console.log("inserted record id",result.ops[0]._id);
    // delete in the background if there was a draft.
    if(draft_id) deleteDraft(draft_id).then(
      ()=>{console.log("deleted draft "+draft_id);});
    return result.ops[0];
  }
}

async function retrieve(record_id)
{
  console.log("Tests::retrieve() ",record_id);
  var record = await db.collection(_collection).findOne({_id: new ObjectID(record_id)});
  return record;
}


async function listRecentTests(formId,N)
{

  N = N || 30;
  var query = {state:'submitted'};
  if(formId) query.formId = formId;
  var p = await db.collection(_collection).aggregate(
                          [ { '$match' : query },
                            { '$sort' : { 'insertion.insertDate': -1 } },
                            { '$limit' : N },
                            { '$lookup': {
                                          from: _formCollection,
                                          localField: "formObjectId",
                                          foreignField: "_id",
                                          as: "form"   
                                         }},
                            { '$project' : {formId: 1, formName: '$form[0].formName', insertDate: '$insertion.insertDate', user:'$insertion.user'}}
                          ])
          .toArray();
  // var p = await db.collection(_collection)
  //                   .find(query)
  //                   .sort({ 'insertion.insertDate': -1 })
  //                   .limit(N)
  //                   .project( {formId: 1, "form.form_title":1, insertDate: 1, user:1} )
  //                   .toArray();
    console.log("listRecentTests",p)
    return p;
}


async function listComponentTests(componentUuid, formId)
{
  var query = {"componentUuid": componentUuid,
               "state" : "submitted"};
  if(formId) query.formId = formId;
  var p = await db.collection(_collection).aggregate(
                          [ { '$match' : query },
                            { '$sort' : { 'insertion.insertDate': -1 } },
                            { '$lookup': {
                                          from: _formCollection,
                                          localField: "formObjectId",
                                          foreignField: "_id",
                                          as: "form"   
                                         }},
                            // { '$project' : {formId: 1, formName: '$form[0].formName', insertDate: '$insertion.insertDate', user:'$insertion.user', _id: true}}
                          ])
          .toArray();

    console.log("peformed of type",formId||"all",":");
    console.log(JSON.stringify(p,null,2));
    return p;
}

async function listUserDrafts(user_id)
{
  var query = {"state": "draft"};
  if(user_id) query["insertion.user.user_id"] = user_id;
  var p = await db.collection(_collection).aggregate(
                          [ { '$match' : query },
                            { '$sort' : { 'insertion.insertDate': -1 } },
                            { '$lookup': {
                                          from: _formCollection,
                                          localField: "formObjectId",
                                          foreignField: "_id",
                                          as: "form"   
                                         }},
                            // { '$project' : {formId: 1, formName: '$form[0].formName', insertDate: 'insertion.insertDate', user:'insertion.user'}}
                          ])
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