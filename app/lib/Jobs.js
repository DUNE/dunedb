
'use strict';

const commonSchema = require("lib/commonSchema.js");
const { db } = require("./db");
const logger = require('./logger');
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


JobsModule.prototype.save = async function(input, req)
{
  /// Usage:
  ///   Jobs.save(input, req)
  ///
  /// The 'input' must contain the following fields at minimum:
  ///   jobId        : 24 character job ID
  ///   formId       : job type form ID
  ///   data         : job information entered by the user
  ///   metadata     : submission metadata
  ///
  /// The 'req' must be a valid Express request, including 'user' and 'ip' fields
  /// These fields will be used to populate the job's 'insertion' field
  
  if(!input)
  {
    throw new Error("Jobs::save() - the 'input' object has not been specified!");
  }
  
  if(!input.formId)
  {
    throw new Error("Jobs::save() - the job type form ID has not been specified!");
  }
  
  if(!input.data)
  {
    throw new Error("Jobs::save() - input data has not been specified!");
  }
  
  var list = await Forms.list(this._formCollection);
  var formInfo = list[input.formId];
  
  if(!formInfo)
  {
    throw new Error("Jobs:save() - the formId: " + input.formId + " does not match a known job type form!");
  }

  var record = {...input};

  if(!input.formObjectId)
  {
    record.formObjectId = formInfo.formObjectId;
  }
  else
  {
    record.formObjectId = new ObjectID(input.formObjectId);
    
    if(!ObjectID.isValid(record.formObjectId))
    {
      throw new Error("Jobs::save() - the formObjectId: " + input.formObjectId + " is not consistent with a formId-like object!");
    }
  }
  
  if(!input.formName)
  {
    record.formName = formInfo.formName;
  }

  record.jobId = (input.jobId) ? new ObjectID(input.jobId) : new ObjectID();
  record.recordType = this._type;
  record.insertion = commonSchema.insertion(req);
  
  var _lock = await dbLock("saveJob" + record.jobId, 1000);
  var old = null;
  
  if(input.jobId)
  {
    old = await this.retrieve(input.jobId);
  }
  
  record.validity = commonSchema.validity(record.validity, old);
  record.validity.ancestor_id = record._id;
  
  delete record._id;
  
  if(!permissions.hasPermission(req, 'jobs:submit'))
  {
    throw new Error("Jobs::save() - you don't have permission [jobs:submit] to submit jobs!");
  }
  
  var result = await db.collection(this._collection)
                       .insertOne(record);
  _lock.release();
  
  if(result.insertedCount !== 1)
  {
    throw new Error("Jobs::save() - failed to insert a new job record into the database!");
  }
  
  return result.ops[0];
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


JobsModule.prototype.search = async function(txt, match, limit, skip)
{
  /// Usage:
  ///  Jobs.search(txt, match [, limit, skip]
  ///
  /// Either 'txt' (a text search) or 'match' (a specific DB entry to search for) should be provided
  /// Optional arguments are:
  ///   limit: maximum number of found jobs to display
  ///   skip : number of found jobs to ignore
  
  var matchobj = match || {};
  
  limit = parseInt(limit);
  
  if(isNaN(limit))
  {
    limit = 100;
  }

  skip = parseInt(skip);
  
  if(isNaN(skip))
  {
    skip = 0;
  }
  
  var result = [];
  
  if(txt)
  {
    matchobj["$text"] = {$search: txt};
    
    result = await db.collection(this._collection)
                     .aggregate([ {$match  : matchobj},
                                  {$sort   : {score: {$meta: "textScore"},
                                              "insertion.insertDate": -1}},
                                  {$limit  : limit},
                                  {$skip   : skip},
                                  {$project: {_id       : 1,
                                              jobId     : 1,
                                              recordType: 1,
                                              formId    : 1,
                                              name      : "$formId",
                                              insertion : 1,
                                              score     : {$meta: "textScore"}}} ])
                     .toArray();
  }
  else
  {
    result = await db.collection(this._collection)
                     .aggregate([ {$match  : matchobj},
                                  {$sort   : {"insertion.insertDate": -1}},
                                  {$limit  : limit},
                                  {$skip   : skip},
                                  {$project: {_id       : 1,
                                              jobId     : 1,
                                              recordType: 1,
                                              name      : "$formId",
                                              formId    : 1,
                                              insertion : 1}} ])
                     .toArray();
  }
  
  var output = [];
  
  for(var el of result)
  {
    var o = {...el};
    o.route = '/' + this._type + '/' + el.jobId.toString();
    
    output.push(o);
  }
  
  return output;
}

