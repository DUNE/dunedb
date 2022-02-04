
'use strict';

const commonSchema = require("lib/commonSchema.js");
const database = require("lib/database.js");
const dbLock = require("lib/dbLock.js");
const Forms = require("lib/Forms.js");
const ObjectID = require('mongodb').ObjectID;
const permissions = require('lib/permissions.js');

var MUUID = require('uuid-mongodb');
module.exports = function(type) {return new JobsModule(type)};

function JobsModule()
{
  this._type == 'job';
  this._collection = 'jobs';
  this._formCollection = 'jobForms';
}


JobsModule.prototype.retrieve = async function(jobId, projection)
{
  /// Usage:
  ///   Jobs.retrieve(jobId [, projection])
  ///   Jobs.retrieve({jobId: jobId, "validity.version": version} [, projection]) 
  ///
  /// Example projection:
  ///   "insertion.insertDate": {$lte: rollbackDate}
  ///
  /// If no version number is specified, the highest version number will be matched and retrieved
  
  var query = {jobId: jobId};
  
  if(typeof jobId === 'object' && !(jobId instanceof ObjectID))
  {
    query = jobId;
  }
   
  if(!query.jobId)
  {
    throw new Error("JobsModule::retrieve(): no jobId has been given!");
  }
  
  query.jobId = new ObjectID(query.jobId);
  
  var options = {};
  
  if(projection)
  {
    options.projection = projection;
  }

  var res = await db.collection(this._collection)
                    .find(query, options)
                    .sort({"validity.version": -1})
                    .limit(1)
                    .toArray();
  
  if(res.length < 1)
  {
    return null;
  }
  
  return res[0];
}


JobsModule.prototype.versions = async function(jobId)
{
  /// Usage:
  ///   Jobs.versions(jobId)
  
  if(!jobId)
  {
    throw new Error("JobsModule::versions(): no jobId has been given!");
  }
  
  var query = {jobId: new ObjectID(jobId)};
  
  var res =  await db.collection(this._collection)
                     .find(query)
                     .project({_id        : 1,
                               jobId      : 1,
                               "state"    : 1,
                               "validity" : 1,
                               "insertion": 1})
                     .sort({"validity.version": -1})
                     .toArray();
  
  return res;
}


JobsModule.prototype.list = async function(match_condition, options)
{
  /// Usage:
  ///   Jobs.list(match_condition [, options])
  ///
  /// Options:
  ///   second_selection: an additional matching condition
  ///   skip            : number of listed jobs to ignore
  ///   limit           : maximum number of listed jobs to display
  
  var aggregation_stages = [];
  
  if(match_condition)
  {
    aggregation_stages.push({ $match: match_condition });
  }
  
  aggregation_stages.push({ $sort: {"validity.startDate" : -1} });
  aggregation_stages.push({ $group: {_id         : {jobId   : "$jobId"},
                                     jobId       : {"$first": "$jobId"},
                                     formId      : {"$first": "$formId"},
                                     formObjectId: {"$first": "$formObjectId"},
                                     user        : {"$first": "$insertion.user"},
                                     formName    : {"$first": "$formName"},
                                     state       : {"$first": "$state"},
                                     last_edited : {"$first": "$insertion.insertDate"},
                                     created     : {"$last" : "$validity.startDate"}} });
  aggregation_stages.push({ $sort: {last_edited : -1} });
  
  if(options.second_selection)
  {
    aggregation_stages.push({ $match: second_selection });
  }
  
  if(options.skip)
  {
    aggregation_stages.push({ $skip: options.skip });
  }
  
  if(options.limit)
  {
    aggregation_stages.push({ $limit: options.limit });
  }
  
  var items = await db.collection("jobs").aggregate(aggregation_stages).toArray();
  
  return items;
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
  // logger.info("formId",input.formId);
  // logger.info("formInfo",formInfo);
  // logger.info("list",list);
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
  // logger.info('req.user',req.user);
  record.insertion = commonSchema.insertion(req);

  // metadata.
  record.state = record.state || 'submitted'; // ensure 'state' is set.
  // logger.info("Tests::save()",record.formId,record.state);

  if(!permissions.hasPermission(req,this._collection+':submit'))  throw new Error("You don't have permission to edit forms.");
  
  record.jobId = (input.jobId) ? new ObjectID(input.jobId) : new ObjectID();  // if this is a new job, create a job number.
  var _lock = await dbLock("saveJob"+record.jobId,1000); // lock this record.
  var old = null;
  if(input.jobId) old = await this.retrieve(input.jobId); 

  // Unlike components, Jobs do not honor input validty. All validity ranges start at zero.
  record.validity = commonSchema.validity({startDate:new Date(0)}, old);
  record.validity.ancestor_id = record._id;
  delete record._id;

  var result = await db.collection(this._collection).insertOne(record);
  _lock.release();
  logger.info("inserted record id",result.ops[0]._id);
  // delete in the background if there was a draft.
  return result.ops[0];
    
}


JobsModule.prototype.search = async function(txt,match,limit,skip)
{
  var matchobj= match || {};
  logger.info(arguments,"JobsModule::search",this._collection);
  skip = parseInt(skip); if(isNaN(skip)) skip = 0;
  limit = parseInt(limit); if(isNaN(limit)) limit = 100;

  var result = [];
  if(txt) {
    matchobj["$text"] = {$search: txt};
    result= await 
      db.collection(this._collection).aggregate([      
        // { $match: {$text: {$search: txt}}},
        { $match: matchobj },
        { $sort: { "insertion.insertDate": -1} },
        { $sort: { score:{$meta:"textScore" }}},
        { $skip: skip },
        { $limit: limit },
        { $project: { _id:1,
                      jobId:1,
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
        { $sort : {"insertion.insertDate": -1}},
        { $skip: skip  },
        { $limit: limit },
        { $project: { _id:1,
                      jobId:1,
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
      o.route = "/job/"+el.jobId.toString();
      output.push(o);
    }
    return output;
}

