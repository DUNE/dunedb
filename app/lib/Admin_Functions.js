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


async function removeFields_allComponents(currentTypeFormId) {
  const result = await db.collection('components')
    .updateMany(
      {},
      [
        { $unset: ['formId', 'formName'] },
      ]
    )

  if (result.ok === 0) throw new Error(`Admin_Functions::removeFields_allComponents() - failed to remove fields from the component record!`);

  return result;
}


async function fixNames_wireBobbins(currentTypeFormId) {
  let aggregation_stages = [];

  aggregation_stages.push({ $match: { typeFormId: currentTypeFormId } });
  aggregation_stages.push({ $project: { componentUuid: true } });

  let uuids = await db.collection('components')
    .aggregate(aggregation_stages)
    .toArray();
    
  for (let uuid of uuids) {
    const component = await Components.retrieve(uuid.componentUuid);
    const typeFormName = component.typeFormName;
    const data = component.data;
    
    let componentName = '';
    
    if (data.manufacturer !== 'fiskAlloy') {
      componentName = `${typeFormName} ${data.bobbinId} (${utils.dictionary_wireSpoolManufacturers[data.manufacturer]} - Lot ${data.wireLot})`;
    } else {
      componentName = `${typeFormName} ${data.bobbinId} (${utils.dictionary_wireSpoolManufacturers[data.manufacturer]} - RM ${data.wireLot})`;
    }
    
    const componentUuid = component.componentUuid;
    let match_condition = { componentUuid };

    if (typeof componentUuid === 'object' && !(componentUuid instanceof Binary)) match_condition = componentUuid;

    match_condition.componentUuid = MUUID.from(match_condition.componentUuid);

    const result = await db.collection('components')
      .updateMany(
        match_condition,
        [{ $set: { 'data.componentName': componentName } }]
      )

    if (result.ok === 0) throw new Error(`Admin_Functions::fixNames_wireBobbins() - failed to fix component name in the component record!`);
  }

  return currentTypeFormId;
}




module.exports = {
  fixFields_allComponents,
  fixFields_batchComponents,
  removeFields_allComponents,
  fixNames_wireBobbins,
}
