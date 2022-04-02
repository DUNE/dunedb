
'use strict';

const commonSchema = require("lib/commonSchema.js");
const { db } = require("./db");
const logger = require('./logger');
const Forms = require("lib/Forms.js");
const ObjectID = require('mongodb').ObjectID;
const permissions = require('lib/permissions.js');

var MUUID = require('uuid-mongodb');
module.exports = function(type) {return new TestsModule(type)};

function TestsModule()
{
  this._type = 'test';
  this._collection = 'tests';
  this._formCollection = 'testForms';
}


TestsModule.prototype.save = async function(input, req)
{
  /// Usage:
  ///   Tests.save(input, req)
  ///
  /// The 'input' must contain the following fields at minimum:
  ///   _id          : 24 character test ID
  ///   formId       : test type form ID
  ///   componentUuid: full 36 character UUID
  ///   data         : test information entered by the user
  ///   metadata     : submission metadata
  ///
  /// The 'req' must be a valid Express request, including 'user' and 'ip' fields
  /// These fields will be used to populate the test's 'insertion' field
  
  if(!input)
  {
    throw new Error("Tests::save() - the 'input' object has not been specified!");
  }
  
  if(!input.formId)
  {
    throw new Error("Tests::save() - the test type form ID has not been specified!");
  }
  
  if(!input.data)
  {
    throw new Error("Tests::save() - input data has not been specified!");
  }
  
  var list = await Forms.list(this._formCollection);
  var formInfo = list[input.formId];
  
  if(!formInfo)
  {
    throw new Error("Tests:save() - the formId: " + input.formId + " does not match a known test type form!");
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
      throw new Error("Tests::save() - the formObjectId: " + input.formObjectId + " is not consistent with a formId-like object!");
    }
  }
  
  if(!input.formName)
  {
    record.formName = formInfo.formName;
  }
  
  if(!input.componentUuid)
  {
    throw new Error("Tests::save() - the component UUID has not been specified!");
  }
  
  record.componentUuid = MUUID.from(input.componentUuid); 
  record.recordType = this._type;
  record.insertion = commonSchema.insertion(req);
  record.state = record.state || 'submitted';
  
  if(!permissions.hasPermission(req, 'tests:submit'))
  {
    throw new Error("Tests::save() - you don't have permission [tests:submit] to submit tests!");
  }
  
  var result;
  var draft_id = input._id;
  
  if(input.state === "draft" && draft_id)
  {
    record._id = ObjectID(draft_id);
    
    var old = await this.retrieve(record._id);
    
    if(old.state !== "draft")
    {
      throw new Error("Tests::save() - you are attempting to replace the final submission of a test (the current state is 'submitted')!");
    }
    
    var result = await db.collection(this._collection)
                         .replaceOne({_id: ObjectID(draft_id)}, record);
    
    if(result.modifiedCount != 1)
    {
      throw new Error("Tests::save() - failed to update draft test in the database!");
    }
    
    return record._id;
  }
  else
  {
    delete record._id;
    
    var result = await db.collection(this._collection)
                         .insertOne(record);
    
    if(result.insertedCount != 1)
    {
      throw new Error("Tests::save() - failed to insert a new test record into the database!");
    }
    
    if(draft_id)
    {
      this.deleteDraft(draft_id);
    }
    
    return result.ops[0]._id;
  }
}


TestsModule.prototype.retrieve = async function(testId, projection)
{
  /// Usage:
  ///   Tests.retrieve(testId [, projection])
  ///
  /// Example projection:
  ///   "insertion.insertDate": {$lte: rollbackDate}
  
  var query = {_id: new ObjectID(testId)};
  
  var options = {};
  
  if(projection)
  {
    options.projection = projection;
  }
  
  var res = await db.collection(this._collection)
                    .findOne(query, options);
                    
  res.componentUuid = MUUID.from(res.componentUuid).toString();

  return res;
}


