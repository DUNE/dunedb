const MUUID = require('uuid-mongodb');
const ObjectId = require('mongodb').ObjectId;

const Actions = require('./Actions');
const { db } = require('./db');
const Components = require('./Components');
const Forms = require('./Forms');
const logger = require('./logger');
const utils = require('./utils');
const Workflows = require('./Workflows');


async function setSubmissionInfo_singleCollection(collection) {
  let result = await db.collection(collection)
    .updateMany(
      {},
      [
        {
          $set: {
            'recordDate': '$insertion.insertDate',
            'recordVersion': '$validity.version',
            'userId': '$insertion.user.user_id',
            'userName': '$insertion.user.displayName',
            'userEmails': { $arrayElemAt: ["$insertion.user.emails", 0] },
          }
        },
      ]
    )

  result = await db.collection(collection)
    .updateMany(
      {},
      [
        {
          $set: {
            'userEmail': '$userEmails.value',
          }
        },
      ]
    )

  result = await db.collection(collection)
    .updateMany(
      {},
      [
        { $unset: ['userEmails'] },
      ]
    )

  if (result.ok === 0) throw new Error(`Admin_Functions::setSubmissionInfo_singleCollection() - failed to add fields to the collection records!`);

  return result;
}


module.exports = {
  setSubmissionInfo_singleCollection,
}
