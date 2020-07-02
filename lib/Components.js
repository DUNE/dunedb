"use strict";

const express = require('express');

var MUUID = require('uuid-mongodb');
var jsondiffpatch = require('jsondiffpatch');
var chalk = require('chalk');
const { Binary } = require('mongodb');

var database = require('./database.js');  // Exports global 'db' variable
var permissions = require('./permissions.js');
var commonSchema = require("./commonSchema.js");

module.exports = {
  getComponents,
  retrieveComponent,
  retrieveComponentChangeDates,
  saveComponent,
  findUuidStartsWith,
  newUuid
}


///
/// Save component record in database.
/// All calls should come through this function!
///
///



async function saveComponent(input,req)
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
  if(!input.data.type) throw new Error("No data.type specified in saveComponent()");

  
  var old = await retrieveComponent(componentUuid);
  console.log("submit component",input);
  console.log("old one:",old);
  

  var record = {...input};
  record.componentUuid = MUUID.from(input.componentUuid);
  record.recordType = "component"; // required
  record.insertion = commonSchema.insertion(req);
  record.type = input.data.type;
  delete record._id;

  record.validity = commonSchema.validity(record.validity, old);

  var components = db.collection("components");
  if(!old) {
    // No conflict. Is this user allowed to enter data?
    if(!permissions.hasPermission(req,'components:create'))  throw new Error("You don't have data entry priviledges.");
  } else {
    // this is an edit to an existng record.
    if(!permissions.hasPermission(req,'components:edit')) throw new Error("Component UUID "+componentUuid+" is already in database and you don't have edit priviledges.");
  }


  // Can do here: insert relationship data.
  record.referencesComponents = findRelationships(record.data);

  // Do it!
  var result = await components.insertOne(record); // fixme TRANSACTION LOG wutg req.body.metadata
  if(result.insertedCount !== 1) throw new Error("Could not insert new form record.");
  var outrecord = {...result.ops[0]};
  outrecord.componentUuid = MUUID.from(record.componentUuid).toString();
  return outrecord;
}




// Fixme: change 'type' to a match_condition object, e.g. {type: <string>} 
async function getComponents(type)
{
  console.log("getComponents");
  try{
    var match_condition = {"data.type": type};
    var aggregation_stages = [];
    if(type) aggregation_stages.push( { $match: match_condition }  );
    aggregation_stages.push(          { $sort:{ "validity.startDate" : -1 } } );
    aggregation_stages.push(          { $group: {_id: { componentUuid : "$componentUuid" },
                                                       componentUuid: { "$first":  "$componentUuid" },
                                                       type: { "$first":  "$data.type" },
                                                       name: { "$first":  "$data.name" }
                                      } } );
    // var items = db.collection("components").find({}).project({componentUuid:1, type:1, name:1});
    // console.dir(aggregation_stages);
    var items = db.collection("components").aggregate(aggregation_stages);

    // sort by type.
    var out = {};
    var item;

    while (true) {
      item = await items.next()
      if(!item) break;
      item.componentUuid = MUUID.from(item.componentUuid).toString();
      delete item._id;
      console.log("item",item);

      var type = item.type || "unknown";
      out[type] = out[type] || [];
      out[type].push(item);
    }
    // console.log("getComponents",out);
    return out;

  } catch(err) {
    console.error(err);

    return {}; 
  }
}



async function retrieveComponent(componentUuid,onDate,rollbackDate) {
  // Find the right component
  // rollbackdate and onDate must be in native Date() format or null

  var query = {componentUuid:MUUID.from(componentUuid)}; // binary form.
  if(rollbackDate) query["insertion.insertDate"] = {$lte: rollbackDate};  // rollback to things inserted before this time
  if(onDate)       query["validity.startDate"] = {$lte: onDate}; // rollback to things that happened before this time
  console.log("retrieveComponent",...arguments,query);
  // var resall =  await db.collection('components').find(query).toArray();
  // console.log(chalk.red('------finding component------'),query);
  // console.dir(resall);
  var res = await db.collection('components').find(query).sort({"validity.startDate":-1,"validity.version":-1}).limit(1).toArray();
  console.log("res",res);
  if(res.length<1) return null;

  res[0].componentUuid = MUUID.from(res[0].componentUuid).toString();
  console.log('retrieve component',componentUuid, res[0].componentUuid )
  return res[0];
}

async function retrieveComponentChangeDates(componentUuid,rollbackDate) {
  // Find the right component
  // rollbackdate and onDate must be in native Date() format or null
  var query = {componentUuid:MUUID.from(componentUuid)}; // binary form.
  if(rollbackDate) query["insertion.insertDate"] = {$lt: rollbackDate};  // rollback to things inserted before this time
  var resall =  await db.collection('components').find(query).project({"validity":1,"insertion":1}).sort({"validity.startDate":-1}).toArray();
  console.log(chalk.red('------finding component versions------'),query);
  console.dir(resall);
  return resall;
}






// for the Autocomplete Route
async function findUuidStartsWith(uuid_string)
{
  // binary version.

  // sanitize string of all extra characters.
  var q = uuid_string.replace(/[_-]/g,'');

  // pad with zeroes and "F"s.
  var qlow = q.padEnd(32,'0');
  var qhigh = q.padEnd(32,'F');
  console.log(qlow,qhigh);
  var bitlow = Binary(Buffer.from(qlow, 'hex'),Binary.SUBTYPE_UUID);
  var bithigh =  Binary(Buffer.from(qhigh, 'hex'),Binary.SUBTYPE_UUID);
  console.log(qlow,qhigh,bitlow,bithigh);
  var regex = new RegExp(`^${q}*`);
  console.log(regex);
  var matches = await db.collection("components")
    .find({componentUuid:{$gte: bitlow, $lte: bithigh}})  // binary UUIDs only
     // .find({$or: [{componentUuid:{$gte: bitlow, $lte: bithigh}}, {componentUuid:{$regex: regex}}] }) // mixed (bad)
     //    .find({componentUuid:{$regex: regex}}) // text version
    .project({"componentUuid":1, 'data.name':1})
    .toArray();
  if(matches.length>20) return null; // too many!
  console.log(matches);
  for(var m of matches) {
    m.val = MUUID.from(m.componentUuid).toString();
    m.text = m.val + ' ' +m.data.name;
  }
  console.log('matches',matches)
  return matches;

  // text version.

  // var regex = new RegExp(`^${q}*`);
  // var matches = await db.collection("components")
  //   .find({componentUuid:{$regex: regex}})
  //   .project({"componentUuid":1,name:1})
  //   .toArray();
  // for(m of matches) {
  //   m.val = m.componentUuid;
  //   m.text = m.val + ' ' +m.name;
  // }
  // console.log(matches);
  // return res.json(matches)
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






