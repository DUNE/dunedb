"use strict";

const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const Grid = require('mongodb').Grid;
const MUUID = require('uuid-mongodb');



module.exports = {
    attach_to_database,
    log_to_db,
    shutdown,
};

var mongo_client = null;

async function attach_to_database()
{
	if(!global.config) {
		global.config = require('./configuration.js');
	}
	// if (global.db) {
 //        console.warn("Trying to attach DB again!");
 //        return global.db;
 //    }

	try {
		console.log('attaching...',global.config.mongo_uri,{useNewUrlParser:true, useUnifiedTopology: true, connectTimeoutMS: 100, socketTimeoutMS: 100});
		mongo_client = await new MongoClient.connect(
				global.config.mongo_uri, 
				{useNewUrlParser:true, useUnifiedTopology: true, connectTimeoutMS: 1000, socketTimeoutMS: 30000});
		if(!mongo_client) {
			throw("Cannot connect to DB");
		}
		global.db = mongo_client.db(global.config.mongo_db);
		console.log("attached.");
		log_to_db("Webserver Starting Up");

		await initialize_database(db);

	} catch(err) {
		console.error(err);
		return;
	}
	return db;
};

async function initialize_database(db)
{
	console.log("initialize_database");
	
	console.log("init db");
		var admin = db.collection('admin');
		var status_obj = await admin.findOne({status_object: {$exists: true}});
		console.log('status object',status_obj);
		if(!status_obj) status_obj = {status_object: true, version: 0};

		if(status_obj.version < 1) 
		{
			// Create indices
			// seed database with something
			await db.collection('componentForm').deleteMany({});
			await db.collection('componentForm').insertOne(
			{schema: JSON.parse(require('fs').readFileSync("dbSeed/component_schema.json")).schema,
			 form_id: "componentForm",
			 current:true,
			 revised: new Date()
			}
			);

			log_to_db('initialize DB to version 1');
			status_obj.version =1;
		}
	  
	  if(status_obj.version < 2) 
	  {
	    // Create indices
	    await db.collection('component').createIndex('componentUuid');
	    await db.collection('component').createIndex('effectiveDate');
	    await db.collection('component').createIndex('submit.insertDate');

	    log_to_db('initialize DB to version 2');
	    status_obj.version =2;
	  }
	  if(status_obj.version < 3){
	  	require('../dbTools/concat_collections.js')();
	  	await db.collection('tests').createIndex('form_id');
	  	await db.collection('tests').createIndex('data.componentUuid');
	  	await db.collection('tests').createIndex('insertDate');
	  	await db.collection('tests').createIndex('user.user_id');
	  	await db.collection('tests').createIndex('state');

	  	await db.collection('jobs').createIndex('form.form_id');
	  	await db.collection('jobs').createIndex('insertDate');
	  	await db.collection('jobs').createIndex('insertDate');
	  	await db.collection('jobs').createIndex('user.user_id');
	  	await db.collection('jobs').createIndex('state');
	    log_to_db('initialize DB to version 3');
	    status_obj.version =3;

	  }
		
	 if(status_obj.version < 4) {
	 	 await migrate_to_4(db);
	   status_obj.version =4;
	  }

	 if(status_obj.version < 4.1) {
	 	// Minor updates.
	 	// Ensure all tests have got componentUUID set.
	 	await db.collection('tests').deleteMany({componentUuid:{$exists:false}});

	 	// Ensure all records have 'collection' field
	 	for(var c of ['tests','jobs','testForms','jobForms','componentForm','components','processed']) {
	 	  await db.collection(c).updateMany({},{"$set":{"collection":c}});
	 	}

	 	for(var collection of ['tests',]) {
			var documents = await db.collection(collection).find().toArray();
			console.log("working on",collection,documents.length);
			for(var doc of documents) {
				var record = {...doc};
				if(collection === 'tests') {
					var uuid =  doc.componentUuid || doc.data.componentUuid;
					try{ 
						record.componentUuid = MUUID.from(uuid);
					} catch (e) {};
					record.recordType = 'test';
				} 

				record.collection = collection;
				// console.log("overwriting 4.1 ",record._id);
				var res =await db.collection(collection).replaceOne({_id: record._id}, record);
				// console.log(res.ops[0]);
			};
		}


	   	status_obj.version =4;
	  }


	//status_obj.version =0; // removeme
	await admin.replaceOne({status_object: {$exists: true}}, status_obj, {upsert: true});
};

async function log_to_db(msg)
{
	let col_log = db.collection("log");
	await col_log.insertOne({time:Date.now(),msg:msg});
}

function shutdown(force){
  global.db = null;
  if(mongo_client) mongo_client.close(force);
}
global.db = (global.db ? global.db : {});


