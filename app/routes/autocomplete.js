const router = require('express').Router();

const Actions = require('../lib/Actions');
const Components = require('../lib/Components');
const Workflows = require('../lib/Workflows');


/// Autocomplete a component UUID as it is being typed
router.get('/autocomplete/uuid', async function (req, res, next) {
  // Retrieve a list of component records which contain a component UUID that partially or fully matches the supplied string
  let matches = await Components.autoCompleteUuid(req.query.q);

  // If there are no matches, simply return an empty JSON document
  if (matches instanceof Error) return res.json([]);

  // For each retrieved record, construct a string consisting of the component's UUID, name and type form name
  for (let m of matches) {
    m.val = m.componentUuid;
    m.text = `${m.componentUuid} (${m.typeFormName}) [${m.name}]`;
  }

  // Return a JSON document containing the retrieved records, including the newly constructed strings
  return res.json(matches);
});


/// Autocomplete an action's ID as it is being typed
router.get('/autocomplete/actionId', async function (req, res, next) {
  // Retrieve a list of action records which contain an action ID that partially or fully matches the supplied string
  let matches = await Actions.autoCompleteId(req.query.q);

  // If there are no matches, simply return an empty JSON document
  if (matches instanceof Error) return res.json([]);

  // For each retrieved record, construct a string consisting of the action's ID and type form name
  for (let m of matches) {
    m.val = m.actionId;
    m.text = `${m.actionId} (${m.typeFormName})`;
  }

  // Return a JSON document containing the retrieved records, including the newly constructed strings
  return res.json(matches);
});


/// Autocomplete a workflow's ID as it is being typed
router.get('/autocomplete/workflowId', async function (req, res, next) {
  // Retrieve a list of workflow records which contain a workflow ID that partially or fully matches the supplied string
  let matches = await Workflows.autoCompleteId(req.query.q);

  // If there are no matches, simply return an empty JSON document
  if (matches instanceof Error) return res.json([]);

  // For each retrieved record, construct a string consisting of the workflow's ID and type form name
  for (let m of matches) {
    m.val = m.workflowId;
    m.text = `${m.workflowId} (${m.typeFormName})`;
  }

  // Return a JSON document containing the retrieved records, including the newly constructed strings
  return res.json(matches);
});


module.exports = router;
