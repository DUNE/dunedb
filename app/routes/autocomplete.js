
const Components = require("lib/Components.js")('component');
const express = require("express");
const logger = require('../lib/logger');
const Actions = require("lib/Actions.js");

var router = express.Router();
module.exports = router;


// Autocomplete a component's UUID - i.e. return matching DB entries as the UUID is supplied
router.get('/uuid', async function(req, res, next)
{
  // The user can optionally restrict the matched UUIDs to only those corresponding to specific component types
  var types = null;
  
  if(req.query.type)
  {
    types = req.query.type.split(',');
  }
  
  // Get any and all component UUIDs that match the supplied string and optional component types
  // If there are no matches, simply return an empty JSON document
  var matches = await Components.autocompleteUuid(req.query.q, types, 8);
  
  if(matches instanceof Error)
  {
    return res.json([]);
  }
  
  // For each matched UUID, construct a simple string consisting of the UUID and component name
  for(var m of matches)
  {
    m.val = m.componentUuid;
    m.text = m.val + ' ' + m.data.name;
  }
  
  // Return a JSON document containing the matched UUIDs
  return res.json(matches);
});


// Autocomplete an action's ID - i.e. return matching DB entries as the ID is supplied
router.get('/actionId', async function(req, res, next)
{
  // The user can optionally restrict the matched IDs to only those corresponding to a specific action type (set by its action type form ID)
  
  // Get any and all action IDs that match the supplied string and optional action type
  // If there are no matches, simply return an empty JSON document
  var matches = await Actions.autocompleteId(req.query.q, req.query.formId, 8);
  
  if(matches instanceof Error)
  {
    return res.json([]);
  }
  
  // For each matched ID, construct a simple string consisting of the action's ID and type form ID
  for(var m of matches)
  {
    m.val = m._id;
    m.text = m.formId + ' ' + m.val;
  }
  
  // Return a JSON document containing the matched IDs
  return res.json(matches);
});

