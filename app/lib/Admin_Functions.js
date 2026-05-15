const MUUID = require('uuid-mongodb');
const ObjectId = require('mongodb').ObjectId;

const Actions = require('./Actions');
const { db } = require('./db');
const Components = require('./Components');
const Forms = require('./Forms');
const logger = require('./logger');
const utils = require('./utils');
const Workflows = require('./Workflows');


async function fixComponentFields(currentFormId) {
  const matchCondition = (currentFormId === 'ALL_COMPONENTS') ? {} : { formId: currentFormId };

  const result = await db.collection('components')
    .updateMany(
      matchCondition,
      [
        {
          $set: {
            'typeFormId': '$formId',
            'typeFormName': '$formName',
          }
        },
      ]
    )

  if (result.ok === 0) throw new Error(`Admin_Functions::fixComponentFields() - failed to add fields to the component record!`);

  return currentFormId;
}


module.exports = {
  fixComponentFields,
}
