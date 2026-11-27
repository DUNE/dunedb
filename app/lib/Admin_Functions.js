const MUUID = require('uuid-mongodb');
const ObjectId = require('mongodb').ObjectId;

const Actions = require('./Actions');
const { db } = require('./db');
const Components = require('./Components');
const Forms = require('./Forms');
const logger = require('./logger');
const utils = require('./utils');
const Workflows = require('./Workflows');


async function fixWorkflowRecords(oldTypeFormId) {
  let newTypeFormId = null;
  let newTypeFormName = null;

  if (oldTypeFormId === 'FrameAssembly') {
    newTypeFormId = 'APAFrame_Assembly';
    newTypeFormName = 'APA Frame Assembly';
  }

  const result = await db.collection('workflows')
    .updateMany(
      { typeFormId: oldTypeFormId },
      [
        {
          $set: {
            'typeFormId': newTypeFormId,
            'typeFormName': newTypeFormName,
          }
        },
      ]
    )

  if (result.ok === 0) throw new Error(`Admin_Functions::fixWorkflowRecords() - failed to change fields in the workflow records!`);

  return newTypeFormId;
}


module.exports = {
  fixWorkflowRecords,
}
