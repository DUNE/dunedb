"use strict";

const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const Grid = require('mongodb').Grid;
const MUUID = require('uuid-mongodb');
const logger = require('./logger');

// attempt to find where mongo failures are happening. doesn't really work.
//require('longjohn').async_trace_limit = 500;


module.exports = {
    attach_to_database,
    get_client,
    log_to_db,
    shutdown,
};

var mongo_client = null;

function get_client() {return mongo_client;}

async function attach_to_database()
{
	if(!global.config) {
		logger.error("config not set up??");
		throw new Error("Config not set up??");
	}
	// if (global.db) {
 //        console.warn("Trying to attach DB again!");
 //        return global.db;
 //    }

	try {
		logger.info(global.config.mongo_connection,'attaching to mongo...');
		mongo_client = await new MongoClient.connect(...global.config.mongo_connection);
		
		if(!mongo_client) {
			throw("Cannot connect to DB");
		}
		global.db = mongo_client.db(global.config.mongo_db);
		logger.info("attached.");

		await initialize_database(db);

		logger.info("initialized.");
	} catch(err) {
		logger.error(err);
		console.error(err);
		console.log(err);
		process.exit(1);
	}
	return db;
};


var existing_collections = null
async function ensure_exists(db,collection)
{
	if(!existing_collections) 
		existing_collections = await db.listCollections().toArray();

	var found = false;
	for(var i of existing_collections) {
	  if(i.name == collection) found=true;
	 }
	 if(!found){
	  	await db.createCollection(collection);
	  	logger.info(`Created collection ${collection}`);
	 }
}

async function initialize_database(db)
{
	logger.info("initialize_database");
	
	logger.info("init db");
	var admin = db.collection('admin');
	var status_obj = await admin.findOne({status_object: {$exists: true}});
	logger.info(status_obj,'status object');
	if(!status_obj) status_obj = {status_object: true, version: 0};
	var old_version = status_obj.version;
	try{

	  if(status_obj.version == 0) {
	  	logger.info("v0 initialization");

	  	// Create collections if they do not exist.
	  	var collections = [
	  		"components",
				"jobs",
				"tests",
				"processed",
	  		"componentForms","jobForms","testForms",
		  	"m2mUsers",
	  	];

	  	var existing = await db.listCollections().toArray();
	  	// console.log(existing);
	  	for(var c of collections) ensure_exists(db,c);

	  	// We have basic initialization
	   	status_obj.version =0.01;
		}

		if(status_obj.version < 4.9) 
		{
			// Set up a blank DB.
		 	logger.info("components");
			await db.collection("components").dropIndexes(); // often cruft in early versions.

			await db.collection("components").createIndex({"componentUuid":1});
			await db.collection("components").createIndex({"type":1});
			await db.collection("components").createIndex({"state":1});
			await db.collection("components").createIndex({"validity.startDate":1});
			await db.collection("components").createIndex({"validity.version":1});
			await db.collection("components").createIndex({"insertion.insertDate":1});
			await db.collection("components").createIndex({"insertion.user.user_id":1});
			// await db.collection("components").createIndex({"data.$**": 1}); // mongodb version limited.
		 	await db.collection("components").createIndex({"$**": "text"},{"weights":{"type":3,"data.name":2}});

		 	logger.info("jobs");
			await db.collection("jobs").dropIndexes(); 
			await db.collection("jobs").createIndex({jobId:1});
			await db.collection("jobs").createIndex({formId:1});
			await db.collection("jobs").createIndex({state:1});
			await db.collection("jobs").createIndex({"validity.startDate":1});
			await db.collection("jobs").createIndex({"validity.version":1});
			await db.collection("jobs").createIndex({"insertion.insertDate":1});
			await db.collection("jobs").createIndex({"insertion.user.user_id":1});
			// await db.collection("jobs").createIndex({"data.$**": 1});
		 	await db.collection("jobs").createIndex({"$**": "text"},{"weights":{"type":3,"data.name":2}});

		 	logger.info("test");

			await db.collection("tests").dropIndexes(); // often cruft in early versions.
			await db.collection("tests").createIndex({componentUuid:1});
			await db.collection("tests").createIndex({formId:1});
			await db.collection("tests").createIndex({state:1});
			await db.collection("tests").createIndex({"insertion.insertDate":1});
			await db.collection("tests").createIndex({"insertion.user.user_id":1});
			// await db.collection("tests").createIndex({"data.$**": 1});
		 	await db.collection("tests").createIndex({"$**": "text"},{"weights":{"formId":3,"data.name":2}});

		 	logger.info("processed");

			// await db.createCollection('processed'); // in case it doesn't exist already
			await db.collection("processed").dropIndexes(); // often cruft in early versions.
			await db.collection("processed").createIndex({"input._id":1});
			await db.collection("processed").createIndex({"insertion.insertDate":1});
			await db.collection("processed").createIndex({"insertion.user.user_id":1});


			for(var c of ["componentForms","jobForms","testForms"]) {
			 	logger.info(c);

				await db.collection(c).dropIndexes(); // often cruft in early versions.
				await db.collection(c).createIndex({formId:1});
				await db.collection(c).createIndex({"validity.startDate":1});
				await db.collection(c).createIndex({"validity.version":1});
				await db.collection(c).createIndex({"insertion.insertDate":1});
				await db.collection(c).createIndex({"insertion.user.user_id":1});
			}

		 	logger.info("m2mUsers");

			await db.collection("m2mUsers").dropIndexes(); // often cruft in early versions.
			await db.collection("m2mUsers").createIndex({user_id:1});


			status_obj.version =4.9;
			log_to_db('initialize DB to version '+status_obj.version);
		}
	 


	  if(status_obj.version < 5.0) {
	  	logger.info("v5 jobs");
			await db.collection('jobs').updateMany({jobId:{$exists:false}},{$set:{jobId: "$_id" }});
	   	status_obj.version =5.0;
		}

	  if(status_obj.version < 6.0) {
	  	logger.info("v6 jobs");
	  	await ensure_exists(db,"courses")
	  	db.collection("courses").dropIndexes();
	  	db.collection("courses").createIndex({courseId:1});
	  	db.collection("courses").createIndex({"validity.version":1});
	  	db.collection("courses").createIndex({"validity.startDate":1});
	  	logger.info("Indexed courses collection")
	   	status_obj.version =6.0;
		}


	  if(status_obj.version < 7.0) {
	  	logger.info("v7 docs");
	  	await ensure_exists(db,"docs")
	  	await db.collection("docs").dropIndexes();
	  	await db.collection("docs").createIndex({docId:1});
	  	await db.collection("docs").createIndex({"validity.version":1});
	  	await db.collection("docs").createIndex({"validity.startDate":1});
		 	await db.collection("docs").createIndex({"data": "text"});
	  	logger.info("Indexed docs collection")
	   	status_obj.version =7.0;
		}

	} catch(err) {
		console.error(err);
		logger.info(err);
		throw err;
	}
	if(status_obj.version != old_version) logger.warn(`Updated Database from ${old_version} to ${status_obj.version}`);
	await admin.replaceOne({status_object: {$exists: true}}, status_obj, {upsert: true});
	logger.info("Database schema version",status_obj.version);
};

async function log_to_db(msg)
{
	let col_log = db.collection("log");
	logger.info(msg);
	await col_log.insertOne({time:Date.now(),msg:msg});
}

async function shutdown(){
  // global.db = null;
  if(mongo_client) await mongo_client.close(true);
}
global.db = (global.db ? global.db : {});



