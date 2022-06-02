"use strict";
const Workflows = require("lib/Workflows.js");
const Forms = require("lib/Forms.js");

module.exports = {
  get
}


async function get()
{
  return [... new Set([...await Forms.tags(), ...await Workflows.tags()])];
}


