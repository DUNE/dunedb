"use strict";

const permissions = require('../lib/permissions.js');
const Courses = require('../lib/Courses.js');
const express  = require("express");
const utils = require("../lib/utils.js");

var router = express.Router();

module.exports = router;

// HTML/Pug routes:

// look at a course
router.get("/course/:courseId", permissions.checkPermission("forms:view"), 
  async function(req,res,next) {
    try{
      logger.info("finding course ",req.params.courseId)
      var options = {};
      // get stuff in one go
      var course = await Courses.retrieve(req.params.courseId);
      if(!course) return res.status(404).render("No such course exists.");
      res.render("course",{course});
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



