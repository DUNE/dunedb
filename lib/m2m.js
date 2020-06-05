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
                  || [ 'components:create', 'components:edit', 'tests:edit', 'tests:submit', 'jobs:view', 'forms:edit', 'jobs:edit', 'jobs:submit'],
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

async function test()
{
  await database.attach_to_database();
  var rec = await AddMachineUser({email: 'nathaniel.tagg@gmail.com',displayName: 'autouser'});
  console.log('added',rec);
  var token = await AuthenticateMachineUser(rec.user_id,rec.secret);
  console.log('looked up user, found',token);
  var decoded1 = jwt.verify(token,config.m2m_secret,{audience: "sietch-m2m"});
  console.log('1',decoded1);
  var decoded2 = jwt.verify(token,'blahwrong',{audience: "sietch-m2m"});
  console.log('2',decoded2);

}
if (require.main === module) {
  test().then((result)=>{console.log(result)});
}

