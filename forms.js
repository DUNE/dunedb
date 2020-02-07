
const chalk = require('chalk');
var express = require('express');
var database = require('./database.js'); // Exports global 'db' variable
var permissions = require('./permissions.js');
var MUUID = require('uuid-mongodb');

var router = express.Router();

module.exports = {
  router,
  retrieveForm,
  getListOfForms,
}

// Get current form
async function retrieveForm(form_id,collection,onDate,rollbackDate) {
	console.log("retrieveForm",...arguments);
	collection = collection || "testForms";
	try{
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

	} catch(err) {

		console.error(err);
		return null; 
	}
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

////////////////////////////////////////////////////////
// json api interface, called from client or programs.

// API/Backend: Get a form schema
router.get('/json/:collection(testForms|componentForm)/:form_id', async function(req,res,next){
  var rec = await retrieveForm(req.params.form_id, req.params.collection);
  // if(!rec) return res.status(404).send("No such form exists");
  if(!rec) { res.status(400).json({error:"no such form "+req.params.form_id}); return next(); };
  console.log(rec);
  res.json(rec);
});


// API/Backend:  Change the form schema.
router.post('/json/:collection(testForms|componentform)/:form_id', permissions.middlewareCheckFormEditPrivs, async function(req,res,next){
  console.log(chalk.blue("Schema submission","/json/testForms"));

  var form_id = req.params.form_id; 

  // Note this is OK because req.params.collection options are specified in the method regex
  var old = await retrieveForm(form_id,req.params.collection);
  var forms = db.collection(req.params.collection);
  var updateRes = await forms.updateMany({form_id:form_id, current:true}, {$set: {current: false}});

  // console.log('updateRes',updateRes);
  var new_record = {...req.body}; // shallow clone

  new_record.submit = {
        insertDate: new Date(),
        ip: req.ip,
        user: ((res.locals||{}).user||{}).email || "unknown",
        diff_from: null,
        diff: null,
  }
  new_record.version= (old.version || 0) + 1,

  new_record.form_id = form_id;
  delete new_record._id;
  new_record.effectiveDate = new_record.effectiveDate ? new Date(new_record.effectiveDate) : new Date();;

  await forms.insertOne(new_record);
  console.log('new form record',new_record);
    // Get it from the DB afresh.
  var rec = await retrieveForm(form_id,req.params.collection);
  res.json(rec);
});

