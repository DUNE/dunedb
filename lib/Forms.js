"use strict";

const chalk = require('chalk');
var express = require('express');
var database = require('./database.js'); // Exports global 'db' variable
var permissions = require('./permissions.js');
var commonSchema = require('./commonSchema.js');
var MUUID = require('uuid-mongodb');
var {ObjectID} = require('mongodb');
var jsondiffpatch = require('jsondiffpatch');
var moment = require('moment');

module.exports = {
  retrieve,
  save,
  getListOfForms,
  getFormVersions
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
  // collection is a string, ususally "testForms" that indicates which collection this is.

  collection = collection || "testForms";
  if(!input) throw new Error("No input given to saveForm");
  if(!input.formId) throw new Error("No formId given to saveForm")
  if(!input.formName) throw new Error("No formName given to saveForm")
  if(!input.schema) throw new Error("No schema given to saveForm")
  var formId = input.formId;
  var old = await retrieve(collection,formId);


  var record = {...input};
  record.formId = formId;
  record.recordType = "form"; // required
  record.collection = collection;
  record.insertion = commonSchema.insertion(req);
  record.validity = commonSchema.validity(record.validity, old);
  delete record._id;

  // Esure permissions.
  if(!permissions.hasPermission(req,'forms:edit'))  throw new Error("You don't have permission to edit forms.");

  var result = await db.collection(collection).insertOne(record);
  console.log('new form record',record);
  // console.log('new form record result',result);
    // Get it from the DB afresh.
  if(result.insertedCount !== 1) throw new Error("Could not insert new form record.");
  Cache.invalidate("formnames_"+collection);

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
	// console.log("Forms::retrieve()",...arguments);
	// collection = collection || "testForms"; // collection no longer optional

	var col  = db.collection(collection);

	options = options || {}; // blank object.
  if(!formId) throw new Error("No formId provided to Forms::retrieve()");
	var query = {formId: formId};
	if(options.rollbackDate) query["insertion.insertDate"] = {$lt: options.rollbackDate};  // rollback to things inserted before this time
	if(options.onDate) query["validity.startDate"] = {$lt: new Date(options.onDate)}; // rollback to things that happened before this time
	// else               query["validity.startDate"] = {$lt: new Date()}; // rollback to things that happened before this time
  if(options.version) query["validity.version"] = options.version; // rollback to things that happened before this time
  if(options.id) query["_id"] = ObjectID(options.id); // A specific instance.

  console.log(chalk.blue("Forms::retrieve()  Requesting schema for",...arguments,JSON.stringify(query,null,2)));

	var rec = await col.find(query).sort({"validity.version":-1}).limit(1).toArray();
	// console.log("rec",rec);
	if(rec.length<1) return null;
	// if(rec) console.log(chalk.blue("Found it"));
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


const Cache = require("../lib/Cache.js");
Cache.add("formnames_testForms",
    async function(){
      var forms = await db.collection("testForms")
                          .aggregate([
                              { $sort:{  "validity.version" : -1 } },
                              { $group: {_id: "$formId" ,
                                  formId: { "$first":  "$formId" },
                                  formName: { "$first":  "$formName" },
                                  tags: {"$first": "$tags"},
                                  componentTypes: {"$first": "$tags"},
                                }
                              }
                          ])
                          .toArray();

      var o = {};
      for(var item of forms)  o[item.formId] = item.formName;
      return o;
  });
Cache.add("formnames_jobForms",
    async function(){
      var forms = await db.collection("jobForms")
                          .aggregate([
                              { $sort:{  "validity.version" : -1 } },
                              { $group: {_id: "$formId" ,
                                  formId: { "$first":  "$formId" },
                                  formName: { "$first":  "$formName" },
                                }
                              }
                          ])
                          .toArray();

      var o = {};
      for(var item of forms)  o[item.formId] = item.formName;
      return o;
  });

Cache.add("formnames_componentForm",
    async function(){
      var forms = await db.collection("componentForm")
                          .aggregate([
                              { $sort:{  "validity.version" : -1 } },
                              { $group: {_id: "$formId" ,
                                  formId: { "$first":  "$formId" },
                                  formName: { "$first":  "$formName" },
                                }
                              }
                          ])
                          .toArray();

      var o = {};
      for(var item of forms)  o[item.formId] = item.formName;
      return o;
  });



async function getListOfForms(collection)
{
  try{
    collection = collection || "testForms";
    return await Cache.current("formnames_"+collection);
    // collection = collection || "testForms";
    // var forms = await db.collection(collection)
    //                         .aggregate([
    //                             { $sort:{  "validity.version" : -1 } },
    //                             { $group: {_id: "$formId" ,
    //                                 formId: { "$first":  "$formId" },
    //                                 formName: { "$first":  "$formName" },
    //                               }
    //                             }
    //                         ])
    //                         .toArray();

    // var o = {};
    // for(var item of forms)  o[item.formId] = item.formName;
    // return o;
	} catch(err) {
		console.error(err);

		return []; 
	}
}





