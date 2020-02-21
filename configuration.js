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
  auth0_client_secret: "XXxxxXXX",
  auth0_domain:   "dev-pserbfiw.auth0.com",
  // Our Auth0 API knows about permission types.
  auth0_api_audience: 'https://sietch.xyz/api',  

  // machine-to-machine jwt authentication:
  auth0_jwksUri: `https://dev-pserbfiw.auth0.com/.well-known/jwks.json`,
  auth0_jwks_issuer: 'https://dev-pserbfiw.auth0.com/',

  // Permissions for people who haven't logged in
  default_permissions: ['components:view', 'tests:view', 'forms:view'],
}

var config;
if(!config) config = require('deepmerge')(defaults,require('./config.js'));
// console.log("config:",config);


module.exports = config;
