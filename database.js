const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const Grid = require('mongodb').Grid;

const config = require('./configuration.js');



module.exports = {
    attach_to_database,
    log_to_db,
};


async function attach_to_database()
{
	// if (global.db) {
 //        console.warn("Trying to attach DB again!");
 //        return global.db;
 //    }

	try {
		console.log('attaching...',config.mongo_uri,{useNewUrlParser:true, useUnifiedTopology: true, connectTimeoutMS: 100, socketTimeoutMS: 100});
		const mongo_client = await new MongoClient.connect(
				config.mongo_uri, 
				{useNewUrlParser:true, useUnifiedTopology: true, connectTimeoutMS: 100, socketTimeoutMS: 100});
		if(!mongo_client) {
			throw("Cannot connect to DB");
		}
		global.db = mongo_client.db(config.mongo_db);
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
			{schema: JSON.parse(require('fs').readFileSync(__dirname+"/component_schema.json")),
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
	    await db.collection('component').ensureIndex('componentUuid');
	    await db.collection('component').ensureIndex('effectiveDate');
	    await db.collection('component').ensureIndex('submit.insertDate');

	    log_to_db('initialize DB to version 2');
	    status_obj.version =2;
	  }
		
		//status_obj.version =0; // removeme
		await admin.replaceOne({status_object: {$exists: true}}, status_obj, {upsert: true});
};

async function log_to_db(msg)
{
	let col_log = db.collection("log");
	await col_log.insertOne({time:Date.now(),msg:msg});
}

global.db = (global.db ? global.db : {});


