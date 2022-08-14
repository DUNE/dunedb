const router = require('express').Router();

const Actions = require('lib/Actions.js');
const Components = require('lib/Components.js');
const Workflows = require('lib/Workflows.js');


/// Autocomplete a component's UUID - i.e. return matching DB entries as the UUID is typed
router.get('/autocomplete/uuid', async function (req, res, next) {
  // Get any and all component UUIDs that match the supplied string
  let matches = await Components.autoCompleteUuid(req.query.q);

  // If there are no matches, simply return an empty JSON document
  if (matches instanceof Error) return res.json([]);

  // For each matched UUID, construct a simple string consisting of the component's UUID, type form name and component name
  for (let m of matches) {
    m.val = m.componentUuid;
    m.text = `${m.componentUuid} (${m.formName}) [${m.data.name}]`;
  }

  // Return a JSON document containing the matched UUIDs
  return res.json(matches);
});


/// Autocomplete an action's ID - i.e. return matching DB entries as the ID is typed
router.get('/autocomplete/actionId', async function (req, res, next) {
  // Get any and all action IDs that match the supplied string
  let matches = await Actions.autoCompleteId(req.query.q);

  // If there are no matches, simply return an empty JSON document
  if (matches instanceof Error) return res.json([]);

  // For each matched ID, construct a simple string consisting of the action's ID and type form name
  for (let m of matches) {
    m.val = m.actionId;
    m.text = `${m.actionId} (${m.typeFormName})`;
  }

  // Return a JSON document containing the matched IDs
  return res.json(matches);
});


/// Autocomplete a workflow's ID - i.e. return matching DB entries as the ID is typed
router.get('/autocomplete/workflowId', async function (req, res, next) {
  // Get any and all workflow IDs that match the supplied string
  let matches = await Workflows.autoCompleteId(req.query.q);

  // If there are no matches, simply return an empty JSON document
  if (matches instanceof Error) return res.json([]);

  // For each matched ID, construct a simple string consisting of the workflow's ID and type form name
  for (let m of matches) {
    m.val = m.workflowId;
    m.text = `${m.workflowId} (${m.typeFormName})`;
  }

  // Return a JSON document containing the matched IDs
  return res.json(matches);
});


module.exports = router;
