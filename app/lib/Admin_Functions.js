const MUUID = require('uuid-mongodb');
const ObjectId = require('mongodb').ObjectId;

const Actions = require('./Actions');
const { db } = require('./db');
const Components = require('./Components');
const Forms = require('./Forms');
const logger = require('./logger');
const utils = require('./utils');
const Workflows = require('./Workflows');


async function fixComponentLocations() {
  const result = await db.collection('components')
    .updateMany(
      {
        'typeFormId': 'GroundingMeshPanel',
        'location': 'rokeby',
      },
      [
        { $set: { 'location': 'ukWarehouse' } },
      ]
    );

  if (result.ok === 0) throw new Error(`Admin_Functions::fixComponentLocations() - failed to change location in component records!`);

  return 0;
}


module.exports = {
  fixComponentLocations,
}
