"use strict";

var MUUID = require('uuid-mongodb');
var jsondiffpatch = require('jsondiffpatch');
var chalk = require('chalk');
const { Binary } = require('mongodb');

var database = require('./database.js');  // Exports global 'db' variable
var permissions = require('./permissions.js');
var commonSchema = require("./commonSchema.js");
var Cache = require("./Cache.js");
var componentRelationships = require("./component_relationships.js");
var dbLock = require("./dbLock.js");

module.exports = {
  retrieveComponentChangeDates,
  save,
  retrieve,
  list,
  findUuidStartsWith,
  newUuid,
  getTypes,
  relationships,
  search
}


///
/// Save component record in database.
/// All calls should come through this function!
///
///



async function save(input,req)
{
  // input MUST contain:
  // { componentUuid: < any form > ,
  //   validity: { startDate: <startDate>,
  //               version: <int>,
  //               changed_from: <ObjectId> 
  //             },
  //  data: { type: <string>,
  //          any other component data.
  //        }
  //  metadata: {}
  // }
  // req must be a valid Express request, including a user field and ip field.
  // FIXME: provid workaround?
  
  // Check it conforms:
  var componentUuid = input.componentUuid;
  if(!componentUuid) throw new Error("No componentUuid specified in saveComponent()");
  if(!input.data) throw new Error("No data specified in saveComponent()");
  if(!input.type) throw new Error("No type specified in saveComponent()");

  var _lock = await dbLock("saveComponent"+MUUID.from(input.componentUuid),1000);
  var old = await retrieve(componentUuid);
  logger.info("submit component",input);
  // logger.info("old one:",old);
  

  var record = {...input};
  record.componentUuid = MUUID.from(input.componentUuid);
  record.recordType = "component"; // required
  record.insertion = commonSchema.insertion(req);

  record.validity = commonSchema.validity(record.validity, old);
  record.validity.ancestor_id = record._id;
  delete record._id;


  var components = db.collection("components");
  if(!old) {
    // No conflict. Is this user allowed to enter data?
    if(!permissions.hasPermission(req,'components:create'))  {
      _lock.release();
      throw new Error("You don't have data entry priviledges.");
    }
  } else {
    // this is an edit to an existng record.
    if(!permissions.hasPermission(req,'components:edit')) {
      _lock.release();
      throw new Error("Component UUID "+componentUuid+" is already in database and you don't have edit priviledges.");
    }
  }


  // Can do here: insert relationship data.
  record.referencesComponents = findRelationships(record.data);

  // Do it!
  var result = await components.insertOne(record); // fixme TRANSACTION LOG wutg req.body.metadata
  _lock.release();

  if(result.insertedCount !== 1) throw new Error("Could not insert new form record.");
  var outrecord = {...result.ops[0]};
  outrecord.componentUuid = MUUID.from(record.componentUuid).toString();

  Cache.invalidate('componentCountsByType');  
  return outrecord;
}






async function retrieve(componentUuid,projection) {
  // Find the right component
  //
  // Usage: 
  //   retrieve(componentUuid [,projection] )
  //   retrieve({componentUuid: <uuid>, 
  //            rollbackdate: {$lte: <date>}},
  //            onDate: {$lte <date>},
  //            version: <num,
  //            ...}
  //            [, projection])
  // rollbackdate and onDate must be in native Date() format or null
  //
  // or:

  var query = {componentUuid: componentUuid};
  if(typeof componentUuid === "object" && !(componentUuid instanceof Binary)) query = componentUuid;
  logger.info(componentUuid);
  if(!query.componentUuid) throw new Error("Components::retrieve() no componentUuid given.");
  query.componentUuid = MUUID.from(query.componentUuid); // binary form.

  // if(rollbackDate) query["insertion.insertDate"] = {$lte: rollbackDate};  // rollback to things inserted before this time
  // if(onDate)       query["validity.startDate"] = {$lte: onDate}; // rollback to things that happened before this time
  var options = {};
  if(projection) options.projection = projection;
  // logger.info(chalk.blue('---retrieve',...arguments, query));
  // logger.info("retrieve",...arguments,query);
  // var resall =  await db.collection('components').find(query).toArray();
  // logger.info(chalk.red('------finding component------'),query);
  // logger.info(resall);
  var res = await db.collection('components').find(query,options).sort({"validity.startDate":-1,"validity.version":-1}).limit(1).toArray();
  // logger.info("res",res);
  if(res.length<1) return null;

  res[0].componentUuid = MUUID.from(res[0].componentUuid).toString();
  // logger.info('retrieve component',componentUuid, res[0].componentUuid )
  return res[0];
}

async function retrieveComponentChangeDates(componentUuid,rollbackDate) {
  // Find the right component
  // rollbackdate and onDate must be in native Date() format or null
  var query = {componentUuid:MUUID.from(componentUuid)}; // binary form.
  if(rollbackDate) query["insertion.insertDate"] = {$lt: rollbackDate};  // rollback to things inserted before this time
  var resall =  await db.collection('components').find(query).project({"validity":1,"insertion":1}).sort({"validity.startDate":-1}).toArray();
  // logger.info(chalk.red('------finding component versions------'),query);
  // logger.info(resall);
  return resall;
}






