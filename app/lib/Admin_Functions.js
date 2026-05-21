const MUUID = require('uuid-mongodb');
const ObjectId = require('mongodb').ObjectId;

const Actions = require('./Actions');
const { db } = require('./db');
const Components = require('./Components');
const Forms = require('./Forms');
const logger = require('./logger');
const utils = require('./utils');
const Workflows = require('./Workflows');


async function fixFields_allComponents() {
  const result = await db.collection('components')
    .updateMany(
      {},
      [
        {
          $set: {
            'typeFormId': '$formId',
            'typeFormName': '$formName',
          }
        },
      ]
    )

  if (result.ok === 0) throw new Error(`Admin_Functions::fixFields_allComponents() - failed to add fields to the component record!`);

  return result;
}


async function fixFields_batchComponents() {
  const result = await db.collection('components')
    .updateMany(
      { 'typeFormId': { $in: ['CEAdapterBoardBatch', 'CRBoardBatch', 'GBiasBoardBatch', 'GeometryBoardBatch', 'ReturnedGeometryBoardBatch'] }, },
      [
        {
          $set: {
            'data.subComponent_typeFormId': '$data.subComponent_formId',
          }
        },
      ]
    )

  if (result.ok === 0) throw new Error(`Admin_Functions::fixFields_batchComponents() - failed to add fields to the component record!`);

  return result;
}


module.exports = {
  fixFields_allComponents,
  fixFields_batchComponents,
}
