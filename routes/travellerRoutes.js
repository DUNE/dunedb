// pug routes
const chalk = require('chalk');
const express = require('express');
const shortuuid = require('short-uuid')();
const MUUID = require('uuid-mongodb');
const moment = require('moment');
const deepmerge = require('deepmerge');

const Components = require('lib/Components.js');
const ComponentTypes = require('lib/ComponentTypes.js');
const Courses = require('lib/Courses.js');
const Jobs = require("lib/Jobs.js")();
const permissions = require('lib/permissions.js');
const Forms = require('lib/Forms.js');
const Tests = require('lib/Tests.js')('test');
const utils = require("lib/utils.js");

var router = express.Router();

module.exports = router;


// A variant for traveller doc. Might want to adopt this instead for above.
router.get('/traveller/'+utils.uuid_regex, 
  //permissions.checkPermission("components:view"),
  async function(req,res,next) {
    var componentUuid = req.params.uuid;
    Courses.getCourseForComponentType()
    let [component,tests]= await Promise.all([
        Components.retrieve(componentUuid),
        Tests.getRecentComponentTests(componentUuid),
      ]);


    var courseId = await Courses.getCourseForComponentType(component.type);
    var evaluatedCourse = null;
    var jobs = [];
    // console.log("courseId",courseId)
    if(courseId) {
      evaluatedCourse = await Courses.evaluate(courseId,componentUuid);

      var jobs = [];
      // look for relevant workflows.
      for(var step of evaluatedCourse.evaluation) {
        if(step.type == "job")
          if(step.result.length>0)
            jobs.push(step.result[0]);
      }

      var jobPromises = [];
      // console.log("jobs",jobs);
      for(var job of jobs) jobPromises.push(Jobs.retrieve(job.jobId))
      jobs = await Promise.all(jobPromises);
    }    
    var records = [component];
    if(evaluatedCourse) records.push(evaluatedCourse);
    records.push(...tests);
    records.push(...jobs);
    // console.log(records);

    res.render("traveller.pug",{component,componentUuid,records});
  })
