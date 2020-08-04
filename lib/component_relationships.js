#!/usr/bin/env node
"use strict";

//
// This code serves to build reverse mapping between components. The 
// idea here is that every Component gets searched for anything that looks like a UUID
// in its data:{} 
// These then get compiled into a lookup table by the magic of mapReduce, which
// then results in a "relationships" collection that lets us easily navigte the tree.
//
// FIXME:
// To save computation power, the mapreduce algorithm can be run frequently - it takes only 
// about 100ms for a single record.  But a single record is probably too often; it makes 
// more sense to maybe start a timer to do it 5 seconds after every insert (without resetting if the time
// is already running). That will mean
// a large component dump won't be bogged down.
//
// Notes: If object a references object b as data.thing, then we will get these mappings:
// b -> linkedFrom a, path: data.thing
// a -> linkedTo b, path:data.thing
//
//
// Note bene: If a links to b twice (e.g. a.data ={  thing1:b, thing2:b})
// then there may be two relationship links a->b and b->a, because the reduce function
// won't be called on unique keys.  
//
// So, don't rely on that.


// the mapped and reduced records:
// { 
//   _id: <componentUuid>
//   value: {
//   	linkedFrom:  [<component link>,...] ,
//   	linksTo: [<component link>,...] ,
// 	}
// }
// component_link:
// {
// 	componentUuid: <uuid>,
// 	version: // of most recent
// 	path: // of most recent
// 	type, name,id - just for convenience in the linkedFrom case.
// }


const database = require("../lib/database.js");
let {ObjectId} = require("mongodb");




function mapRelationships()
{
	// record is this
	// recurse through record

	var uuid1 = this.componentUuid; 
  var version = this.validity.version; 
  var type    = this.type;
  var name    = (this.data||{}).name;
  var id     = this._id;
  var uuid_regex = /^[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}/;

	function link(uuid2,path){
				var component_link_from = {
					componentUuid: uuid1,
					version,
					type,
					name,
					id,
					path
				}
				// We have another uuid.

				// thing we point at needs a record
				emit(uuid2, // FIXME text->BSON?
					{
						linkedTo: [],
						linkedFrom: [component_link_from]
					}); // FIXME BSON->text?


				// we need a record too
				var component_link_to = {
					componentUuid: uuid2,
					version,
					path
				}
				emit(uuid1, // FIXME text->BSON?
					{
						linkedTo: [component_link_to],
						linkedFrom: []
					}); // FIXME BSON->text?

	}

	function recurse(thing,path) {
		// console.log("recurse",path,thing);
		for(var i in thing) {
			if (Array.isArray(thing[i])) {
				for(var j=0;j<thing[i].length;j++)
	  			recurse(thing[i][j],path+'.'+i+'['+j+']');
			}
			else if (typeof thing[i] === "object")  
				{ recurse(thing[i],path+'.'+i); }
			else if (typeof thing[i] === 'string' && thing[i].match(uuid_regex)) {
				// fixme: also look for bson objects, return bson objects
				// that requires pulling code out of uuid-mongo, but should be doable.
				var uuid2 = UUID(thing[i]);
				link(uuid2,path);
			}
			else if (typeof thing[i] === "Binary") {
				link(thing[i],path)
			}
		}
	}
	recurse(this.data,"data");
}


function reduceRelationships(key,values)
{
	var result = {
		linkedFrom:[],
		linkedTo:[],
	}
	// for(elem of values) {
	// 	// fixme: should actually reduce
	// 	result.linkedTo.push(...elem.linkedTo);
	// 	result.linkedFrom.push(...elem.linkedFrom);
	// }
	function addElemIfUnique(elem,to){
		var uuid1 = elem.componentUuid;
		for(var j=0;j<to.length;j++){
			var uuid2 = to[j].componentUuid;
			if(uuid1==uuid2) {
				if(elem.version > to[j].version) to[j] = elem; // replace with newer version
				return;
			}
		}
		to.push(elem);
	}
	function addUnique(from,to) {
		for(var elem of from) addElemIfUnique(elem,to);
	}
	for(var val of values){
		addUnique(val.linkedFrom, result.linkedFrom);
		addUnique(val.linkedTo,   result.linkedTo  );
	} 
	

	return result;
}





