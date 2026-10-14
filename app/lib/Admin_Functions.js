const MUUID = require('uuid-mongodb');
const ObjectId = require('mongodb').ObjectId;

const Actions = require('./Actions');
const { db } = require('./db');
const Components = require('./Components');
const Forms = require('./Forms');
const logger = require('./logger');
const utils = require('./utils');
const Workflows = require('./Workflows');


async function addWorkflowStep(selectedTypeFormId) {
  const newWorkflowStep = {
    type: 'action',
    formName: 'Assembled APA Shipment Post-Reception QA',
    advice: '',
    result: '',
  }

  const result = await db.collection('workflows')
    .updateMany(
      { typeFormId: selectedTypeFormId },
      { $push: { path: newWorkflowStep } },
    )

  if (result.ok === 0) throw new Error(`Admin_Functions::addWorkflowStep() - failed to add step to path in the workflow records!`);

  return selectedTypeFormId;
}


module.exports = {
  addWorkflowStep,
}
