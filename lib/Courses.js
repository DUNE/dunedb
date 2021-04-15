"use strict";

const database = require("./database.js");
const ObjectID = require('mongodb').ObjectID;
const MUUID = require('uuid-mongodb');
const chalk = require("chalk");
const commonSchema = require("./commonSchema");
const permissions = require('./permissions');
const Forms = require("./Forms.js");
const Tests = require("./Tests.js")();
const Jobs = require("./Jobs.js")();
const Components = require("./Components.js");
const Cache = require("./Cache.js");
var dbLock = require("./dbLock.js");


module.exports = {
  save,
  retrieve,
  list,
  evaluate,
  tags,
  getRelatedComponents,
}

async function save(input,req)
{
  // input MUST contain:
  // { courseId: < any form > ,
  //  path: [<step>,...];
  // Can contain:
  //  validity: {},
  //  icon: {},
  //  name: "...",
  //  tags: [],
  // }

  if(!permissions.hasPermission(req,'forms:edit'))  {
        throw new Error("You don't have data entry priviledges; need forms:edit");
  }

  if(!input) throw new Error("Courses.js save(): no input data provided");
  if(!input.courseId) throw new Error("Courses.js save(): courseId not defined");
  if(!input.path) throw new Error("Courses.js save():: no path given");
 
  // sanity check the path
  function checkPath(path) {
    for(var step of path) {
      if(!step.type) throw new Error("Courses.js save() no type in step");
      if(step.type == "path") checkPath(step.path);
      else {
        if(!step.formId) throw new Error("Courses.js save() no type in step");
        if(step.type=="job") 
          if(!step.identifier || step.identifier.length<1) throw new Error("Courses.js save() no field identifier in step "+step.formId);
      }
    }
  }
  checkPath(input.path);

  var record = {...input};
  record.recordType = "course"; // required
  record.insertion = commonSchema.insertion(req);
  var _lock = await dbLock("saveCourse"+input.courseId,1000);
  var old = await retrieve(record.courseId);
  
  console.log("retrieved old",old)

  record.validity = commonSchema.validity(record.validity, old);
  record.validity.ancestor_id = record._id;
  console.log('new validity:',record.validity)
  delete record._id;

  logger.info(input,"submit course");
  // logger.info("old one:",old);

  var result = await db.collection("courses").insertOne(record)

  console.log("inserted");
  _lock.release();

  Cache.invalidate("courseList");
  Cache.invalidate("course_tags");

  if(result.insertedCount !== 1) throw new Error("Could not insert new form record.");
  var outrecord = {...result.ops[0]};

  return outrecord;
}


async function retrieve(courseId,options)
{
    // Find the right course
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

  var query = {courseId};
  options = options || {};
  if(!query.courseId) throw new Error("Courses::retrieve() no courseId given.");

  if(options.rollbackDate) query["insertion.insertDate"] = {$lt: options.rollbackDate};  // rollback to things inserted before this time
  if(options.onDate) query["validity.startDate"] = {$lt: new Date(options.onDate)}; // rollback to things that happened before this time
  // else               query["validity.startDate"] = {$lt: new Date()}; // rollback to things that happened before this time
  if(options.version) query["validity.version"] = options.version; // rollback to things that happened before this time
  if(options.id) query["_id"] = ObjectID(options.id); // A specific instance.

  logger.info(chalk.blue("Courses retrieve()  Requesting course for",...arguments,JSON.stringify(query,null,2)));
  var rec = await db.collection("courses").find(query).sort({"validity.version":-1}).limit(1).toArray();
  if(rec.length<1) return null;
  return rec[0];
}

Cache.add("courseList",async function() {
        var pipeline = [];
        pipeline.push({ $sort:{  "validity.version" : -1 } });
        var grouping =     { $group: 
                                  { _id: "$courseId" ,
                                    courseId:         { "$first":  "$courseId" },
                                    name:             { "$first":  "$name" },
                                    courseObjectId:   { "$first": "$_id" },
                                    tags:             { "$first": "$tags"},
                                    icon:             { "$first": {"$arrayElemAt": ["$icon.url", 0]} }
                                  }
                            }
        pipeline.push(grouping);

         var list = await db.collection("courses")
                            .aggregate(pipeline)
                            .toArray();

        var o = {};
        for(var item of list)  {
          o[item.courseId] = item;
        }
        return o;
})

async function list(collection)
{ 
  return await Cache.current("courseList");
}


Cache.add("course_tags",async function() {
    // Simultaneous queries. Fun!
    var tags_lists = await Promise.all([
          db.collection("courses").distinct("tags"),
        ]);
    // This gives three arrays of results. we want to concatenate
    // and take only unique values. Turn each array element into a key.
    var tokens = {};
    for(var arr of tags_lists)
      tokens = arr.reduce((acc,curr)=> (acc[curr]=1,acc),tokens);
    delete tokens.Trash;
    console.log("course_tags",tokens)
    return Object.keys(tokens);
});



async function tags()
{
  Cache.invalidate("course_tags");
  return await Cache.current("course_tags");
}

async function evaluate(courseId,thing_id)
{
  var course = await retrieve(courseId);
  if(!course) throw new Error("Courses evaluate() No such courseId in database.");
  // Ok, let's test this object against everything in the path.
  // subfunction
  async function evaluatePath(path,thing_id)
  {
    var result  = [];
    // I could parallelize this with a Promise.all.
    for(var step of path) {
      console.log("evaluate step",step);
      var item = {...step};
      item.result = [];
      if(step.type == "component") {
        var c = await Components.retrieve(thing_id,{componentUuid:1,type:1,"data.name":1,insertion:1,validity:1});
        if(c) item.result = [c];
        item.meta = (await Forms.list("componentForms"))[step.formId];
      }
      if(step.type == "test") {
        item.result = await Tests.listComponentTests(thing_id,step.formId);
        item.meta = (await Forms.list("testForms"))[step.formId];
      }
      if(step.type == "job") {
        var match = {};
        match[step.identity] = thing_id;
        match.formId = step.formId;
        item.result = await Jobs.search(null,match,10);
        item.meta = (await Forms.list("jobForms"))[step.formId];
      }
      if(step.type == "path") {
        item.result = await evaluatePath(step.path,thing_id);
      }
      result.push(item);
    }
    return result;
  }
  var result = {...course};
  result.evaluation = await evaluatePath(course.path,thing_id);
  return result;
}


async function getRelatedComponents(course)
{
  function findComponentTypes(path)
  {
    // find the component types.
    var types = [];
    for(var step of path) {
      console.log("step",step)
      if(step.type == "component") types.push(step.formId);
      if(step.type == "path")      types.push(...findComponentTypes(step.path));
    }
    return types;
  }
  var types = findComponentTypes(course.path);
  // find them.
  var bag = await Components.list({type:{$in:types}})
  // sort into types
  var retval = {}
  for(var c of bag) {
    retval[c.type] = [...(retval[c.type] || []),c];
  }
  return retval;
}