async function doIncrementalMapReduce(startObjectId,endObjectId) {
	try{
		// console.log(db,global.db);
		var components = db.collection("components");
		var query = {};
		if(startObjectId === "restart") {
			await db.collection("bookkeeping").deleteOne({_id:"componentRelationships"});
			try{
				await db.collection("relationships").drop();
			} catch(e) {};
		} else if(startObjectId) {
			query._id = {$gt: startObjectId,...query._id};
		}
		else {
			var tracking = await db.collection("bookkeeping").findOne({_id:"componentRelationships"});
			// look it up from the tracking object
			console.log("tracking:",tracking);
			if(tracking && tracking.last) {
				query._id = {$gt: tracking.last,...query._id};
			}
			// if no tracking object, start from beginning.
		}
		if(endObjectId) {
			query._id = {$lte: startObjectId,...query._id};
		} // else no stop id.

		// find records
		var first = ObjectId(0);
		var last = ObjectId(0);
		var firstrec = await components.find(query).project({_id:1}).sort({_id: 1}).limit(1).next();
		var lastrec  = await components.find(query).project({_id:1}).sort({_id:-1}).limit(1).next();

		if(firstrec) first = firstrec._id;
		if(lastrec) last = lastrec._id;
		else {
			// nothing to be done; no up-to-date records.
			console.log("nothing to be done");
			return;
		}

		console.log("Running on OIDs from",first," to ",last,lastrec);
		// set actual query to match, make sure nothing is inserted while we're running...
		query._id = {$gte: first, $lte: last};
		var map = mapRelationships;
		var reduce = reduceRelationships;

		var map = mapRelationships;
		var reduce = reduceRelationships;
		var options = {};
		options.query = query;
		options.out = "relationships";
		options.verbose = true;
		// options.sort = { componentUuid: 1 }; // This should help optimization? Tests not so good.

		console.log("starting mapReduce operation");
		
		var result = await components.mapReduce( map, reduce, options );

		console.log("complete mapReduce finished in ",result.stats.processtime," ms");

		// we got here so no errors. Add tracking object.
		db.collection("bookkeeping").updateOne({_id:"componentRelationships"},
			{ $set: {
					performed: new Date(),
					first: first,
					last: last,
				}
			},
			{upsert: true})

		// console.log("result:",result);
	} catch(e) {
		console.error(e);
		console.error(e.stack);
		throw e;
	}
}

module.exports = {
	doIncrementalMapReduce
};

//////////////////////////////////////////////////////////////////////////////////////////////////

// testing or standalone functions:

async function testOne() {
	MUUID = require("uuid-mongodb");
	emit = function(a,b) {
		console.log("emit",MUUID.from(a).toString());
		if(b.linkedTo.length>0) console.log("  to  -->",b.linkedTo[0].version,b.linkedTo[0].path,MUUID.from(b.linkedTo[0].componentUuid).toString());
		if(b.linkedFrom.length>0) console.log("  from-->",b.linkedFrom[0].version,b.linkedFrom[0].path,MUUID.from(b.linkedFrom[0].componentUuid).toString());
	}

	var rec = await db.collection('components').findOne({type:"Paper"});
	console.log("rec",JSON.stringify(rec,null,2));
	mapRelationships.call(rec);

}

async function doMapReduce() {
	try{
		var map = mapRelationships;
		var reduce = reduceRelationships;
		options = {};
		// options.query = {type:"Paper"};
		options.query = {};
		options.out = "relationships";
		options.verbose = true;
		// options.sort = { componentUuid: 1 }; // This should help optimization? Tests not so good.
		await db.collection("relationships").drop();

		console.log("starting mapReduce operation");
		var result = await db.collection('components').mapReduce(
				map,
				reduce,
				options);
		console.log("complete mapReduce finished in ",result.stats.processtime," ms");
		// console.log("result:",result);
	} catch(e) {
		console.error(e);
		console.error(e.stack);
		throw e;
	}
}



if (require.main === module) {
  global.config = require('../configuration.js');  // must be first

	database.attach_to_database()
		.then(async ()=>await doIncrementalMapReduce("restart"))
		// .then(testOne)
		.then(function(){database.shutdown()})

}
