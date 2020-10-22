'use strict';


// Programming note:
// top level module code only executes once!
// This code will only be run by first require-er.

// conifig defaults:
var defaults = {
  deployment: 'laptop',  // laptop, devsite, or production. Passed to Pug to get templates right.
  my_url : "http://localhost:12313/", // url of this instance
  http_server_port: 12313, // port we're running on
  trust_proxy: true,

  // must include DB name.
  mongo_uri : "mongodb://localhost/sietch_dev", 
  // For authentication, use mongodb://user:pass@hostname
  mongo_options: {useNewUrlParser:true, useUnifiedTopology: true, connectTimeoutMS: 100, socketTimeoutMS: 30000, reconnectTries: 30000},
  // https_server_port: 12314, // port we're running on

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


  mail_config: {
    host: "smtp.example.com",
    secure: true, // true for 465, false for other ports
    requireTLS: true,  // no cleartext
    auth: {
      user: "username",
      pass: "mailpassword",
    }    
  },
  mail_from: "sietch@sietch.xyz",
  admin_email: "nathaniel.tagg@gmail.com",

  // used to encode JWT for m2m connections.
  // generate with
  // $ echo `openssl rand -base64 256`
  m2m_secret: '......',
}


var config;
if(!config) config = require('deepmerge')(defaults,require('./config.js'));
// console.log("config:",config);


module.exports = config;