TestsModule.prototype.retrieveBulk = async function(testIds, projection)
{
  /// Usage:
  ///   Tests.retrieveBulk(testIds [, projection])
  ///
  /// Example projection:
  ///   "insertion.insertDate": {$lte: rollbackDate}
  
  var objIds = [];
  
  for(var r of testIds)
  {
    objIds.push(new ObjectID(r));
  }
  
  var options = {};
  
  if(projection)
  {
    options.projection = projection;
  }
  
  var records = await db.collection(this._collection)
                        .find({_id: {$in: objIds}}, options)
                        .toArray();
  
  for(var rec of records)
  {
    rec.componentUuid = MUUID.from(rec.componentUuid).toString();
  }
  
  return records;
}


TestsModule.prototype.copyToDraft = async function(testId, req)
{
  /// Usage:
  ///   Tests.copyToDraft(testId, req)
  
  var oldtest = await this.retrieve(testId);
  
  var newtest = {data: {...oldtest.data}};
  newtest.formId = oldtest.formId;
  newtest.formName = oldtest.formName;
  newtest.formObjectId = oldtest.formObjectId;
  newtest.componentUuid = oldtest.componentUuid;
  newtest.copiedFrom = testId;
  newtest.state = "draft";

  return await this.save(newtest, req);
}


TestsModule.prototype.listUserDrafts = async function(user_id)
{
  /// Usage:
  ///   Tests.listUserDrafts(userId)
  
  var query = {"state": "draft"};
  
  if(user_id)
  {
    query["insertion.user.user_id"] = user_id;
  }
  
  var p = await db.collection(this._collection)
                  .aggregate([ {'$match' : query},
                               {'$sort'  : {'insertion.insertDate': -1}},
                               {'$lookup': {from        : this._formCollection,
                                            localField  : "formObjectId",
                                            foreignField: "_id",
                                            as          : "form"}} ])
                  .toArray();

  return p;
}


TestsModule.prototype.deleteDraft = async function(testId)
{
  /// Usage:
  ///   Tests.deleteDraft(testId)
  
  var query = {_id  : ObjectID(testId),
               state: 'draft'};
  
  return await db.collection(this._collection)
                 .deleteOne(query);
}


TestsModule.prototype.listRecent = async function(formId, limit, skip)
{
  /// Usage:
  ///   Tests.listRecent(formId [, limit, skip])
  ///
  /// Options:
  ///   skip  : number of listed jobs to ignore
  ///   limit : maximum number of listed jobs to display
  
  limit = limit || 30;
  skip = skip || 0;
  
  var query = {state: 'submitted'};
  
  if(formId)
  {
    query.formId = formId;
  }
  
  var p = await db.collection(this._collection)
                  .aggregate([{'$match'  : query},
                              {'$sort'   : {'insertion.insertDate': -1}},
                              {'$limit'  : limit},
                              {'$skip'   : skip},
                              {'$project': {formId       : 1, 
                                            formObjectId : 1, 
                                            componentUuid: 1,
                                            insertDate   : '$insertion.insertDate', 
                                            user         : '$insertion.user'}}])
                  .toArray();

  var forms = await Forms.list(this._formCollection);
  
  for(var form of p)
  {
    var info = forms[form.formId];
    
    if(info)
    {
      form.formName = info.formName;
      form.info = info;
    }
    else
    {
      form.formName = "UNNAMED FORM";
      form.info = {};
    }
  }
  
  return p;
}


TestsModule.prototype.listComponentTests = async function(componentUuid, formId)
{
  /// Usage:
  ///   Tests.listComponentTests(componentUuid [, formId])
  ///
  /// Note: this differs from the 'getRecentComponentTests' functions by getting all tests (across all types) that have been performed on a particular component
  
  var query = {"componentUuid": MUUID.from(componentUuid),
               "state"        : "submitted"};
  
  if(formId)
  {
    query.formId = formId;
  }
  
  var p = await db.collection(this._collection)
                  .aggregate([ {'$match'  : query},
                               {'$sort'   : {'insertion.insertDate': -1}},
                               {'$project': {formId      : 1,
                                             formObjectId: 1,
                                             forms       : 1, 
                                             insertion   : true,
                                             _id         : true}} ])
                  .toArray();
  
  var formInfo = await Forms.list(this._formCollection);
  
  for(var form of p)
  {
    form.formName = formInfo[form.formId].formName;
    form.info = formInfo[form.formId]
  }
  
  return p;
}


