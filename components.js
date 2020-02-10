const express = require('express');

var MUUID = require('uuid-mongodb');
var jsondiffpatch = require('jsondiffpatch');
var chalk = require('chalk');
const { Binary } = require('mongodb');

var database = require('./database.js');  // Exports global 'db' variable
var permissions = require('./permissions.js');

var router = express.Router();

module.exports = {
  router,
  getComponents,
  retrieveComponent,
  saveComponent
}
var uuid_regex = ':uuid([A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12})';
var short_uuid_regex = ':shortuuid([123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ]{21,22})';

async function getComponents()
{
  console.log("getComponents");
  try{
    // var items = db.collection("components").find({}).project({componentUuid:1, type:1, name:1});
    var items = db.collection("components").aggregate([
      { $sort:{  effectiveDate : -1 } },
      { $group: {_id: { componentUuid : "$componentUuid" },
                 componentUuid: { "$first":  "$componentUuid" },
                 type: { "$first":  "$type" },
                 name: { "$first":  "$name" }
                }
      }
    ]);

    // sort by type.
    var out = {};
    var item;

    while (true) {
      item = await items.next()
      if(!item) break;
      item.componentUuid = MUUID.from(item.componentUuid).toString();
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

async function saveComponent(data,req)
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
      user: ((res.locals||{}).user||{}).email || "unknown",
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
      if(!permissions.hasDataEntryPrivs(req))  throw "You don't have data entry priviledges.";
      await components.insertOne(data); // fixme TRANSACTION LOG wutg req.body.metadata
    } else {
      console.log('existing record');
      if(!permissions.hasDataEditPrivs(req)) throw "Component UUID "+componentUuid+" is already in database and you don't have edit priviledges.";
      await components.insertOne(data); // fixme TRANSACTION LOG wutg req.body.metadata
    }
    return data;
}





// Autocomplete Route

router.get("/autocomplete/uuid",async function(req,res,next) {
  var q = req.query.q.replace(/[_-]/g,''); // Remove _ and - 
  console.log("query",q);

  // binary version.
  // pad with zeroes and FS.
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
  return res.json(matches)


  var matches = await db.collection("components")
    .find({componentUuid:{$regex: regex}})
    .project({"componentUuid":1,name:1})
    .toArray();
  for(m of matches) {
    m.val = m.componentUuid;
    m.text = m.val + ' ' +m.name;
  }
  console.log(matches);
  return res.json(matches)


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
})

// JSON Routes


// Pull component data as json doc.

router.get('/json/component/'+uuid_regex, permissions.middlewareCheckDataViewPrivs, async function(req,res){
  console.log("/json/component/"+req.params.uuid)
  if(!req.params.uuid) return res.status(400).json({error:"No uuid specified"});
  // fresh retrival
  var component= await retrieveComponent(req.params.uuid);
  if(!component)  return res.status(400).json({error:"UUID not found"});
  console.log(component);
  res.json(component);
});



// Post component changes.

router.post('/json/component/'+uuid_regex, permissions.middlewareCheckDataEditPrivs, async function(req,res,next){

  var componentUuid = (req.params.uuid) || shortuuid.toUUID(req.params.shortuuid);
  var data = req.body.data;

  if(!data.componentUuid) return res.status(400).json({error:"No uuid specified"});
  if(componentUuid != data.componentUuid) return res.status(400).json({error:"Form does not match url"});
  try {

    // metadata.
    var old = await retrieveComponent(componentUuid);
    console.log("submit component",data);
    console.log("old one:",old);
    // Add stuff to the record.

    // First, diff it with the old one.  Ignore submit subdocument
    delete data.submit;
    if(old) delete old.submit;

    data.effectiveDate = new Date(data.effectiveDate) || new Date(); // Get into native format.
    var diff = null;
    if(old) diff = jsondiffpatch.diff(old, data);

    // Add new bookkeeping fields
    data.submit = {
      insertDate: new Date(),
      ip: req.ip,
      user: req.user,
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
      if(permissions.hasDataEntryPrivs(req)) {
        await components.insertOne(data); // fixme TRANSACTION LOG wutg req.body.metadata
        console.log("inserted",data);
      }
      else return res.status(400).json({error:"You don't have data entry priviledges."});
    } else {
      console.log('existing record');
      if(permissions.hasDataEditPrivs(req)) {
        await components.insertOne(data); // fixme TRANSACTION LOG wutg req.body.metadata
      } else {
       return res.status(400).json({error:"Component UUID "+componentUuid+" is already in database and you don't have edit priviledges."});
      }
    }
    return res.json(data);

  } catch(err) {
    res.status(400).json({error:"Unknown failure: "+err})
  }
});




