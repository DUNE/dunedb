const { db } = require('./db');

let lockCollection = null;


/// Initialise the collection of locks
async function init() {
  // Retrieve the 'dbLocks' record collection
  lockCollection = db.collection('dbLocks');

  // Create a 'name' index on the locks collection
  await db.collection('dbLocks')
    .createIndex('name', {
      unique: true,
      expireAfterSeconds: 60,
    });
}


/// Create a new lock
async function lock(name, timeout_ms) {
  // If no timeout has been specified, use a default value of 5s
  if (!timeout_ms) timeout_ms = 5000;

  // If the locks collection has not already been initialised, do so now
  if (!lockCollection) await init();

  const currentDateTime = new Date();

  // Insert a new lock record into the collection ... if successful, return the 'Lock' object, or otherwise throw an error
  try {
    const insertion = await lockCollection.updateOne(
      {
        name: name,
        expiry: { $lte: currentDateTime },
      },
      {
        $set: {
          name: name,
          expiry: new Date(currentDateTime.getTime() + timeout_ms)
        }
      },
      { upsert: true });

    if (insertion.result.ok) return new Lock(name);
  } catch (err) {
    throw new Error(`dbLock::lock() - failed to insert a new lock into the database!`);
  }
}


/// Define a 'Lock' object containing a unique name and a function for releasing the lock
function Lock(name) {
  this.name = name;
  this.release = async function () { await unlock(this.name); }
}


/// Release an existing lock
async function unlock(name) {
  // Delete the lock record from the locks collection, specifying the record by the lock's name
  await lockCollection.deleteOne({ name: name });
}


module.exports = lock;
