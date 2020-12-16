"use strict";

const database = require("./database.js");
const ObjectID = require('mongodb').ObjectID;
var MUUID = require('uuid-mongodb');
const commonSchema = require("./commonSchema");
const permissions = require('./permissions');
const Forms = require("./Forms.js");
const dbLock = require("./dbLock.js");

module.exports = function(type) { return new JobsModule(type) };

function JobsModule() {
  this._type == 'job';
  this._collection = "jobs";
  this._formCollection = 'jobForms';
}

JobsModule.prototype.save = async function(input, req)
{
  // Save. The input object should be as the schema:
  //  
  // supplied by caller:
  // jobId: <string or mongo ObjectID> // Optional. If exists, this is an edit to an existing record.
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
  if(!input.data) throw new Error("saveTestData: no data given");

  var list = await Forms.list(this._formCollection);
  var formInfo = list[input.formId];
  // console.log("formId",input.formId);
  // console.log("formInfo",formInfo);
  // console.log("list",list);
  if(!formInfo) {
      // This form doesn't actually exit.
      throw new Error("saveTestData: '"+input.formId+"' is not a known formId");
  }

  var record = {...input};

  if(!input.formObjectId) {
    record.formObjectId = formInfo.formObjectId;
  } else {
    record.formObjectId = new ObjectID(input.formObjectId);
    if(!ObjectID.isValid(record.formObjectId) ) throw new Error("saveTestData: formObjectId not a correct formId");
  }
  if(!input.formName) {
    record.formName = formInfo.formName;
  }

  record.recordType = "job"; // required
  // console.log('req.user',req.user);
  record.insertion = commonSchema.insertion(req);

  // metadata.
  record.state = record.state || 'submitted'; // ensure 'state' is set.
  // console.log("Tests::save()",record.formId,record.state);

  if(!permissions.hasPermission(req,this._collection+':submit'))  throw new Error("You don't have permission to edit forms.");
  
  record.jobId = (input.jobId) ? new ObjectID(input.jobId) : new ObjectID();  // if this is a new job, create a job number.
  var _lock = await dbLock("saveJob"+record.jobId,1000); // lock this record.
  var old = null;
  if(input.jobId) old = await retrieve(input.jobId); 

  record.validity = commonSchema.validity(record.validity, old);
  record.validity.ancestor_id = record._id;
  delete record._id;

  var result = await db.collection(this._collection).insertOne(record);
  _lock.release();
  console.log("inserted record id",result.ops[0]._id);
  // delete in the background if there was a draft.
  return result.ops[0];
    
}

JobsModule.prototype.retrieve = async function(jobId,onDate,rollbackDate,projection)
{
  console.log("JobsModule::retrieve() ",this._collection,jobId);
  if(!jobId) throw new Error("JobsModule::retrieve() no jobId given.");
  var query = {jobId:new ObjectID(jobId)}; // binary form.
  if(rollbackDate) query["insertion.insertDate"] = {$lte: rollbackDate};  // rollback to things inserted before this time
  if(onDate)       query["validity.startDate"] = {$lte: onDate}; // rollback to things that happened before this time
  var options = {};
  if(projection) options.projection = projection;

  var res = await db.collection(this._collection).find(query,options).sort({"validity.startDate":-1,"validity.version":-1}).limit(1).toArray();
  if(res.length<1) return null;
  // console.log('retrieve component',componentUuid, res[0].componentUuid )
  return res[0];
}

JobsModule.prototype.list = async function(match_condition,options)
{
   var aggregation_stages = [];
    if(match_condition)
      aggregation_stages.push( { $match: match_condition }             );
    aggregation_stages.push(   { $sort:{ "validity.startDate" : -1 } } );
    aggregation_stages.push(   { $group: {_id: { jobId : "$jobId" },
                                               jobId: { "$first":  "$jobId" },
                                               formId: { "$first": "$formId"},
                                               formObjectId: { "$first": "$formObjectId"},
                                               user: { "$first" : "$insertion.user" },
                                               type: { "$first":  "$type" },
                                               name: { "$first":  "$data.name" },
                                               state: { "$first": "$state" },
                                               last_edited: { "$first": "$insertion.insertDate" },
                                               created: { "$last": "$validity.startDate" },
                               } } );
    aggregation_stages.push(   { $sort:{ last_edited : -1 } } );
    if(options.second_selection) 
        aggregation_stages.push(   { $match: second_selection } );
    if(options.skip)  
      aggregation_stages.push( { $skip: options.skip } );
    if(options.limit)  
      aggregation_stages.push( { $limit: options.limit } );
    console.dir(aggregation_stages);
    var items = await db.collection("jobs").aggregate(aggregation_stages).toArray();
    console.log(items)
    return items;
}


