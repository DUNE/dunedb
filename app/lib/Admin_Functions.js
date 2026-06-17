const MUUID = require('uuid-mongodb');
const ObjectId = require('mongodb').ObjectId;

const Actions = require('./Actions');
const { db } = require('./db');
const Components = require('./Components');
const Forms = require('./Forms');
const logger = require('./logger');
const utils = require('./utils');
const Workflows = require('./Workflows');


async function setLocationInfo_allComponents() {
  const result = await db.collection('components')
    .updateMany(
      {},
      [
        {
          $set: {
            'location': '$reception.location',
            'dateAtLocation': '$reception.date',
            'locationDetail': '$reception.detail',
          }
        },
      ]
    )

  if (result.ok === 0) throw new Error(`Admin_Functions::setLocationInfo_allComponents() - failed to add fields to the component record!`);

  return result;
}


async function removeReceptionObject_allComponents() {
  const result = await db.collection('components')
    .updateMany(
      {},
      [
        { $unset: ['reception'] },
      ]
    )

  if (result.ok === 0) throw new Error(`Admin_Functions::removeReceptionObject_allComponents() - failed to remove object from the component record!`);

  return result;
}


module.exports = {
  setLocationInfo_allComponents,
  removeReceptionObject_allComponents,
}
