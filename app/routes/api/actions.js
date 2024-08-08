const router = require('express').Router();

const Actions = require('../../lib/Actions');
const logger = require('../../lib/logger');
const Search_ActionsWorkflows = require('../../lib/Search_ActionsWorkflows');
const permissions = require('../../lib/permissions');
const utils = require('../../lib/utils');
const Workflows = require('../../lib/Workflows');


/// Retrieve a single version of an action record (either the most recent, or a specified one)
router.get('/action/:actionId([A-Fa-f0-9]{24})', permissions.checkPermissionJson('actions:view'), async function (req, res, next) {
  try {
    // Set up a query object consisting of the specified action ID and a version number if one is provided (if not, the most recent version is assumed)
    let query = { actionId: req.params.actionId };

    if (req.query.version) query['validity.version'] = parseInt(req.query.version, 10);

    // Retrieve the specified version of the record
    // If there is no record corresponding to the ID, or the version number is not valid, this returns 'null'
    const action = await Actions.retrieve(query);

    // Return the record in JSON format
    return res.json(action);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Save a new or edited action record
router.post('/action', permissions.checkPermissionJson('actions:perform'), async function (req, res, next) {
  try {
    // Display a logger message indicating that a record is being saved via the '/action' route
    logger.info(req.body, 'Submission to /action');

    // Save the record ... if successful, this returns the action ID
    const actionId = await Actions.save(req.body, req);

    // Return the record's action ID
    return res.json(actionId);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Add one or more base64-encoded strings, each one representing a single image, to an action record
router.post('/action/:actionId([A-Fa-f0-9]{24})/addImages', permissions.checkPermissionJson('actions:perform'), async function (req, res, next) {
  try {
    // Add the encoded strings to the action record corresponding to the specified action ID ... if successful, the function returns the action ID
    // The encoded strings are contained as an array in the 'req.body.image' parameter (it is passed as a [key, value] pair, with the key being 'images' and the value being the array)
    const result = await Actions.addImageStrings(req.params.actionId, req.body.images);

    // Return the record's action ID
    return res.json(result);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Retrieve a list of all actions of a single action type
router.get('/actions/:typeFormId/list', permissions.checkPermissionJson('actions:view'), async function (req, res, next) {
  try {
    // Set up the object containing the matching conditions ... to start with, this only consists of the specified action type
    // If a component UUID has been provided in the query, add it to the object under the appropriate field
    let match_condition = { typeFormId: req.params.typeFormId };

    if (req.query.uuid) { match_condition.componentUuid = req.query.uuid; }

    // Retrieve records of all actions with the specified action type, and optionally further match to those that were performed on the specified component
    // The first argument should be an object consisting of the match condition, i.e. the type form ID to match to
    const actions = await Actions.list(match_condition, { limit: 200 });

    // Extract only the ID field (in string format) from each action record, and save it into a list to be returned
    let actionIDs = [];

    for (const action of actions) {
      actionIDs.push(action.actionId);
    }

    // Return the list of action IDs
    return res.json(actionIDs);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Retrieve all versions of all actions that have been performed as part of a specified workflow
router.get('/actions_fromWorkflow/:workflowId([A-Fa-f0-9]{24})', permissions.checkPermissionJson('actions:view'), async function (req, res, next) {
  try {
    // Retrieve the most recent version of the record corresponding to the specified workflow ID
    const workflow = await Workflows.retrieve(req.params.workflowId);

    // Loop over the action steps in the workflow path (i.e. not including the first one relating to component creation)
    // If the step has been performed, retrieve and save all versions of the corresponding action (first removing any fields that contain large amounts of unneeded information)
    // If the step has not yet been performed, set up and save a list containing a single entry ... with this entry consisting of an object containing only the action type form name
    let workflowActions = [];

    for (const step of workflow.path.slice(1)) {
      if (step.result !== '') {
        let actionVersions = await Actions.versions(step.result);

        for (let singleVersion of actionVersions) {
          if ('images' in singleVersion) delete singleVersion.images;
          if ('comments' in singleVersion.data) delete singleVersion.data.comments;
          if ('replacedWires' in singleVersion.data) delete singleVersion.data.replacedWires;
          if ('badSolderJoints' in singleVersion.data) delete singleVersion.data.badSolderJoints;
          if ('measuredTensions_sideA' in singleVersion.data) delete singleVersion.data.measuredTensions_sideA;
          if ('measuredTensions_sideB' in singleVersion.data) delete singleVersion.data.measuredTensions_sideB;
          if ('changedTensions_sideA' in singleVersion.data) delete singleVersion.data.changedTensions_sideA;
          if ('changedTensions_sideB' in singleVersion.data) delete singleVersion.data.changedTensions_sideB;
        }

        workflowActions.push(actionVersions);
      } else {
        workflowActions.push([{ 'typeFormName': step.formName }]);
      }
    }

    // Return the list containing all versions of all actions
    return res.json(workflowActions);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Retrieve all versions of all Non-Conformance Report (NCR) actions that have been performed on a specified component
router.get('/actions_NCRs/' + utils.uuid_regex, permissions.checkPermissionJson('actions:view'), async function (req, res, next) {
  try {
    // Set up an object containing the conditions to match to ... the action type form ID and the component UUID
    let match_condition = {
      typeFormId: 'APANonConformance',
      componentUuid: req.query.uuid,
    };

    // Retrieve the latest version of all records of all actions that match the specified conditions - in this case, NCRs that have been performed on the component
    const latestVersions = await Actions.list(match_condition);

    // Loop over the returned actions, and retrieve and save ALL versions of each action
    let ncrActions = [];

    for (const action of latestVersions) {
      let ncrVersions = await Actions.versions(action.actionId);
      ncrActions.push(ncrVersions);
    }

    // Return the list containing all versions of all NCRs
    return res.json(ncrActions);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Compare wire tension measurements across locations
router.get('/actions/tensionComparisonAcrossLocations/' + utils.uuid_regex + '/:wireLayer/:origin/:destination', async function (req, res, next) {
  try {
    // Retrieve wire tension measurements that have been performed on a specified wire layer of a specified Assembled APA at two specified locations
    // If successful, this returns an object containing the measured tensions on both sides at both locations, along with the pre-calculated differences between tensions
    const tensions = await Search_ActionsWorkflows.tensionComparisonAcrossLocations(req.params.uuid, req.params.wireLayer, req.params.origin, req.params.destination);

    // Return the object in JSON format
    return res.json(tensions);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


module.exports = router;
