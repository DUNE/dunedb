const MUUID = require('uuid-mongodb');

const Actions = require('./Actions');
const { db } = require('./db');
const Components = require('./Components');
const Forms = require('./Forms');
const logger = require('./logger');
const utils = require('./utils');


async function cleanComponentTypeFormIds(typeFormId) {
  let newTypeFormId = null;
  let newTypeFormName = null;

  if (typeFormId === 'GroundingMeshShipment') {
    newTypeFormId = 'GroundingMeshPanelShipment';
    newTypeFormName = 'Grounding Mesh Panel Shipment';
  } else if (typeFormId === 'wire_bobbin') {
    newTypeFormId = 'WireBobbin';
    newTypeFormName = 'Wire Bobbin';
  } else if (typeFormId === 'BoardShipment') {
    newTypeFormId = 'GeometryBoardShipment';
    newTypeFormName = 'Geometry Board Shipment';
  }

  const result = await db.collection('components')
    .updateMany(
      { formId: typeFormId },
      [
        {
          $set: {
            'formId': newTypeFormId,
            'formName': newTypeFormName,
          }
        },
      ]
    )

  if (result.ok === 0) throw new Error(`Admin_Functions::cleanComponentTypeFormIds() - failed to change type form ID in the component records!`);

  return newTypeFormId;
}


module.exports = {
  cleanComponentTypeFormIds,
}
