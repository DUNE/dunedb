#!/usr/bin/env node
"use strict";

global.config = require('../configuration.js');  // must be first
var database = require('../lib/database.js'); // Exports global 'db' variable

var express = require('express');
var router = express.Router();
var util = require('util');
var url = require('url');
var querystring = require('querystring');
var jwt = require('jsonwebtoken');
var crypto = require('crypto');

async function AddMachineUser(userinfo)
{
  //userinfo should be an object with:
  // permissions: [ "thing:write", ...]
  // email: "blah@blah"
  // displayName
  if(!userinfo.email) throw "no email provided";
  if(!userinfo.displayName) throw "no Display Name provided";


  // Need to populate user info in DB:
  // user_id
  // displayName
  // emails [ {value: "blah@blah"} ]
  // permissions:
  var secret = "secret" + crypto.randomBytes(64).toString('hex');
  var user = {
    user_id: userinfo.user_id ||"m2m" + crypto.randomBytes(8).toString('hex'),
    displayName: userinfo.displayName || "MachineClient",
    emails: [userinfo.email || "unknown@uunknown.edu"],
    permissions: userinfo.permissions 
                  || global.config.default_user_permissions 
                  || [ 'components:create', 'components:edit', 'tests:edit', 'tests:submit', 'tests:view', 'jobs:view', 'forms:edit', 'jobs:edit', 'jobs:submit',
                       'dev:components:create', 'dev:components:edit', 'dev:tests:edit', 'dev:tests:submit', 'dev:tests:view', 'dev:jobs:view', 'dev:forms:edit', 'dev:jobs:edit', 'dev:jobs:submit'],
  }
  // create the record.
  var record = {
      user_id: user.user_id,
      user: user,
      secret: secret
  };
  await db.collection('m2mUsers').insertOne(record);

  return record;
}

async function AuthenticateMachineUser(user_id,secret)
{
  // if correct, return the JWT token.
  // if incorrect, return null
  var rec = await db.collection('m2mUsers').findOne({user_id: user_id, secret: secret});
  // if(!rec) throw "No such user_id and secret";
  if(!rec) return null;
  // return a token.
  var options = {
    expiresIn: "7 days",
    audience: "sietch-m2m",
  }
  return jwt.sign(rec.user,config.m2m_secret,options);
}


module.exports = {
  AuthenticateMachineUser: AuthenticateMachineUser,
  AddMachineUser: AddMachineUser
}





//////////////////////////////////////////////////////////////////////////////////////////////////





if (require.main === module) {
  var argv = require('yargs')
              .usage("This creates a new m2m user")
              .options({
                email: {
                          description: "Email address to label this user as",
                          required: true
                        },
                name: { 
                          description: "Display name to show",
                          required: true
                        },
                // permissions: { 
                //           description: "Permissions to give",
                //           required: false
                //         }
              })
              .argv;

  console.log("Generating new M2M user for");
  console.log("        email:",argv.email);
  console.log("         name:",argv.name);
  console.log("  permissions:",argv.permissions || "auto");
  // test().then((result)=>{console.log(result)});
  (async function(){
    await database.attach_to_database();
    var rec = await AddMachineUser({email: argv.email,displayName: argv.name, permissions: argv.permissions });
    console.log('added a new machine user:',rec);
    console.log("\n\n\n");
    var output_record = { url: global.config.my_url, 
                      client_credentials: {
                        user_id: rec.user_id,
                        secret:  rec.secret,
                      }}
    console.log(JSON.stringify(output_record,null,2));
    database.shutdown();
  })();
}