TestsModule.prototype.getRecentComponentTests = async function(componentUuid)
{
  /// Usage:
  ///   Tests.getRecentComponentTests(componentUuid)
  ///
  /// Note: this differs from the 'listComponentTests' function by getting only the most recent test of each type that has been performed on a particular component
  
  var query = {"componentUuid": MUUID.from(componentUuid),
               "state"        : "submitted"};
  
  var p = await db.collection(this._collection)
                  .aggregate([ {'$match'      : query},
                               {'$sort'       : {'insertion.insertDate': -1}},
                               {'$group'      : {_id       : "$formId",
                                                 latestTest: {"$first": "$$CURRENT"}}},
                               {'$replaceRoot': {'newRoot': "$latestTest"}} ])
                  .toArray();
  
  return p;
}


TestsModule.prototype.autocompleteId = async function(id_string, formId, limit)
{
  /// Usage:
  ///  Tests.autocompleteId(ID, formId, limit)
  ///
  /// Options:
  ///  ID     - test ID string to match to
  ///  formId - test type form ID to limit the matching to
  ///  limit  - maximum number of matched test IDs to display
  ///
  /// This function is only used by the test ID autocomplete route
  
  limit = limit || 10;
  
  var q     = id_string.replace(/[_-]/g, '');
  var qlow  = q.padEnd(24, '0');
  var qhigh = q.padEnd(24, 'F');
  
  var bitlow  = ObjectID(qlow);
  var bithigh = ObjectID(qhigh);
  
  var query = {_id: {$gte: bitlow,
                     $lte: bithigh}};
  
  if(formId)
  {
    query.formId = formId;
  }

  var matches = await db.collection(this._collection)
                        .find(query)
                        .project({"_id"          : 1,
                                  "componentUuid": 1,
                                  "formId"       : 1})
                        .limit(limit)
                        .toArray();
  
  for(var m of matches)
  {
    m.componentUuid = MUUID.from(m.componentUuid).toString();
  }
  
  return matches;
}


TestsModule.prototype.search = async function(txt, match, limit, skip)
{
  /// Usage:
  ///  Tests.search(txt, match [, limit, skip]
  ///
  /// Either 'txt' (a text search) or 'match' (a specific DB entry to search for) should be provided
  /// Optional arguments are:
  ///   limit: maximum number of found tests to display
  ///   skip : number of found tests to ignore
  
  var matchobj = {...match} || {};
  
  if(matchobj.componentUuid)
  {
    matchobj.componentUuid = MUUID.from(matchobj.componentUuid)
  }
  
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
                                  {$project: {_id          : 1,
                                              recordType   : 1,
                                              formId       : 1,
                                              name         : "$formId",
                                              insertion    : 1,
                                              componentUuid: 1,
                                              score        : {$meta: "textScore"}}} ])
                     .toArray();
  }
  else
  {
    result = await db.collection(this._collection)
                     .aggregate([ {$match  : matchobj},
                                  {$sort   : {"insertion.insertDate": -1}},
                                  {$limit  : limit},
                                  {$skip   : skip},
                                  {$project: {_id          : 1,
                                              recordType   : 1,
                                              formId       : 1,
                                              name         : "$formId",
                                              insertion    : 1,
                                              componentUuid: 1}} ])
                     .toArray();
  }
  
  var output = [];
  
  for(var el of result)
  {
    var o = {...el};
    o.componentUuid = MUUID.from(el.componentUuid).toString();
    o.route = '/' + this._type + '/' + o._id.toString();
    
    output.push(o);
  }
  
  return output;
}

