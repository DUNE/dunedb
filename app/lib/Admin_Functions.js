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
  let typeFormName = null;
  let actionTypeFormIDs = null;

  if (typeFormId === 'AssembledAPAShipment') {
    typeFormName = 'Assembled APA Shipment';
    actionTypeFormIDs = ['APAShipmentReception', 'APAShipmentTransport', 'ASFCloseUp'];
  }

  for (const actionTypeFormID of actionTypeFormIDs) {
    let aggregation_stages = [];

    aggregation_stages.push({ $match: { typeFormId: actionTypeFormID } });
    aggregation_stages.push({
      $project: {
        actionId: true,
        componentUuid: true,
      }
    });

    let actions = await db.collection('actions')
      .aggregate(aggregation_stages)
      .toArray();

    for (let action of actions) {
      const component = await Components.retrieve(action.componentUuid);
      
      const result = await db.collection('actions')
        .updateMany(
          { actionId: action.actionId },
          [
            {
              $set: {
                'componentName': component.data.componentName,
                'componentTypeFormId': typeFormId,
                'componentTypeFormName': typeFormName,
              }
            },
          ]
        )

      if (result.ok === 0) throw new Error(`Admin_Functions::cleanComponentTypeFormIds() - failed to change type form ID in the component records!`);
    }
  }


/*
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
  } else if (typeFormId === 'APAShipment') {
    newTypeFormId = 'AssembledAPAShipment';
    newTypeFormName = 'Assembled APA Shipment';
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

  if (typeFormId === 'APAShipment') {
    let aggregation_stages = [];

    aggregation_stages.push({ $match: { formId: newTypeFormId } });
    aggregation_stages.push({ $project: { componentUuid: true } });

    let uuids = await db.collection('components')
      .aggregate(aggregation_stages)
      .toArray();

    for (let uuid of uuids) {
      const component = await Components.retrieve(uuid.componentUuid);
      const data = component.data;

      let name_apa1 = '[not set]';
      let name_apa2 = '[not set]';

      if (data.apaUuiDs[0].component_uuid !== '') {
        const apa = await Components.retrieve(data.apaUuiDs[0].component_uuid);
        name_apa1 = apa.data.componentName.substring(4);
      }

      if (data.apaUuiDs[1].component_uuid !== '') {
        const apa = await Components.retrieve(data.apaUuiDs[1].component_uuid);
        name_apa2 = apa.data.componentName.substring(4);
      }

      const componentName = `Assembled APA Shipment (${name_apa1} + ${name_apa2})`;

      const componentUuid = component.componentUuid;
      let match_condition = { componentUuid };

      if (typeof componentUuid === 'object' && !(componentUuid instanceof Binary)) match_condition = componentUuid;

      match_condition.componentUuid = MUUID.from(match_condition.componentUuid);

      let resultInner = await db.collection('components')
        .updateMany(
          match_condition,
          [
            {
              $set: { 'data.componentName': componentName }
            },
          ]
        )

      if (resultInner.ok === 0) throw new Error(`Admin_Functions::cleanComponentTypeFormIds() - failed to update Assembled APA Shipment component names!`);

      let update = { '$set': {} };
      update['$set']['path.' + 0 + '.formName'] = newTypeFormName;

      resultInner = await db.collection('workflows')
        .updateMany(
          { workflowId: new ObjectId(component.workflowId) },
          update,
        )

      if (resultInner.ok === 0) throw new Error(`Admin_Functions::cleanComponentTypeFormIds() - failed to change type form name in the workflow records!`);
    }
  }
*/
  return typeFormId;
}


module.exports = {
  cleanComponentTypeFormIds,
}
