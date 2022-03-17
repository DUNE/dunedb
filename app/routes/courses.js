"use strict";

const permissions = require('lib/permissions.js');
const Courses = require('lib/Courses.js');
const Components = require('lib/Components.js')('component');
const Forms = require('lib/Forms.js');
const express  = require("express");
const utils = require("lib/utils.js");
const logger = require('../lib/logger');

var router = express.Router();

module.exports = router;

// List of courses
router.get("/courses", permissions.checkPermission("tests:view"),
 async function(req,res,next) {
    try{
      let courses = await Courses.list() ;
      // console.log("Courses",courses);
      res.render('listCourses.pug',{courses})
    } 
    catch(err) { 
      logger.error(err,"error in router function"); //next(); 
    }

});

//Edit a course
router.get("/EditCourse/:courseId", permissions.checkPermission("tests:view"),
 async function(req,res,next) {
    try{
      let courseId = req.params.courseId;
      let course = await Courses.retrieve(courseId) || {};
      // console.log("EditCourse",courseId,course);
      res.render('EditCourse.pug',{courseId, course})
    } 
    catch(err) { 
      logger.error("error in router function",err); //next(); 
    }

});

// look at a course
router.get("/course/:courseId", permissions.checkPermission("forms:view"), 
  async function(req,res,next) {
    try{
      logger.info("finding course ",req.params.courseId)
      var options = {};
      // get stuff in one go
      var course = await Courses.retrieve(req.params.courseId);
      
      // Get all related objects.
      var components = await Components.list({"type":course.componentType});
      // var componentTypes = await Components.getComponentTypes();

      // console.log("returned components",components)
      var componentForms = await Forms.list("componentForms");
      if(!course) return res.status(404).render("No such course exists.");
      res.render("course",{course,components,componentForms});
  } catch(err) {  logger.error(err); res.status(400).send(err.toString()); }
});


// look at a how a component is doing in a course
router.get("/course/:courseId/"+utils.uuid_regex, 
    permissions.checkPermission("components:view"),
    async function(req,res,next) {
      var evalCourse = await Courses.evaluate(req.params.courseId,req.params.uuid);
      res.render("evaluated-course",{componentUuid:req.params.uuid,evalCourse});
    }
);

// redirect to the next step in a course.
// Add ?firstUnfinished=1 to get the first undone step.
router.get("/course/:courseId?/next/"+utils.uuid_regex+"?", 
    permissions.checkPermission("components:view"),
    async function(req,res,next) {

      var next_step = await Courses.nextStep(req.params.uuid,req.params.courseId,req.query.firstUnfinished);
      logger.info({next_step},"is the next step in object")
      if(!next_step) {
        return res.status(400).send(`Could not resolve request with course ${req.params.courseId} and component uuid ${req.params.uuid}`);
      } 

      var hash = "";
      if(next_step.identifier) {
          var key = encodeURIComponent(next_step.identifier);
          var val = encodeURIComponent(req.params.uuid);
          hash = "#" + key + '=' + val;
      }



      if(next_step.done) {
        return res.redirect("/course/"+req.params.courseId+"/"+req.params.uuid);
      }
      if(next_step.type == "component") {
        return res.redirect("/NewComponent/"+next_step.formId);
      }

      if(next_step.type == "job") {
        return res.redirect(`/job/${next_step.formId}`+hash);
      }
      if(next_step.type == "test") {
        return res.redirect(`/${req.params.uuid}/test/${next_step.formId}`);
      }
      return res.status(400).send("Could not figure out next step for object ${req.params.uuid}. The next step evaluated to ${JSON.stringify(next_step,null,2)");
    }
);