// for the Autocomplete Route
async function findUuidStartsWith(uuid_string,types,max)
{
  // binary version.
  max = max || 10;

  // sanitize string of all extra characters.
  var q = uuid_string.replace(/[_-]/g,'');

  // pad with zeroes and "F"s.
  var qlow = q.padEnd(32,'0');
  var qhigh = q.padEnd(32,'F');
  // logger.info(qlow,qhigh);
  var bitlow = Binary(Buffer.from(qlow, 'hex'),Binary.SUBTYPE_UUID);
  var bithigh =  Binary(Buffer.from(qhigh, 'hex'),Binary.SUBTYPE_UUID);
  // logger.info(qlow,qhigh,bitlow,bithigh);
  var query = {componentUuid:{$gte: bitlow, $lte: bithigh}};
  if(types) query.type = {$in: types};
  var matches = await db.collection("components")
    .find(query)  // binary UUIDs only
    .project({"componentUuid":1, 'type':1, 'data.name':1})
    .limit(max)
    .toArray();
  // if(matches.length>=max) return new Error("Too many entries"); // too many!
  for(var m of matches) {
    m.componentUuid = MUUID.from(m.componentUuid).toString();
  }
  return matches;

}


// used by saveComponent to locate UUIDs in there.
function findRelationships(data)
{
  // recurse through record
  var list = [];
  function recurse(thing) {
    for(var i in thing) {
      var obj = thing[i];
      if (typeof obj === "object") recurse(obj);
      if (typeof obj === "array") recurse(obj);
      else if ( (typeof obj === 'string') || (obj instanceof Binary) ) {
        try {
          muuid = MUUID.from(obj);
          list.push(muuid); // if from() call throws, this won't get executed - not a valid uuid.
        } 
        catch(err) {};  // not a uuid, that's not a real problem.
      }
    }
  }
  recurse(data);
  return list;
}


function newUuid()
{
  // Standard way to create a component UUID.
  // What I want:
  // a) Zero collision chance, 
  // b) some timestamp or other metadata
  // c) First characters are unique as possible, so auto-complete works well.
  // This is a conundrum. UUID.v1() is entirely time & MAC based, so it does a,b not c.
  // UUID.v4 satisifies c) but not a) and b)
  // ObjectId is close - it uses high bits for time, medium bits are random, low bits are sequential-ordering to prevent conflict.
  // The plot thickens - the UUID.v1() code actually cheats ns and MAC code. 
  // But.. v1() actually puts the medium time in the high bits, meaning they are actually semi-random when
  // not generated at the same time!
  return MUUID.v1();
}




// Search and retrieval

Cache.add('componentCountsByType',
     async function(){
      var arr =  await db.collection("components").aggregate([
           { $group: {_id: { type: "$type",
                             uuid: "$componentUuid"}} },
           { $group: {_id: "$_id.type", count: {$sum: 1} } },
           { $project: {type:"$_id",count:true,_id:false}}
       ]).toArray();
      var retval = {};
      for(var el of arr) { retval[el.type] = el }
      return retval;
})

// Get all types, with counts:
async function getTypes()
{
  // FIXME: Cache
  // Return object:
  // {type1: 123,
  // type2: <object count> }
  return Cache.current('componentCountsByType');  


  // var result =  await db.collection("components").aggregate([
  //     { $group: {_id: "$type", count: {$sum:1}} },
  //     { $project: {type:"$_id",count:true,_id:false}}
  //   ]).toArray();
  // logger.info(result);
  // return result;
  // var retval = {};
  // for(var row of result) { retval[row._id] = row.count }
  // return retval;
  // return result.map(x=>x._id);
}





// Get list of all components, listed with most recently edited first, 
// matching some constraint.  Typically {type:"screw"} or whatever, but can be blank
// for all recent objects.
async function list(match_condition,options)
{
    var aggregation_stages = [];
    var opts = options || {};

    if(match_condition) {
      if(match_condition.componentUuid) {
        if(match_condition.componentUuid['$in'])
          match_condition.componentUuid['$in'] = match_condition.componentUuid['$in'].map(x=>MUUID.from(x));
      }
      aggregation_stages.push( { $match: match_condition }             );
    }
    aggregation_stages.push(   { $sort:{ "validity.startDate" : -1 } } );
    aggregation_stages.push(   { $group: {_id: { componentUuid : "$componentUuid" },
                                               componentUuid: { "$first":  "$componentUuid" },
                                               type: { "$first":  "$type" },
                                               name: { "$first":  "$data.name" },
                                               last_edited: { "$first": "$insertion.insertDate" },
                                               created: { "$last": "$validity.startDate" },
                               } } );
    aggregation_stages.push(   { $sort:{ last_edited : -1 } } );
    if(opts.skip)  
      aggregation_stages.push( { $skip: opts.skip } );
    if(opts.limit)  
      aggregation_stages.push( { $limit: opts.limit } );

    // logger.info(JSON.stringify(aggregation_stages));
    var items = await db.collection("components").aggregate(aggregation_stages).toArray();
    for(var c of items) { c.componentUuid = MUUID.from(c.componentUuid).toString(); }
    return  items;
}


