"use strict";
var database = require('../lib/database.js'); // Exports global 'db' variable

const chalk = require('chalk');
var database = require('./database.js'); // Exports global 'db' variable
var {ObjectID} = require('mongodb');

var lockCollection = null;

module.exports = lock;


async function init()
{
  lockCollection = db.collection("dbLocks");
  // Each lock name is unique. All locks expire after 5 seconds, regardless of specific lock duration.
  await db.collection("dbLocks").createIndex('name',{unique:true,expireAfterSeconds: 60});
}



async function lock(name,timeout_ms)
{
  if(!lockCollection) await init();

  // Throws an error if it's already locked.
  var now = new Date();
  if(!timeout_ms) timeout_ms = 5000; // default 5s

  // var insertion = await lockCollection.insertOne({
  //   name: name,
  //   expiry: now+timeout_ms;
  // });
  // if(insertion.result.ok) return null;

  // // check for existing lock.
  // var rec = await lockCollection.findOne({name:name,expiry:{$lte: now}});
  // if(rec) return rec.expiry - now; // we failed, we must wait this long.

  // delete any expired lock.
  // await lockCollection

  // Upsert a lock.  Replaces any existing lock if it's expired, but should fail if 
  // there is a extant lock.

  // I think this works atomically?  Update is atomic at the level of a single action. 

  try{
    // logger.info(now);
    // logger.info("existing:");
    // logger.info(await lockCollection.findOne({
    //     name:name,
    //     expiry:{$lte: now}
    //   }));
    var insertion = await lockCollection.updateOne(
      {
        name:name,
        expiry:{$lte: now}
      },
      {$set: {
        name: name,
        expiry: new Date(now.getTime()+timeout_ms)
      }}, 
      {upsert: true},
    );
    if(insertion.result.ok) return new Lock(name);
    // shouldn't ever get here.
    throw("lock failed");
  } catch(err) {
    // logger.info("upsert failure",err);
    throw("lock failed");
  }
}

async function trylock(name,timeout_ms)
{
  try{
    await lock(name,timeout_ms);
    return true;
  } catch(err) {
    return false;
  }
}

function Lock(name) {
  this.name = name;
  this.release = async function() { await unlock(this.name); }
}

async function unlock(name)
{
  await lockCollection.deleteOne({name:name});
}



if (require.main === module) {
  // test code.

  (async function(){
    try{
    await database.attach_to_database();
    await init();
    var l = await lock('testlock');
    l.release();

    logger.info("locking first time");
    logger.info(await trylock('testlock'));
    logger.info("locking second time");
    logger.info(await trylock('testlock'));
    logger.info("unlocking");
    logger.info(await unlock('testlock'));
    logger.info("locking third time");
    logger.info(await trylock('testlock'));

    } catch(err) {
      logger.info(err);
    }
    database.shutdown();
  })();
}
