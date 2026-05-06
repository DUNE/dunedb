const MUUID = require('uuid-mongodb');
const ObjectId = require('mongodb').ObjectId;

const Actions = require('./Actions');
const { db } = require('./db');
const Components = require('./Components');
const Forms = require('./Forms');
const logger = require('./logger');
const utils = require('./utils');
const Workflows = require('./Workflows');


async function cleanComponentTypeFormIds(typeFormId) {
  let newTypeFormId = null;
  let newTypeFormName = null;

  if (typeFormId === 'wire_bobbin') {
    newTypeFormId = 'WireBobbin';
    newTypeFormName = 'Wire Bobbin';
  } else if (typeFormId === 'BoardShipment') {
    newTypeFormId = 'GeometryBoardShipment';
    newTypeFormName = 'Geometry Board Shipment';
  }

  let aggregation_stages = [];
  aggregation_stages.push({ $match: { formId: typeFormId } });
  aggregation_stages.push({ $project: { componentUuid: true } });

  let uuids = await db.collection('components')
    .aggregate(aggregation_stages)
    .toArray();

  for (let uuid of uuids) {
    const component = await Components.retrieve(uuid.componentUuid);
    const data = component.data;
    const typeRecordNumber = String(data.typeRecordNumber).padStart(5, '0');

    let componentName = '';
    let dunePid = '';

    if (typeFormId === 'BoardShipment') {
      componentName = `${newTypeFormName} (${data.boardUuiDs.length}.${utils.dictionary_locations[data.originOfShipment]}.${utils.dictionary_locations[data.destinationOfShipment]})`;
      dunePid = `D003MMMNNNNN-${typeRecordNumber}-COIII-010000`;
    } else if (typeFormId === 'wire_bobbin') {
      componentName = `${newTypeFormName} ${data.bobbinId} (Lot ${data.wireLot})`;
      dunePid = `D003MMMNNNNN-${typeRecordNumber}-COIII-010000`;
    }

    const componentUuid = component.componentUuid;
    let match_condition = { componentUuid };

    if (typeof componentUuid === 'object' && !(componentUuid instanceof Binary)) match_condition = componentUuid;
    match_condition.componentUuid = MUUID.from(match_condition.componentUuid);

    const result = await db.collection('components')
      .updateMany(
        match_condition,
        [
          {
            $set: {
              'formId': newTypeFormId,
              'formName': newTypeFormName,
              'data.componentName': componentName,
              'data.dunePid': dunePid,
            }
          },
        ]
      )
    if (result.ok === 0) throw new Error(`Admin_Functions::cleanComponentTypeFormIds() - failed to change fields in the component record!`);
  }
}


module.exports = {
  cleanComponentTypeFormIds,
}
