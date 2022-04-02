
'use strict';

const Courses = require("lib/Courses.js");
const Forms = require("lib/Forms.js");

module.exports = {get};


async function get()
{
  return [... new Set([...await Forms.tags(), ...await Courses.tags()])];
}

