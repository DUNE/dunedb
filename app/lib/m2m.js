#!/usr/bin/env node
"use strict";

if (require.main === module) {
  const Path = require("path");
  console.log(Path.resolve(__dirname,"../"));
  require('app-module-path').addPath(Path.resolve(__dirname,"../")); // Set this as the base for all 'require' lines in future.
}

const { db } = require('lib/db');
const logger = require('./logger');

var express = require('express');
var router = express.Router();
var util = require('util');
var url = require('url');
var querystring = require('querystring');
var jwt = require('jsonwebtoken');
var crypto = require('crypto');
const { BASE_URL, M2M_SECRET } = require("./constants");

async function AddMachineUser(userinfo)
{
  // NB PROTECT THIS CALL
  // Can also be used to change the user,
  // or simply reissue a new secret.

  //userinfo should be an object with:
  // permissions: [ "thing:write", ...]
  // email: "blah@blah"
  // displayName
  var user_id = userinfo.user_id || "";
  // user id must conform to standard and cannot be blank.
  if(!user_id.startsWith('m2m') ) user_id = "m2m|" + crypto.randomBytes(8).toString('hex');
  if(!userinfo.email) throw "no email provided";
  if(!userinfo.displayName) throw "no Display Name provided";


  // Need to populate user info in DB:
  // user_id
  // displayName
  // emails [ {value: "blah@blah"} ]
  // permissions:
  var secret = "secret" + crypto.randomBytes(64).toString('hex');

  var user = {
    user_id: user_id,
    displayName: userinfo.displayName || "MachineClient",
    emails: [userinfo.email || "unknown@unknown.edu"],
    permissions: userinfo.permissions 
                  || [ 'components:view', 'components:create', 'components:edit', 'tests:edit', 'tests:submit', 'tests:view', 'jobs:view', 'forms:edit', 'jobs:edit', 'jobs:submit'],
  }
  // create the record.
  var record = {
      user_id: user_id,
      user: user,
      secret: secret
  };
  await db.collection('m2mUsers').insertOne(record);

  return record;
}

async function DeleteMachineUser(user_id)
{
  //NB PROTECT THIS CALL
  var res = await db.collection('m2mUsers').deleteOne({user_id: user_id});
  if(res.deletedCount < 1) throw new Error("Cannot delete m2m user "+user_id+". No such user.")
  return res;
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
    audience: "dunedb-m2m",
  }
  logger.info("authenticating m2m user "+user_id)
  return jwt.sign(rec.user,M2M_SECRET,options);
}

async function ListMachineUsers()
{
  // DO NOT return secret info.
  return await db.collection('m2mUsers').find().project({user_id:1,user:1}).toArray();
}

module.exports = {
  AuthenticateMachineUser,
  AddMachineUser,
  DeleteMachineUser,
  ListMachineUsers
}





//////////////////////////////////////////////////////////////////////////////////////////////////





if (require.main === module) {
  var pino = require("pino"); 
  var pino_opts = {
    customLevels: {
        http: 29
    },
   };
   global.logger = pino(pino_opts);
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
    var output_record = { url: BASE_URL, 
                        client_credentials: {
                        user_id: rec.user_id,
                        secret:  rec.secret,
                      }}
    console.log(JSON.stringify(output_record,null,2));
    database.shutdown();
  })();
}

