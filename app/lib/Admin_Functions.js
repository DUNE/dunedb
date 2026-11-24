const MUUID = require('uuid-mongodb');
const ObjectId = require('mongodb').ObjectId;

const Actions = require('./Actions');
const { db } = require('./db');
const Components = require('./Components');
const Forms = require('./Forms');
const logger = require('./logger');
const utils = require('./utils');
const Workflows = require('./Workflows');


async function fixActionRecords(typeFormId) {
  let result = await db.collection('actions')
    .updateMany(
      { typeFormId: typeFormId },
      [
        {
          $set: {
            'temp_humidityLoggers': { $arrayElemAt: ["$data.grid_humidityLogger", 0] },
            'temp_foilSealing': { $arrayElemAt: ["$data.grid_foilSealing", 0] },
          }
        },
      ]
    )

  result = await db.collection('actions')
    .updateMany(
      { typeFormId: typeFormId },
      [
        {
          $set: {
            'data.humidityLoggerSerialNumber': '$temp_humidityLoggers.humidityLoggerSerialNumber',
            'data.dateTime_foilSealing': '$temp_foilSealing.dateTime_foilSealing',
          }
        },
      ]
    )

  result = await db.collection('actions')
    .updateMany(
      { typeFormId: typeFormId },
      [
        {
          $unset: [
            'temp_humidityLoggers',
            'temp_foilSealing',
          ]
        },
      ]
    )

  if (result.ok === 0) throw new Error(`Admin_Functions::fixActionRecords() - failed to change fields in the action records!`);

  return typeFormId;
}


module.exports = {
  fixActionRecords,
}
