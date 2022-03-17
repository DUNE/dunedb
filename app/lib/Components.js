
'use strict';

const Binary = require('mongodb').Binary;
const Cache = require("lib/Cache.js");
const commonSchema = require("lib/commonSchema.js");
const componentRelationships = require("lib/component_relationships.js");
//const database = require('lib/db');
const { db } = require('./db');
const dbLock = require("lib/dbLock.js");
const permissions = require('lib/permissions.js');
const shortuuid = require('short-uuid')();
const logger = require('./logger');

var MUUID = require('uuid-mongodb');
module.exports = function(type) {return new ComponentsModule(type)};

function ComponentsModule()
{
  this._type == 'component';
  this._collection = 'components';
  this._formCollection = 'componentForms';
}


ComponentsModule.prototype.retrieve = async function(componentUuid, projection)
{
  /// Usage: 
  ///   Components.retrieve(componentUuid [, projection])
  ///   Components.retrieve({componentUuid: uuid, "validity.version": version} [, projection]) 
  ///
  /// Example projection:
  ///   "insertion.insertDate": {$lte: rollbackDate}
  ///
  /// If no version number is specified, the highest version number will be matched and retrieved
  
  var query = {componentUuid: componentUuid};
  
  if(typeof componentUuid === "object" && !(componentUuid instanceof Binary))
  {
    query = componentUuid;
  }
  
  if(!query.componentUuid)
  {
    throw new Error("Components::retrieve() no componentUuid has been given!");
  }
  
  query.componentUuid = MUUID.from(query.componentUuid);
  
  var options = {};
  
  if(projection)
  {
    options.projection = projection;
  }
  
  var res = await db.collection('components')
                    .find(query, options)
                    .sort({"validity.version": -1})
                    .limit(1)
                    .toArray();
  
  if(res.length < 1)
  {
    return null;
  }

  res[0].componentUuid = MUUID.from(res[0].componentUuid).toString();
  
  return res[0];
}


ComponentsModule.prototype.versions = async function(componentUuid)
{
  /// Usage:
  ///   Components.versions(componentUuid)
  
  var query = {componentUuid: componentUuid};
  
  if(typeof componentUuid === "object" && !(componentUuid instanceof Binary))
  {
    query = componentUuid;
  }
  
  if(!query.componentUuid)
  {
    throw new Error("Components::versions() no componentUuid has been given!");
  }
  
  query.componentUuid = MUUID.from(query.componentUuid);
  
  var res = await db.collection('components')
                    .find(query)
                    .sort({"validity.version": -1})
                    .toArray();
  
  return res;
}


ComponentsModule.prototype.relationships = async function(componentUuid) 
{
  /// Usage:
  ///   Components.relationships(componentUuid)
  
  // Rebuild on-view ... this should be relatively efficient most of the time, but could occasionally be massively slow
  componentRelationships.doIncrementalMapReduce();
  
  // Consider various optimisations:
  //   - rebuild after-view?
  //   - rebuild only if a timer has passed?
  //   - do an invalidation like a cache - nah, we're already doing the equivalent in the code ... it only needs 2 quick indexed calls to see if the relationship table is up-to-date
  
  var rec = await db.collection("relationships").findOne({_id: MUUID.from(componentUuid)});
  
  if(!rec)
  {
    return null;
  }
  
  var r = rec.value;
  
  // Now let's add some info about each of those components ... for each candidate link, we want to know:
  //   - the object name, type, edited date, created date, as above, for linked items
  //   - what time ranges and paths connnect the input component to the linked ones ... maybe limit by an input target validity time?
  var uuids = [];
  
  for(var i in r.linkedTo)
  {
    uuids.push(MUUID.from(i));
  }

  var query = {componentUuid: {$in: uuids}};
  
  var aggregation_stages = [];
  
  aggregation_stages.push({ $match: query })
  aggregation_stages.push({ $sort : {"validity.startDate" : -1} });
  aggregation_stages.push({ $group: {_id          : "$componentUuid",
                                     componentUuid: {"$first": "$componentUuid"},
                                     type         : {"$first": "$type"},
                                     name         : {"$first": "$data.name"},
                                     last_edited  : {"$first": "$validity.startDate"},
                                     created      : {"$last" : "$validity.startDate"}} });
  aggregation_stages.push({ $sort : {last_edited : -1} });

  var items = await db.collection("components").aggregate(aggregation_stages).toArray();
  
  for(var doc of items)
  {
    for(var o of r.linkedTo[MUUID.from(doc._id).toString()])
    {
      Object.assign(o, {...doc});
    }
  }
  
  return r;
}


