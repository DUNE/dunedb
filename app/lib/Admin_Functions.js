const MUUID = require('uuid-mongodb');
const ObjectId = require('mongodb').ObjectId;

const Actions = require('./Actions');
const { db } = require('./db');
const Components = require('./Components');
const Forms = require('./Forms');
const logger = require('./logger');
const utils = require('./utils');
const Workflows = require('./Workflows');


async function fixDuplicatedLocations() {
  const result = await db.collection('actions')
    .updateMany(
      {
        'typeFormId': { $in: ['GroundingMeshPanelEpoxyApplication', 'GroundingMeshPanelFinalInspection', 'GroundingMeshPanelReceiptInspection'] },
        'data.location': 'rokeby',
      },
      [
        { $set: { 'data.location': 'ukWarehouse' } },
      ]
    );

  if (result.ok === 0) throw new Error(`Admin_Functions::fixDuplicatedLocations() - failed to change location in records!`);

  return 0;
}


module.exports = {
  fixDuplicatedLocations,
}
