'use strict';


// Programming note:
// top level module code only executes once!
// This code will only be run by first require-er.

// conifig defaults:
var defaults = {
  mongo_uri : "mongodb://localhost",
  mongo_db : "sietch_dev",
  my_url : "http://sietch.xyz/",
  http_server_port: 12313,
  localsecret: "this is a very well-kept secret" // for various local salting
}

var config;
if(!config) config = require('deepmerge')(defaults,require('./config.js'));
console.log("config:",config);


module.exports = config;
