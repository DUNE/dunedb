"use strict";

const chalk = require('chalk');
var express = require('express');
//const { db } = require('lib/db'); // Exports global 'db' variable
const { db } = require('./db');
const logger = require('./logger');
var permissions = require('lib/permissions.js');
var commonSchema = require('lib/commonSchema.js');
var MUUID = require('uuid-mongodb');
var {ObjectID} = require('mongodb');
var jsondiffpatch = require('jsondiffpatch');
var moment = require('moment');
var dbLock = require("lib/dbLock.js");

module.exports = {
  retrieve,
  save,
  list,
  getFormVersions,
  tags
}

//
// Form_i
async function save(input,collection,req)
{
  // required:
  // input: {
  //   formId: <string>,
  //   formName: <string>
  //   schema: <string>,
  //   validity: {} // optional
  // }
  //
  // req must contain user and ip fields.
  //
  // collection is a string that indicates which collection this is.

  if(!input) throw new Error("No input given to saveForm");
  if(!input.formId) throw new Error("No formId given to saveForm")
  if(!input.formName) throw new Error("No formName given to saveForm")
  if(!input.schema) throw new Error("No schema given to saveForm")

  // Esure permissions.
  if(!permissions.hasPermission(req,'forms:edit'))  throw new Error("You don't have permission to edit forms.");


  var formId = input.formId;


  var _lock = await dbLock("saveForm-"+formId,1000);
  var old = await retrieve(collection,formId);


  var record = {...input};
  record.formId = formId;
  record.recordType = "form"; // required
  record.collection = collection;
  record.insertion = commonSchema.insertion(req);
  record.validity = commonSchema.validity(old);
  record.validity.ancestor_id = record._id;
  record.tags = record.tags || [];
  delete record._id;


  var result = await db.collection(collection).insertOne(record);
  _lock.release();
  // logger.info('new form record result',result);
    // Get it from the DB afresh.
  if(result.insertedCount !== 1) throw new Error("Could not insert new form record.");
  logger.info('new form record',result.ops[0]);
  Cache.invalidate("formlist_"+collection);
  Cache.invalidate("all_tags");

  return result.ops[0];
}

// Get current form. Caller must have try/catch block.
async function retrieve(collection,formId,options){ 
	// options can have:
	// rollbackDate: <Date object> rollback to things inserted before this date 
	// 	i.e. show me results as though DB had not been touched since that date
	// onDate - Rollback to things that happened before this time 
	//	 i.e. show me results that should be valid on that date (although data may have been retroactively entered)
	// version - roll form back to this version
	// logger.info("Forms::retrieve()",...arguments);
	// collection = collection; // collection no longer optional

	var col  = db.collection(collection);

	options = options || {}; // blank object.
  if(!formId && !options.id) throw new Error("No formId or formRecordId provided to Forms::retrieve()");
  var query = {};
  if(formId) query.formId = formId;

	if(options.rollbackDate) query["insertion.insertDate"] = {$lt: options.rollbackDate};  // rollback to things inserted before this time
	if(options.onDate) query["validity.startDate"] = {$lt: new Date(options.onDate)}; // rollback to things that happened before this time
	// else               query["validity.startDate"] = {$lt: new Date()}; // rollback to things that happened before this time
  if(options.version) query["validity.version"] = options.version; // rollback to things that happened before this time
  if(options.id) query["_id"] = ObjectID(options.id); // A specific instance.

  logger.info(chalk.blue("Forms::retrieve()  Requesting schema for",...arguments,JSON.stringify(query,null,2)));

	var rec = await col.find(query).sort({"validity.version":-1}).limit(1).toArray();
	// logger.info("rec",rec);
	if(rec.length<1) return null;
	// if(rec) logger.info(chalk.blue("Found it"));
	return rec[0];
}

async function getFormVersions(collection,formId)
{
  // Return list of versions of this form.  
  var vs = await db.collection(collection)
                         .find({"formId":formId, version: {$exists: true}})
                         .project({version:1}).toArray();
  return vs.map(a=>a.version);
}


const Cache = require("lib/Cache.js");

function getFormList(collection) {
  return async function() {
        var pipeline = [];
        pipeline.push({ $sort:{  "validity.version" : -1 } });
        var grouping =     { $group: {_id: "$formId" ,
                                    formId:         { "$first":  "$formId" },
                                    formName:       { "$first":  "$formName" },
                                    formObjectId:   { "$first": "$_id" },
                                    tags:           {"$first": "$tags"},
                                    componentTypes: {"$first": "$componentTypes"}, // actions and workflows only
                                    description: {"$first": "$description"},  // workflows only
                                    path: {"$first": "$path"},  // workflows only
                                  }
                                }
        if(collection=='componentForms') delete grouping["$group"].componentTypes;
        if(collection!='workflowForms') delete grouping["$group"].description;
        if(collection!='workflowForms') delete grouping["$group"].path;
        pipeline.push(grouping);

         var forms = await db.collection(collection)
                            .aggregate(pipeline)
                            .toArray();

        var o = {};
        for(var item of forms)  {
          o[item.formId] = item;
        }

        return o;
  }
}

Cache.add("formlist_componentForms",getFormList("componentForms")); 
Cache.add("formlist_actionForms",getFormList("actionForms")); 
Cache.add("formlist_workflowForms",getFormList("workflowForms")); 


async function list(collection)
{ 
  // Cache.invalidate("formlist_"+collection);
  var retval = await Cache.current("formlist_"+collection);
  // logger.info(retval,"Forms::list()"+collection);
  //   );
  return retval;
}




Cache.add("all_tags",async function() {
    // Simultaneous queries. Fun!
    var tags_lists = await Promise.all([
          db.collection("componentForms").distinct("tags"),
          db.collection("actionForms").distinct("tags"),
          db.collection("workflowForms").distinct("tags"),
        ]);
    // This gives three arrays of results. we want to concatenate
    // and take only unique values. Turn each array element into a key.
    var tokens = {};
    for(var arr of tags_lists)
      tokens = arr.reduce((acc,curr)=> (acc[curr]=1,acc),tokens);
    delete tokens.Trash;
    logger.info("all_tags run");
    logger.info("all_tags",JSON.stringify(tags_lists));
    logger.info("tags:",Object.keys(tokens))
    return Object.keys(tokens);
});


async function tags()
{
  return await Cache.current("all_tags");
}


