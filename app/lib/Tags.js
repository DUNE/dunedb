"use strict";
const Courses = require("lib/Courses.js");
const Forms = require("lib/Forms.js");
const Cache = require("lib/Cache.js");

module.exports = {
  get
}


// async function getAllTags() {
//     var tags = [... new Set([...await Forms.tags(), ...await Courses.tags()])];
//     return tags;
// }

// Cache.add("tags_alltags",getAllTags(),["all_form_tags","course_tags"); 


async function get()
{
  return [... new Set([...await Forms.tags(), ...await Courses.tags()])];
}