JobsModule.prototype.copyToDraft = async function(jobId,req)
{
  var oldtest = await this.retrieve(jobId);
  if(!oldtest) throw new Error("No such jobId "+jobId);
  var newtest = {data: {...oldtest.data}};
  newtest.formId = oldtest.formId;
  newtest.formName = oldtest.formName || oldtest.formId;
  newtest.formObjectId = oldtest.formObjectId; // should get overwritten by gui
  newtest.copiedFrom = record_id;
  newtest.state = "draft";

  return await this.save(newtest,req);
}

JobsModule.prototype.listRecent = async function(formId,N,skip)
  {

    N = N || 30;
    skip = skip || 0;
    var query = {state:'submitted'};
    if(formId) query.formId = formId;
    var p = await db.collection(this._collection).aggregate(
                            [ { '$match' : query },
                              { '$sort' : { 'insertion.insertDate': -1 } },
                              { '$skip' : skip },
                              { '$limit' : N },
                              // { '$lookup': {
                              //               from: this._formCollection,
                              //               localField: "formObjectId",
                              //               foreignField: "_id",
                              //               as: "forms"   
                              //              }},
                              { '$project' : {formId: 1, 
                                              formObjectId:1, 
                                              // forms: 1,
                                              // form: {$arrayElemAt: [ "$forms", 0 ]}, 
                                              // formName: {$arrayElemAt: [ "$forms.formName", 0 ] }, 
                                              insertDate: '$insertion.insertDate', 
                                              user:'$insertion.user'}}
                            ])
            .toArray();

    var formInfo = await Forms.list(this._formCollection);
    for(var form of p) {
      form.formName = formInfo[form.formId].formName;
      form.info = formInfo[form.formId]
    }
    // var p = await db.collection(this._collection)
    //                   .find(query)
    //                   .sort({ 'insertion.insertDate': -1 })
    //                   .limit(N)
    //                   .project( {formId: 1, "form.form_title":1, insertDate: 1, user:1} )
    //                   .toArray();
      // console.log("listRecent",p)
      return p;
  }


JobsModule.prototype.listUserDrafts = async function(user_id)
{
  return this.list({"insertion.user.user_id": user_id},{},{state:"draft"});
}

// JobsModule.prototype.deleteDraft = async function(record_id)
// {
//     // caller should check authorization
//     return await db.collection(this._collection).deleteOne({_id: ObjectID(record_id), state:'draft'});
// }

JobsModule.prototype.search = async function(txt,match,limit,skip)
{
  var matchobj= match || {};
  console.log("JobsModule::search",this._collection,matchobj);
  var result = [];
  if(txt) {
    matchobj["$text"] = {$search: txt};
    result= await 
      db.collection(this._collection).aggregate([      
        // { $match: {$text: {$search: txt}}},
        { $match: matchobj },
        { $sort: { score:{$meta:"textScore" } } },
        { $limit: (limit || 100)+(skip||0) },
        { $skip: skip || 0 },
        { $project: { _id:1,
                      recordType:1,
                      formId:1,
                      name:"$formId",
                      insertion:1,
                      componentUuid:1,
                      score: {$meta:"textScore"}
                    }},
      ]).toArray();
    } else {
      result= await 
        db.collection(this._collection).aggregate([      
        { $match: matchobj },
        { $limit: (limit || 100)+(skip||0) },
        { $skip: skip || 0 },
        { $project: { _id:1,
                      recordType:1,
                      name:"$formId",
                      formId:1,
                      insertion:1,
                      componentUuid:1,
                    }},
      ]).toArray();

    }
    var output =[];
    for(var el of result) {
      var o = {...el};
      try{
        o.componentUuid = MUUID.from(el.componentUuid).toString();
      } catch{};
      o.route = "/"+this._type+"/"+el._id.toString();
      output.push(o);
    }
    return output;
}

