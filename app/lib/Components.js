
'use strict';

const Binary = require('mongodb').Binary;
const Cache = require("lib/Cache.js");
const commonSchema = require("lib/commonSchema.js");
const componentRelationships = require("lib/component_relationships.js");
const { db } = require('./db');
const dbLock = require("lib/dbLock.js");
const logger = require('./logger');
const permissions = require('lib/permissions.js');
const shortuuid = require('short-uuid')();

var MUUID = require('uuid-mongodb');
module.exports = function(type) {return new ComponentsModule(type)};

function ComponentsModule()
{
  this._type == 'component';
  this._collection = 'components';
  this._formCollection = 'componentForms';
}


ComponentsModule.prototype.findRelationships = function(data)
{
  /// Usage:
  ///  Components.findRelationships(data)
  ///
  /// This function is only used by the Components.save() function
  
  var list = [];
  
  function recurse(thing)
  {
    for(var i in thing)
    {
      var obj = thing[i];
      
      if ((typeof obj === "object") || (typeof obj === "array"))
      {
        recurse(obj);
      }
      else if ((typeof obj === 'string') || (obj instanceof Binary))
      {
        try
        {
          muuid = MUUID.from(obj);
          list.push(muuid);
        } 
        catch(err)
        {
          logger.error(err);
        };
      }
    }
  }
  
  recurse(data);
  return list;
}


