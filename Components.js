const express = require('express');

var MUUID = require('uuid-mongodb');
var jsondiffpatch = require('jsondiffpatch');
var chalk = require('chalk');
const { Binary } = require('mongodb');

var database = require('./database.js');  // Exports global 'db' variable
var permissions = require('./permissions.js');


module.exports = {
  getComponents,
  retrieveComponent,
  saveComponent,
  findUuidStartsWith,
}

async function getComponents(type)
{
  console.log("getComponents");
  try{

    var aggregation_stages = [];
    if(type) aggregation_stages.push( { $match: {type: type} }          );
    aggregation_stages.push(          { $sort:{  effectiveDate : -1 } } );
    aggregation_stages.push(          { $group: {_id: { componentUuid : "$componentUuid" },
                                                       componentUuid: { "$first":  "$componentUuid" },
                                                       type: { "$first":  "$type" },
                                                       name: { "$first":  "$name" }
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
      // console.log("item",item);

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
  if(rollbackDate) query["submit.insertDate"] = {$lt: rollbackDate};  // rollback to things inserted before this time
  if(onDate) query.effectiveDate = {$lt: onDate}; // rollback to things that happened before this time
  console.log("retrieveComponent",...arguments,query);
  var resall =  await db.collection('components').find(query).toArray();
  console.log(chalk.red('------finding component------'),query);
  console.dir(resall);
  var res = await db.collection('components').find(query).sort({effectiveDate:-1,"submit.version":-1}).limit(1).toArray();
  console.log("res",res);
  if(res.length<1) return null;
  res[0].componentUuid = MUUID.from(res[0].componentUuid).toString();
  return res[0];
}

async function saveComponent(data,req,user)
{
    var componentUuid = data.componentUuid;
    if(!componentUuid) throw "No componentUuid specified in saveComponent()";
    // metadata.
    var old = await retrieveComponent(componentUuid);
    console.log("submit component",data);
    console.log("old one:",old);
    // Add stuff to the record.

    // First, diff it with the old one.  Ignore submit subdocument
    delete data.submit;
    if(old) delete old.submit;

    data.effectiveDate = data.effectiveDate ? new Date(data.effectiveDate) : new Date();
    var diff = null;
    if(old) diff = jsondiffpatch.diff(old, data);

    // Add new bookkeeping fields
    data.submit = {
      insertDate: new Date(),
      ip: req.ip,
      user: user,
      version: ( ((old||{}).submit||{}).version || 0 ) + 1,
      diff_from: (old||{})._id,
      diff: diff,
    }

    // Edited units will still have the _id and other stuff floating around..
    delete data._id;

    // Change to BSON uuid.
    data.componentUuid = MUUID.from(data.componentUuid);

    var components = db.collection("components");
    if(!old) {
      // No conflict. Is this user allowed to enter data?
      if(!permissions.hasPermission(req,'components:create'))  throw "You don't have data entry priviledges.";
      await components.insertOne(data); // fixme TRANSACTION LOG wutg req.body.metadata
    } else {
      console.log('existing record');
      if(!permissions.hasPermission(req,'components:edit')) throw "Component UUID "+componentUuid+" is already in database and you don't have edit priviledges.";
      await components.insertOne(data); // fixme TRANSACTION LOG wutg req.body.metadata
    }
    return data;
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
    .project({"componentUuid":1,name:1})
    .toArray();
  for(m of matches) {
    m.val = MUUID.from(m.componentUuid).toString();
    m.text = m.val + ' ' +m.name;
  }
  console.log(matches);
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






