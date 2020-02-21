
const chalk = require('chalk');
var express = require('express');
var database = require('./database.js'); // Exports global 'db' variable
var permissions = require('./permissions.js');
var MUUID = require('uuid-mongodb');
var jsondiffpatch = require('jsondiffpatch');


module.exports = {
  retrieveForm,
  saveForm,
  getListOfForms,
}

// Get current form. Caller must have try/catch block.
async function retrieveForm(form_id,collection,onDate,rollbackDate) {
	console.log("retrieveForm",...arguments);
	collection = collection || "testForms";
	console.log(chalk.blue("Requesting schema for",collection,form_id));
	var col  = db.collection(collection);

	var query = {form_id: form_id}; // binary form.
	if(rollbackDate) query["submit.insertDate"] = {$lt: rollbackDate};  // rollback to things inserted before this time
	if(onDate) query.effectiveDate = {$lt: onDate}; // rollback to things that happened before this time
	console.log("retrieveForm",...arguments,query);
	var rec = await col.find(query).sort({"version":-1}).limit(1).toArray();
	console.log("rec",rec);
	if(rec.length<1) return null;
	if(rec) console.log(chalk.blue("Found it"));
	return rec[0];
}

async function getListOfForms(collection)
{
	collection = collection || "testForms";
	console.log("getListOfForms",collection);
	try{

	    var forms = await db.collection(collection).aggregate([
		  { $sort:{  "version" : -1 } },
		  { $group: {_id: "$form_id" ,
		             form_id: { "$first":  "$form_id" },
		             form_title: { "$first":  "$form_title" },
		            }
		  }
		]).toArray();
	    console.log(forms);
		return forms;
	} catch(err) {
		console.error(err);

		return []; 
	}
}

async function saveForm(form_id,record,collection,ip,user)
{
  collection = collection || "testForms";
  var old = await retrieveForm(form_id,collection);
  var forms = db.collection(collection);
  // console.log('updateRes',updateRes);
  var new_record = {...record}; // shallow clone

  new_record.insertDate= new Date();
  new_record.submit_ip= ip;
  new_record.user= user;
  new_record.revised_by= (user||{}).displayName;
  new_record.diff_from= old._id;
  new_record.diff = null;
  new_record.diff= jsondiffpatch.diff(old.schema, new_record.schema);
  new_record.version= ((old||{}).version || 0) + 1,
  new_record.form_id = form_id;
  delete new_record._id;
  new_record.effectiveDate = new Date(); // new_record.effectiveDate ? new Date(new_record.effectiveDate) : new Date();;
  await forms.insertOne(new_record);
  console.log('new form record',new_record);
    // Get it from the DB afresh.
  var rec = await retrieveForm(form_id,collection);
  return rec;
}