ComponentsModule.prototype.save = async function(input, req)
{
  /// Usage:
  ///   Components.save(input, req)
  ///
  /// The 'input' must contain the following fields at minimum:
  ///   componentUuid: full 36 character UUID
  ///   formId       : component type form ID
  ///   data         : component information entered by the user
  ///   validity     : { startDate,
  ///                    version }
  ///   metadata     : submission metadata
  ///
  /// The 'req' must be a valid Express request, including 'user' and 'ip' fields
  /// These fields will be used to populate the component's 'insertion' field
  
  if(!input.componentUuid)
  {
    throw new Error("Components::save() - the component UUID has not been specified!");
  }
  
  if(!input.formId)
  {
    throw new Error("Components::save() - the component type form ID has not been specified!");
  }
  
  if(!input.data)
  {
    throw new Error("Components::save() - input data has not been specified!");
  }
  
  var _lock = await dbLock("saveComponent" + MUUID.from(input.componentUuid), 1000);
  var old = await this.retrieve(input.componentUuid);
  
  var record = {...input};
  record.componentUuid = MUUID.from(input.componentUuid);
  record.shortUuid = shortuuid.fromUUID(input.componentUuid);
  record.recordType = this._type;
  record.relatedComponents = this.findRelationships(record.data);
  record.insertion = commonSchema.insertion(req);
  record.validity = commonSchema.validity(record.validity, old);
  record.validity.ancestor_id = record._id;
  
  delete record._id;
  
  if(!old)
  {
    if(!permissions.hasPermission(req, 'components:edit'))
    {
      _lock.release();
      throw new Error("Components::save() - you don't have permission [components:edit] to create/edit components!");
    }
  }
  else
  {
    if(!permissions.hasPermission(req, 'components:edit'))
    {
      _lock.release();
      throw new Error("Components::save() - a component with this UUID: " + input.componentUuid + " already exists in the database, and you don't have permission [components:edit] to create/edit components!");
    }
  }
  
  var result = await db.collection(this._collection)
                       .insertOne(record);
  _lock.release();

  if(result.insertedCount !== 1)
  {
    throw new Error("Components::save() - failed to insert a new component record into the database!");
  }
  
  var outrecord = {...result.ops[0]};
  outrecord.componentUuid = MUUID.from(record.componentUuid).toString();

  Cache.invalidate('componentCountsByType');  
  return outrecord;
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
    throw new Error("Components::retrieve() - the componentUuid has not been given!");
  }
  
  query.componentUuid = MUUID.from(query.componentUuid);
  
  var options = {};
  
  if(projection)
  {
    options.projection = projection;
  }
  
  var res = await db.collection(this._collection)
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
    throw new Error("Components::versions()- the componentUuid has not been given!");
  }
  
  query.componentUuid = MUUID.from(query.componentUuid);
  
  var res = await db.collection(this._collection)
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

  var items = await db.collection(this._collection)
                      .aggregate(aggregation_stages)
                      .toArray();
  
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
  ///   skip : number of listed components to ignore
  ///   limit: maximum number of listed components to display
  
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
  
  var items = [...await db.collection(this._collection)
                          .aggregate(aggregation_stages)
                          .toArray()];
  
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
                                  {$project: {type : "$_id",
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


ComponentsModule.prototype.autocompleteUuid = async function(uuid_string, types, limit)
{
  /// Usage:
  ///  Components.autocompleteUuid(UUID, types, limit)
  ///
  /// Options:
  ///  UUID  - component UUID string to match to
  ///  types - component types to limit the matching to
  ///  limit - maximum number of matched component UUIDs to display
  ///
  /// This function is only used by the component UUID autocomplete route
  
  limit = limit || 10;

  var q     = uuid_string.replace(/[_-]/g, '');
  var qlow  = q.padEnd(32, '0');
  var qhigh = q.padEnd(32, 'F');
  
  var bitlow  = Binary(Buffer.from(qlow , 'hex'), Binary.SUBTYPE_UUID);
  var bithigh = Binary(Buffer.from(qhigh, 'hex'), Binary.SUBTYPE_UUID);
  
  var query = {componentUuid: {$gte: bitlow, 
                               $lte: bithigh}};
  
  if(types)
  {
    query.type = {$in: types};
  }
  
  var matches = await db.collection(this._collection)
                        .find(query)
                        .project({"componentUuid": 1, 
                                  "type"         : 1,
                                  "data.name"    : 1})
                        .limit(limit)
                        .toArray();
  
  for(var m of matches)
  {
    m.componentUuid = MUUID.from(m.componentUuid).toString();
  }
  
  return matches;
}


ComponentsModule.prototype.search = async function(txt, match, limit, skip)
{
  /// Usage:
  ///  Components.search(txt, match [, limit, skip]
  ///
  /// Either 'txt' (a text search) or 'match' (a specific DB entry to search for) should be provided
  /// Optional arguments are:
  ///   limit: maximum number of found components to display
  ///   skip : number of found components to ignore
  
  var matchobj = match || {};
  
  if(matchobj.componentUuid)
  {
    matchobj.componentUuid = MUUID.from(matchobj.componentUuid)
  }

  limit = parseInt(limit);
  
  if(isNaN(limit))
  {
    limit = 100;
  }

  skip = parseInt(skip);
  
  if(isNaN(skip))
  {
    skip = 0;
  }
  
  var result = [];
  
  if(txt)
  {
    matchobj["$text"] = {$search: txt};
    
    result = await db.collection(this._collection)
                     .aggregate([ {$match: matchobj},
                                  {$sort : {score: {$meta: "textScore"}, 
                                            "validity.startDate" : -1}},
                                  {$limit: limit},
                                  {$skip : skip},
                                  {$group: {_id: { componentUuid: "$componentUuid" },
                                                   componentUuid: { "$first": "$componentUuid" },
                                                   insertion    : { "$first": "$insertion" },
                                                   type         : { "$first": "$type" },
                                                   name         : { "$first": "$data.name" },
                                                   last_edited  : { "$first": "$validity.startDate" },
                                                   created      : { "$last" : "$validity.startDate" },
                                                   recordType   : { "$first": "$recordType" },
                                                   score        : { "$max"  : {$meta: "textScore"} }}},
                                  {$sort : {score: -1, 
                                            last_edited: -1}} ])
                     .toArray();
  }
  else
  {
    result = await db.collection(this._collection)
                     .aggregate([ {$match: matchobj},
                                  {$sort : {"validity.startDate" : -1,
                                            _id: -1}},
                                  {$limit: limit},
                                  {$skip : skip},
                                  {$group: {_id: { componentUuid: "$componentUuid" },
                                                   componentUuid: { "$first": "$componentUuid" },
                                                   insertion    : { "$first": "$insertion" },
                                                   type         : { "$first": "$type" },
                                                   name         : { "$first": "$data.name" },
                                                   last_edited  : { "$first": "$validity.startDate" },
                                                   created      : { "$last" : "$validity.startDate" },
                                                   recordType   : { "$first": "$recordType" }}},
                                  {$sort : {last_edited: -1}} ])
                     .toArray();
  }
  
  var output = [];
  
  for(var el of result)
  {
    var o = {...el};
    o.componentUuid = MUUID.from(el.componentUuid).toString();
    o.route = '/' + this._type + '/' + o.componentUuid;
    
    output.push(o);
  }
  
  return output;
}

