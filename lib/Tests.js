
'use strict';

const commonSchema = require("lib/commonSchema.js");
const database = require("lib/database.js");
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
  
  var query = {_id: ObjectID(testId),
               state:'draft'};
  
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
  // Get the actual test records.  Return one record per type of test, giving back only 
  // the most recent iteration of each test.
  var alltests = await this.listComponentTests(componentUuid);
  // find the ones we want
  var testIds = [];
  var query = {"componentUuid": MUUID.from(componentUuid),
             "state" : "submitted"};
  var p = await db.collection(this._collection).aggregate(
                [ { '$match' : query },
                  { '$sort' : { 'insertion.insertDate': -1 } },
                  { '$group': {_id: "$formId", latestTest:{ "$first": "$$CURRENT"}}},
                  { '$replaceRoot' : {'newRoot': "$latestTest"} }
                ])
    .toArray();
  return p;
}


// for the Autocomplete Route
TestsModule.prototype.findTestIdStartsWith = async function(id_string,formId,max)
{
  // binary version.
  max = max || 10;

  // sanitize string of all extra characters.
  var q = id_string.replace(/[_-]/g,'');

  // pad with zeroes and "F"s.
  var qlow = q.padEnd(24,'0');
  var qhigh = q.padEnd(24,'F');
  // logger.info(qlow,qhigh);
  var bitlow = ObjectID(qlow);
  var bithigh =  ObjectID(qhigh);
  
  var query = {_id:{$gte: bitlow, $lte: bithigh}};
  if(formId) query.formId = formId;

  // logger.info(qlow,qhigh,bitlow,bithigh);
  logger.info(query,"QfindTestIdStartsWith");
 
  var matches = await db.collection("tests")
    .find(query)  // binary ObjectIds only
    .project({"_id":1, 'componentUuid':1, 'formId':1})
    .limit(max)
    .toArray();
  // if(matches.length>=max) return new Error("Too many entries"); // too many!
  for(var m of matches) {
    try {  m.componentUuid = MUUID.from(m.componentUuid).toString(); } catch {};
  }
  return matches;

}


TestsModule.prototype.search = async function(txt,match,limit,skip)
{
  var matchobj= {...match} || {};
  logger.info("TestsModule::search",this._collection,matchobj);
  var result = [];
  if(matchobj.componentUuid) matchobj.componentUuid = MUUID.from(matchobj.componentUuid)
  skip = parseInt(skip); if(isNaN(skip)) skip = 0;
  limit = parseInt(limit); if(isNaN(limit)) limit = 0;

  if(txt) {
    matchobj["$text"] = {$search: txt};
    result= await 
      db.collection(this._collection).aggregate([      
        // { $match: {$text: {$search: txt}}},
        { $match: matchobj },
        { $sort: { score:{$meta:"textScore"}, "insertion.insertDate": -1 } },
        { $skip: parseInt(skip) || 0 },
        { $limit: (limit || 100) },
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
        { $sort : {"insertion.insertDate": -1}},
        { $skip: skip || 0 },
        { $limit: (limit || 100) },
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


TestsModule.prototype.retrieveBulk = async function(record_ids,projection)
{
  logger.info("Tests::retrieveBulk() ",this._collection,record_ids);
  var objIds = [];
  for(var r of record_ids) {
    objIds.push(new ObjectID(r));
  }
  var options = {};
  if(projection) options.projection = projection;
  var records = await db.collection(this._collection).find(
    {_id: {$in: objIds}},options).toArray();

  for(var rec of records) 
    rec.componentUuid = MUUID.from(rec.componentUuid).toString();

  return records;
}


TestsModule.prototype.save = async function(input, req)
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
    if(!input.data) throw new Error("saveTestData: no data given");

    var list = await Forms.list(this._formCollection);
    var formInfo = list[input.formId];
    // logger.info("formId",input.formId);
    // logger.info("formInfo",formInfo);
    // logger.info("list",list);
    if(!formInfo) {
        // This form doesn't actually exit.
        throw new Error("saveTestData: '"+input.formId+"' is not a known formId");
        // formInfo = {};
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

    // Ensure componentID in binary form.
    if(this._type === "test") {
        if(!input.componentUuid) throw new Error("Tests::save() No componentUuid provided.");
        record.componentUuid = MUUID.from(input.componentUuid);
    } 
    record.recordType = this._type; // required
    // logger.info('req.user',req.user);
    record.insertion = commonSchema.insertion(req);

    // metadata.
    record.state = record.state || 'submitted'; // ensure 'state' is set.
    // logger.info("Tests::save()",record.formId,record.state);

    if(!permissions.hasPermission(req,this._collection+':submit'))  throw new Error("You don't have permission to edit forms.");
    
    var result;
    var draft_id = input._id;

    // If it's a draft and already has a record number, replace it.
    if(input.state === "draft" && draft_id) {
      // replace with updated draft.
      record._id = ObjectID(draft_id);
      var old = await this.retrieve(record._id);
      if(old.state !== "draft") throw new Error("Attempted to replace final submission of a form.")
      var result = await db.collection(this._collection).replaceOne({_id: ObjectID(draft_id)}, record);
      if(result.modifiedCount!=1) throw new Error("Update draft test document failed.");
      logger.info("updated record id",record._id)
      return record._id;
    } else
    {
      delete record._id;
      var result = await db.collection(this._collection).insertOne(record);
      logger.info("inserted record id",result.ops[0]._id);
      // delete in the background if there was a draft.
      if(draft_id) this.deleteDraft(draft_id).then(
        ()=>{logger.info("deleted draft "+draft_id);});
      return result.ops[0]._id;
    }
}

