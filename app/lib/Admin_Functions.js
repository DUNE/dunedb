const MUUID = require('uuid-mongodb');
const ObjectId = require('mongodb').ObjectId;

const Actions = require('./Actions');
const { db } = require('./db');
const Components = require('./Components');
const Forms = require('./Forms');
const logger = require('./logger');
const utils = require('./utils');
const Workflows = require('./Workflows');


async function cleanActionTypeFormIds(oldTypeFormId) {
  let newTypeFormId = null;
  let newTypeFormName = null;
  let workflowTypeFormId = null;
  let workflowStepIndex = null;

  if (oldTypeFormId === 'DeliveredFrameQAChecks') {
    newTypeFormId = 'APAFrameDeliveryQAChecks';
    newTypeFormName = 'APA Frame Delivery QA Checks';
    workflowTypeFormId = 'FrameAssembly';
    workflowStepIndex = 1;
  } else if (oldTypeFormId === 'CompletedFrameQCChecklist') {
    newTypeFormId = 'APAFrameFinalQAChecks';
    newTypeFormName = 'APA Frame Final QA Checks';
    workflowTypeFormId = 'FrameAssembly';
    workflowStepIndex = 4;
  } else if (oldTypeFormId === 'InstallationSurveys') {
    newTypeFormId = 'APAFrameInstallationSurveys';
    newTypeFormName = 'APA Frame Installation Surveys';
    workflowTypeFormId = 'FrameAssembly';
    workflowStepIndex = 3;
  } else if (oldTypeFormId === 'IntakeSurveys') {
    newTypeFormId = 'APAFrameIntakeSurveys';
    newTypeFormName = 'APA Frame Intake Surveys';
    workflowTypeFormId = 'FrameAssembly';
    workflowStepIndex = 2;
  } else if (oldTypeFormId === 'APAShipmentReception') {
    newTypeFormId = 'AssembledAPAShipmentReception';
    newTypeFormName = 'Assembled APA Shipment Reception';
    workflowTypeFormId = 'APA_PostProduction';
    workflowStepIndex = 3;
  } else if (oldTypeFormId === 'APAShipmentTransport') {
    newTypeFormId = 'AssembledAPAShipmentSignoffTransport';
    newTypeFormName = 'Assembled APA Shipment Signoff and Transport';
    workflowTypeFormId = 'APA_PostProduction';
    workflowStepIndex = 2;
  }

  const result1 = await db.collection('actions')
    .updateMany(
      { typeFormId: oldTypeFormId },
      [
        {
          $set: {
            'typeFormId': newTypeFormId,
            'typeFormName': newTypeFormName,
          }
        },
      ]
    )

  if (result1.ok === 0) throw new Error(`Admin_Functions::cleanActionTypeFormIds() - failed to change type form ID and name in the action records!`);

  let update = { '$set': {} };
  update['$set']['path.' + workflowStepIndex + '.formName'] = newTypeFormName;

  const result2 = await db.collection('workflows')
    .updateMany(
      { typeFormId: workflowTypeFormId },
      update,
    )
  
  if (result2.ok === 0) throw new Error(`Admin_Functions::cleanActionTypeFormIds() - failed to change type form name in the workflow records!`);

  return newTypeFormId;
}


module.exports = {
  cleanActionTypeFormIds,
}
