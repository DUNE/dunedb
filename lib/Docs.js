"use strict";
var database = require('lib/database.js');  // Exports global 'db' variable
var permissions = require('lib/permissions.js');
var commonSchema = require("lib/commonSchema.js");
var Cache = require("lib/Cache.js");
var dbLock = require("lib/dbLock.js");

module.exports = {
  save,
  retrieve,
  list,
  search
}


///
/// Save component record in database.
/// All calls should come through this function!
///
///



async function save(input,req)
{
  // input is of form:
  // { docId: "...",
  //   validity: {...}, // optional
  //   _id: "...", //optional
  //   data: "markdown string"
  // }
  // Check it conforms:
  var docId = input.docId;
  if(!docId) throw new Error("No docId specified in Docs::save()");
  if(!input.data) throw new Error("No data specified in Docs::save()");

  var _lock = await dbLock("saveDoc"+docId,1000);
  var old = await retrieve(docId);
  
  var record = {...input};
  record.insertion = commonSchema.insertion(req);
  record.validity = commonSchema.validity(record.validity, old);
  record.validity.ancestor_id = record._id;
  record.recordType = "doc";
  delete record._id;

  if(!old) {
    // No conflict. Is this user allowed to enter data?
    if(!permissions.hasPermission(req,'docs:create'))  {
      _lock.release();
      throw new Error("You don't have privileges to create new documents");
    }
  } else {
    // this is an edit to an existng record.
    if(!permissions.hasPermission(req,'docs:edit')) {
      _lock.release();
      throw new Error("Document ID "+docId+" is already in database and you don't have edit priviledges.");
    }
  }
  // Do it!
  var result = await db.collection("docs").insertOne(record); // fixme TRANSACTION LOG wutg req.body.metadata
  _lock.release();

  if(result.insertedCount !== 1) throw new Error("Could not insert new docs record.");
  var outrecord = {...result.ops[0]};

  Cache.invalidate('docList');  
  return outrecord;
}


async function retrieve(docId) {
  if(!docId) throw new Error("Docs::retrieve() no docId given.");
  var query = {docId: docId};

  var options = {};
  var res = await db.collection('docs')
                     .find(query,options)
                     .sort({"validity.startDate":-1,"validity.version":-1})
                     .limit(1).toArray();
  if(res.length<1) return null;

  return res[0];
}

Cache.add("docList",async function(){
    var aggregation_stages = [];
    aggregation_stages.push(   { $sort:{ "validity.startDate" : -1 } } );
    aggregation_stages.push(   { $group: {_id: { docId : "$docId" },
                                          docId: { "$first":  "$docId" },
                                          last_edited: { "$first": "$insertion.insertDate" },
                               } } );
    aggregation_stages.push(   { $sort:{ last_edited : -1 } } );
    // logger.info(JSON.stringify(aggregation_stages));
    var items = [...await db.collection("docs").aggregate(aggregation_stages).toArray()];
    return  items;
});


// Get list of all docs
async function list(options)
{
  options = options || {};
  var list = await Cache.current("docList");
  // if(options.skip) list=list.slice(options.skip);
  // if(options.limit) list = list.slice(0,options.limit);
  return list;
}




async function search(txt,match,limit,skip)
{
  // logger.info("Components::search()",txt,match)
  var matchobj= match || {};
  skip = parseInt(skip); if(isNaN(skip)) skip = 0;
  limit = parseInt(limit); if(isNaN(limit)) limit = 0;

  var result = [];
  if(txt) {
    matchobj["$text"] = {$search: txt};
    logger.info("Docs::search  text search",matchobj);
    result = await 
      db.collection('docs').aggregate([      
        // { $match: {$text: {$search: txt}}},
        { $match: matchobj },
        { $sort:{ score:{$meta:"textScore" }, "validity.startDate" : -1} },
        { $limit: (limit || 100)+(skip||0) },
        { $skip: skip || 0 },
        { $group: {_id: "$docId" ,
                    docId: { "$first":  "$docId" },
                    insertion: { "$first":  "$insertion" },
                    type: { "$first":  "$type" },
                    name: { "$first":  "$data.name" },
                    last_edited: { "$first": "$validity.startDate" },
                    created: { "$last": "$validity.startDate" },
                    recordType: { "$first": "$recordType" },
                    version: { "$first": "$validity.version"},
                    score: {"$max" : {$meta:"textScore" }}
                        }
            },
        { $sort: {score: -1, last_edited:-1} },
      ]).toArray();
    } else {
      logger.info(matchobj,"Components::search non-text search");
      result = await 
        db.collection('docs').aggregate([      
          // { $match: {$text: {$search: txt}}},
          { $match: matchobj },
          { $sort:{ "validity.startDate" : -1, _id:-1 } },
          { $limit: (limit || 100)+(skip||0) },
          { $skip: skip || 0 },
        { $group: {_id: "$docId" ,
                    docId: { "$first":  "$docId" },
                    insertion: { "$first":  "$insertion" },
                    type: { "$first":  "$type" },
                    name: { "$first":  "$data.name" },
                    last_edited: { "$first": "$validity.startDate" },
                    created: { "$last": "$validity.startDate" },
                    recordType: { "$first": "$recordType" },
                    version: { "$first": "$validity.version"},
                        }
              },
          { $sort: {last_edited:-1} },
      ]).toArray();

    }
    for(var rec of result) {
      rec.route = "/doc/"+rec.docId;
    }
    return result;
}