'use strict';


// Programming note:
// top level module code only executes once!
// This code will only be run by first require-er.

// conifig defaults:
var defaults = {
  mongo_uri : "mongodb://localhost", // For authentication, use mongodb://user:pass@hostname
  mongo_db : "sietch_dev",	     // db name in mongo
  my_url : "http://sietch.xyz/", // url of this instance
  http_server_port: 12313, // port we're running on
  localsecret: "this is a very well-kept secret", // for various local salting


  // Authentication information so people can log in through auth0
  // Available on auth0 dashboard
  auth0_client_id: "XXxxXX",
  auth0_domain:   "dev-xxxxxxxx.auth0.com",
  auth0_client_secret: "XXxxxXXX",
}

var config;
if(!config) config = require('deepmerge')(defaults,require('./config.js'));
console.log("config:",config);


module.exports = config;