async function relationships(componentUuid) 
{
  // Rebuild-on-view.  This should be relatively efficient most of the time
  // but massively slow some of the time.
  componentRelationships.doIncrementalMapReduce();
  //
  // Various optimizations:
  // Rebuild after-view?
  // rebuild only if a timer has passed?
  // Do an invalidation like a cache - naw, I'm already doing the equivalent in the 
  // code; it only needs 2 quick indexed calls to see if the relationship table is up-to-date.
  var rec = await db.collection("relationships").findOne({_id:MUUID.from(componentUuid)});
  if(!rec) return null;
  var r = rec.value;
  // Now let's add some info about each of those components.
  // For each candidate link, we want to know:
  // - object name, type, edited date, created date, as above, for linked items
  // - What time ranges and paths connnect the input component to the linked ones. Maybe limit by an input target validity time?
  var uuids = [];
  for(var i in r.linkedTo) {
    uuids.push(MUUID.from(i));
    logger.info("bolstering",i);
  }

  var query = {componentUuid: {$in: uuids}}; 
  var aggregation_stages = [];
  aggregation_stages.push({$match: query})
  aggregation_stages.push(          { $sort:{ "validity.startDate" : -1 } } );
  aggregation_stages.push(          { $group: {_id: "$componentUuid",
                                               componentUuid: { "$first":  "$componentUuid" },
                                               type: { "$first":  "$type" },
                                               name: { "$first":  "$data.name" },
                                               last_edited: { "$first": "$validity.startDate" },
                                               created: { "$last": "$validity.startDate" },
                                              } 
                                    } );
  aggregation_stages.push(          { $sort:{ last_edited : -1 } } );

  var items = await db.collection("components").aggregate(aggregation_stages).toArray();
  logger.info('bolstering result',items.length);
  for(var doc of items) {
     for(var o of r.linkedTo[MUUID.from(doc._id).toString()]) {
      logger.info("bolstering",i,doc);
      Object.assign(o,{...doc});
     }
  }
  logger.info(JSON.stringify(r,null,2))
  return r;

}


async function search(txt,match,limit,skip)
{
  // logger.info("Components::search()",txt,match)
  var matchobj= match || {};
  if(matchobj.componentUuid) matchobj.componentUuid = MUUID.from(matchobj.componentUuid)

  var result = [];
  if(txt) {
    matchobj["$text"] = {$search: txt};
    logger.info("Components::search  text search",matchobj);
    result = await 
      db.collection('components').aggregate([      
        // { $match: {$text: {$search: txt}}},
        { $match: matchobj },
        { $sort:{ score:{$meta:"textScore" }, "validity.startDate" : -1} },
        { $limit: (limit || 100)+(skip||0) },
        { $skip: skip || 0 },
        { $group: {_id: { componentUuid : "$componentUuid" },
                          componentUuid: { "$first":  "$componentUuid" },
                          insertion: { "$first":  "$insertion" },
                          type: { "$first":  "$type" },
                          name: { "$first":  "$data.name" },
                          last_edited: { "$first": "$validity.startDate" },
                          created: { "$last": "$validity.startDate" },
                          recordType: { "$first": "$recordType" },
                          score: {"$max" : {$meta:"textScore" }}
                        }
            },
        { $sort: {score: -1, last_edited:-1} },
      ]).toArray();
    } else {
      logger.info(matchobj,"Components::search non-text search");
      result = await 
        db.collection('components').aggregate([      
          // { $match: {$text: {$search: txt}}},
          { $match: matchobj },
          { $sort:{ "validity.startDate" : -1, _id:-1 } },
          { $limit: (limit || 100)+(skip||0) },
          { $skip: skip || 0 },
          { $group: {_id: { componentUuid : "$componentUuid" },
                            componentUuid: { "$first":  "$componentUuid" },
                            insertion: { "$first":  "$insertion" },
                            type: { "$first":  "$type" },
                            name: { "$first":  "$data.name" },
                            last_edited: { "$first": "$validity.startDate" },                            
                            created: { "$last": "$validity.startDate" },
                            recordType: { "$first": "$recordType" }, 
                          }
              },
          { $sort: {last_edited:-1} },
      ]).toArray();

    }
    var output =[];
    for(var el of result) {
      var o = {...el};
      o.componentUuid = MUUID.from(el.componentUuid).toString();
      o.route = "/component/"+o.componentUuid;
      output.push(o);
    }
    return output;


}