async function migrate_to_4(db)
{
	// for(var _collection of ['testForms','componentForm','jobForms']) {
	for(var _collection of ['testForms','componentForm','jobForms']) {
		console.log("working on collection",_collection)
		var docs = await db.collection(_collection).find().toArray();
		for(var doc of docs) {
				var record = {...doc};
				record.validity = {
					startDate: doc.effectiveDate || new Date(0),
					version: doc.version || 1,
					changedFrom: doc.diff_from,
				}
				delete record.effectiveDate;
				delete record.version
				delete record.diff_from;
				const {user_id, displayName, emails} = doc.user ||{};  // equivalent to user_id = user.user_id, etc

				var user = doc.user
				record.insertion = {
					insertDate: doc.insertDate || new Date(),
					ip: doc.submit_ip || "::1",
					user: {user_id,displayName,emails}
				};
				delete record.insertDate;
				delete record.submit_ip;
				delete record.user;
				delete record.revised_by;
				record.collection = _collection;

				record.formId = doc.form_id;
				record.formName = doc.form_title;

				delete record.form_title;
				delete record.form_id;
				delete record.diff;

				record.recordType="form";


				// remove componentUuid from top level of all forms.
				// deep Copy.
				console.log('doing form',record.formId);
				record.schema = JSON.parse(JSON.stringify(doc.schema));
				function filterFormComponents(item) {
					if(! Array.isArray(item.components) ) return;
					for(var i=item.components.length-1; i>=0; i--) {
						var c = item.components[i];
						// recurse into wizard pages
						if(c.type=='panel' && item.display=='wizard') filterFormComponents(c)
						// Remove the compontent uuid field.
						else if(c.type=='ComponentUUID' && c.key =='componentUuid'){
							console.log('  removing componentUuid');
							item.components.splice(i,1);
						}
						// Remove the submit buttons; add these dymanically.
						else if(c.type=='button') {
							console.log('  removing button',c.key);
							item.components.splice(i,1);
						}
						else if(c.type=='datetime' && c.key=="effectiveDate") {
							console.log('  removing button',c.key);
							item.components.splice(i,1);
						}
					}
					return item.components.filter
				}
				filterFormComponents(record.schema); // do it

				if(_collection === "componentForm") {
					console.log(record);
				}
				await db.collection(_collection).replaceOne({_id: record._id}, record);

		}
	}

	var components = await  db.collection('components').find().toArray();
	console.log("working on components",components.length);
	for(var doc of components) {
			var newrec = {};
			newrec._id = doc._id;
			newrec.data  = {...doc};
			delete newrec.data._id;
			delete newrec.data.effectiveDate;
			delete newrec.data.recordType;
			delete newrec.data.submit;
			delete newrec.data.componentUuid;

			newrec.componentUuid = doc.componentUuid;
			newrec.recordType = 'component';
			newrec.validity = {
					startDate: doc.effectiveDate,
					version: doc.version||1,
					changedFrom: doc.diff_from,
			}
			const {user_id, displayName, emails} = doc.submit.user;  // equivalent to user_id = user.user_id, etc

			newrec.insertion =  {
					insertDate: doc.submit.insertDate,
					ip: doc.submit.ip,
					user: {user_id,displayName,emails}
				};
		  
		    await db.collection('components').replaceOne({_id: newrec._id}, newrec);

	};

	for(var collection of ['tests','jobs']) {
		var documents = await db.collection(collection).find().toArray();
		console.log("working on",collection,documents.length);
		for(var doc of documents) {
			var record = {...doc};
			if(collection === 'tests') {
				var uuid =  doc.componentUuid || doc.data.componentUuid;
				if(!uuid) {
					console.error("no valid uuid on test",doc);
					continue;
				}

				record.componentUuid = MUUID.from(uuid);
				record.recordType = 'test';
			} else {
				record.recordType = 'job';
			}

			record.collection = collection;
			const {user_id, displayName, emails} = doc.user;  // equivalent to user_id = user.user_id, etc

			record.insertion =  {
						insertDate: doc.insertDate,
						ip: doc.ip,
						user: {user_id,displayName,emails}
					};
			delete record.insertDate;
			delete record.ip;
			delete record.user;
			record.formId = doc.form_id;
			delete record.form_id;

			record.formObjectId = ((doc.form) || {})._id;
			delete record.form;

			console.log("overwriting",record._id);
			var res =await db.collection(collection).replaceOne({_id: record._id}, record);
			// console.log(res.ops[0]);
		};
	}
	await db.collection('component').createIndex('componentUuid');
	await db.collection('component').createIndex('validity.startDate');
	await db.collection('component').createIndex('validity.version');
	await db.collection('component').createIndex('insertion.insertDate');

	await db.collection('testForms').createIndex('validity.startDate');
	await db.collection('testForms').createIndex('validity.version');
	await db.collection('testForms').createIndex('insertion.insertDate');
	await db.collection('componentForm').createIndex('validity.startDate');
	await db.collection('componentForm').createIndex('validity.version');
	await db.collection('componentForm').createIndex('insertion.insertDate');
	await db.collection('jobForms').createIndex('validity.startDate');
	await db.collection('jobForms').createIndex('validity.version');
	await db.collection('jobForms').createIndex('insertion.insertDate');


	await db.collection('tests').createIndex('formId');
	await db.collection('tests').createIndex('componentUuid');
	await db.collection('tests').createIndex('insertion.insertDate');
	await db.collection('tests').createIndex('insertion.user.user_id');
	await db.collection('tests').createIndex('state');

	await db.collection('jobs').createIndex('formId');
	await db.collection('jobs').createIndex('insertion.insertDate');
	await db.collection('jobs').createIndex('insertion.user.user_id');
	await db.collection('jobs').createIndex('state');

}

