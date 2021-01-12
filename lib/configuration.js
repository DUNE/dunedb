'use strict';

// Programming note:
// top level module code only executes once!
// This code will only be run by first require-er.


if(!global.config) {
  var defaults = require("../config/defaults.js");
  global.config = require('deepmerge')(defaults,require('../config/config.js'));
}


module.exports = global.config;