ComponentsModule.prototype.newUuid = function()
{
  /// Usage:
  ///   Components.newUuid()
  ///
  /// Ideally, we want to satisfy as many of the following criteria as possible in a good UUID:
  ///  - a) zero collision chance
  ///  - b) include some timestamp or other metadata
  ///  - c) first characters to be unique as possible, so that auto-complete works well
  ///
  /// This is a conundrum ... UUID.v1() is in principle entirely based on generation time and MAC address, so it does a) and b), but not c)
  /// On the other hand, UUID.v4 satisifies c) but not a) or b)
  /// ObjectId is close - it uses high bits for time, medium bits are random, and low bits are sequential-ordering to prevent conflict
  /// But the plot thickens - the UUID.v1() generation code cheats ns and MAC code, and also actually puts the medium time in the high bits, meaning they are in fact semi-random when not generated simultaneously!
  
  return MUUID.v1();
}


ComponentsModule.prototype.list = async function(match_condition, options)
{
  /// Usage:
  ///   Components.list(match_condition [, options])
  ///
  /// Options:
  ///   skip : number of listed jobs to ignore
  ///   limit: maximum number of listed jobs to display
  
  var aggregation_stages = [];
  var opts = options || {};
  
  if(match_condition)
  {
    if(match_condition.componentUuid)
    {
      if(match_condition.componentUuid['$in'])
      {
        match_condition.componentUuid['$in'] = match_condition.componentUuid['$in'].map(x => MUUID.from(x));
      }
    }
    
    aggregation_stages.push( { $match: match_condition });
  }
  
  aggregation_stages.push({ $sort: { "validity.startDate" : -1 } });
  aggregation_stages.push({ $group: {_id          : {componentUuid: "$componentUuid"},
                                     componentUuid: {"$first"     : "$componentUuid"},
                                     formId       : {"$first"     : "$formId"},
                                     formName     : {"$first"     : "$formName"},
                                     name         : {"$first"     : "$data.name"},
                                     last_edited  : {"$first"     : "$insertion.insertDate"},
                                     created      : {"$last"      : "$validity.startDate"}} });
  aggregation_stages.push({ $sort: {last_edited : -1} });
  
  if(opts.skip)  
  {
    aggregation_stages.push({ $skip: opts.skip });
  }
  
  if(opts.limit)  
  {
    aggregation_stages.push({ $limit: opts.limit });
  }
  
  var items = [...await db.collection("components").aggregate(aggregation_stages).toArray()];
  
  for(var c of items)
  {
    c.componentUuid = MUUID.from(c.componentUuid).toString();
  }
  
  return items;
}


Cache.add('componentCountsByType', async function()
{
  var arr =  await db.collection("components")
                     .aggregate([ {$group: {_id: {type: "$type",
                                                  uuid: "$componentUuid"}} },
                                  {$group: {_id  : "$_id.type", 
                                            count: {$sum: 1}} },
                                  {$project: {type: "$_id",
                                             count: true,
                                             _id  : false}} ])
                     .toArray();
  
  var retval = {};
  
  for(var el of arr)
  {
    retval[el.type] = el
  }
  
  return retval;
})


ComponentsModule.prototype.getTypes = async function()
{
  /// Usage:
  ///   Components.getTypes()
  
  return Cache.current('componentCountsByType');  
}









// for the Autocomplete Route
ComponentsModule.prototype.findUuidStartsWith = async function(uuid_string,types,max)
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
ComponentsModule.prototype.findRelationships = function(data)
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




// Search and retrieval


ComponentsModule.prototype.search = async function(txt,match,limit,skip)
{
  // logger.info("Components::search()",txt,match)
  var matchobj= match || {};
  if(matchobj.componentUuid) matchobj.componentUuid = MUUID.from(matchobj.componentUuid)

  skip = parseInt(skip); if(isNaN(skip)) skip = 0;
  limit = parseInt(limit); if(isNaN(limit)) limit = 0;

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


ComponentsModule.prototype.save = async function(input,req)
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
  if(!input.formId) throw new Error("No formId specified in saveComponent()");

  var _lock = await dbLock("saveComponent"+MUUID.from(input.componentUuid),1000);
  var old = await this.retrieve(componentUuid);
  logger.info("submit component",input);
  // logger.info("old one:",old);
  

  var record = {...input};
  record.componentUuid = MUUID.from(input.componentUuid);
  record.shortUuid = shortuuid.fromUUID(input.componentUuid);
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
  record.referencesComponents = this.findRelationships(record.data);

  // Do it!
  var result = await components.insertOne(record); // fixme TRANSACTION LOG wutg req.body.metadata
  _lock.release();

  if(result.insertedCount !== 1) throw new Error("Could not insert new form record.");
  var outrecord = {...result.ops[0]};
  outrecord.componentUuid = MUUID.from(record.componentUuid).toString();

  Cache.invalidate('componentCountsByType');  
  return outrecord;
}

