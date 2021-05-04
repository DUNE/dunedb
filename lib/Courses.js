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
  nextStep
}

async function save(input,req)
{
  // input MUST contain:
  // { courseId: < any form > ,
  //   componentType: < string > 
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
  if(!input.componentType) throw new Error("Courses.js save()  no componentType given")
  // sanity check the path
  function checkPath(path) {
    for(var step of path) {
      if(!step.type) throw new Error("Courses.js save() no type in step");
      if(step.type == "path") checkPath(step.path);
      else {
        if(!step.formId) throw new Error("Courses.js save() no type in step");
        if(step.type=="job" || step.type=="component") 
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
  

  record.validity = commonSchema.validity(record.validity, old);
  record.validity.ancestor_id = record._id;
  delete record._id;

  logger.info(input,"submit course");
  // logger.info("old one:",old);

  var result = await db.collection("courses").insertOne(record);

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

async function list_courses() {
        var pipeline = [];
        pipeline.push({ $sort:{  "validity.version" : -1 } });
        var grouping =     { $group: 
                                  { _id: "$courseId" ,
                                    courseId:         { "$first":  "$courseId" },
                                    name:             { "$first":  "$name" },
                                    courseObjectId:   { "$first": "$_id" },
                                    tags:             { "$first": "$tags"},
                                    icon:             { "$first": {"$arrayElemAt": ["$icon.url", 0]} },
                                    componentType:    { "$first": "$componentType"},
                                  }
                            }
        pipeline.push(grouping);

        var list = await db.collection("courses")
                            .aggregate(pipeline)
                            .toArray();

        var o = {};
        for(var item of list)  {
          o[item.courseId] = item;
          // Get the component type 
        }
        return o;
};
Cache.add("courseList",list_courses);


async function list()
{ 
  await list_courses()
  return await Cache.current("courseList");
}


async function getCourseForComponentType(type)
{
  var list = await list();
  for(courseId in list) {
    if( list[courseId].componentType == type ) return courseId;
  }
  return null;
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
    return Object.keys(tokens);
});



async function tags()
{
  Cache.invalidate("course_tags");
  return await Cache.current("course_tags");
}


async function evaluatePath(path,thing_id)
{
  var result  = [];
  // I could parallelize this with a Promise.all.
  for(var step of path) {
    var item = {...step};
    item.result = [];
    if(step.type == "component") {
      var match = {};
      match[step.identifier] = thing_id;
      match.type = step.formId;
      item.result = await Components.search(null,match)
      item.meta = (await Forms.list("componentForms"))[step.formId];
    }
    if(step.type == "test") {
      item.result = await Tests.listComponentTests(thing_id,step.formId);
      item.meta = (await Forms.list("testForms"))[step.formId];
    }
    if(step.type == "job") {
      var match = {};
      match[step.identifier] = thing_id;
      match.formId = step.formId;
      item.result = await Jobs.search(null,match,10);
      item.meta = (await Forms.list("jobForms"))[step.formId];
    }
    result.push(item);
  }
  return result;
}

async function evaluate(courseId,thing_id)
{
  var course = await retrieve(courseId);
  if(!course) throw new Error("Courses evaluate() No such courseId in database.");
  // Ok, let's test this object against everything in the path.
  // subfunction

  var result = {...course};
  result.evaluation = await evaluatePath(course.path,thing_id);

  // compute a score
  var score = 0;
  var denominator = 0;
  var most_recent = new Date(0);
  for(var step of result.evaluation) {
    if(step.result && step.result.length>0) {
      score++;
    }
    denominator++;
    for(var r of step.result)
     if(r.insertion.insertDate > most_recent) most_recent = r.insertion.insertDate;
  }
  result.score = score;
  result.score_denominator = denominator;
  result.most_recent = most_recent;
  result.next_step = nextStepFromEvaluation(result.evaluation);
  return result;
}

//
// Look at an evaluated path and see what the next step is.
function nextStepFromEvaluation(evaluated,firstUnfinished)
{
  // FIXME does not deal correctly with recursive paths.

  if(firstUnfinished) {
     for(var step of evaluated){
      if(!step.result || step.result.length==0) return step; // This is the first unfinished step
    }
    return {done:"All steps finished."} ; // There is no step left not to do!

  } else {
    
    // Here we're allowed to skip gaps. What I really want is to work from the end of the list, 
    // finding the unfinished step just after the last finished step
    var next_step = null;
    for(var i = evaluated.length-1; i>=0; i--) {
      if(evaluated[i].result.length==0) {
        if(i==0) return evaluated[i];  // We worked our way down the front, which is unfinshed
        if(evaluated[i-1].result.length>0) return evaluated[i]; // This prev step is finished, so this is the next
      }
    }    
    // All steps have been satisfied
    return {done:"All steps finished."} ; // There is no step left not to do!
  
  }
}

async function nextStep(componentUuid, courseId, firstUnfinished)
{
  if(componentUuid && !courseId) {
    // Take a reasonable guess at what course we should be doing
    var component = await Components.retrieve(componentUuid);
    courseId = getCourseForComponentType(component.type);
    if(!courseId) return null; // No good match.
  }
  if(!courseId) throw new Error("Couses.js nextStep() no courseId provided or valid componentUuid")
  var course = await retrieve(courseId);

  if(courseId && !componentUuid) {
    // return the first step in the course.
    return course.path[0];
  }


  // OK, we've got a valid object. Let's see what steps have been accomplished.
  var evaluated = await evaluatePath(course.path,componentUuid);
  return nextStepFromEvaluation(evaluated,firstUnfinished);

}


