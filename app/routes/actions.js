const router = require('express').Router();

const Actions = require('../lib/Actions');
const Components = require('../lib/Components');
const Forms = require('../lib/Forms');
const logger = require('../lib/logger');
const permissions = require('../lib/permissions');
const Search_ActionsWorkflows = require('../lib/Search_ActionsWorkflows');
const utils = require('../lib/utils');
const Workflows = require('../lib/Workflows');


/// Retrieve an existing action record
router.get('/action/:actionId', permissions.checkPermission('actions:view'), async function (req, res, next) {
  try {
    // Set up a query object consisting of the specified action ID and a version number if one is provided (if not, the most recent version is assumed)
    let query = { actionId: req.params.actionId };

    if (req.query.version) query['recordVersion'] = parseInt(req.query.version, 10);

    // Simultaneously retrieve the specified version and all versions of the record, and throw an error if there is no record corresponding to the action ID
    const [action, actionVersions] = await Promise.all([
      Actions.retrieve(query),
      Actions.versions(req.params.actionId),
    ]);

    if (!action) return res.status(404).render(`There is no action record with action ID = ${req.params.actionId}`);

    // Retrieve the action type form corresponding to the type form ID in the action record, and throw an error if there is no such type form
    const actionTypeForm = await Forms.retrieve('actionForms', action.typeFormId);

    if (!actionTypeForm) return res.status(404).send(`There is no action type form with form ID = ${action.typeFormId}`);

    // Set a variable to indicate if the specified action type is one that is part of a workflow
    // First set up a list of action type form names for all actions that are part of any workflow
    // Then check to see if the list of action type form names includes the type form name of the action type being specified
    const list_workflowTypeFormIDs = ['APA_Assembly', 'FrameAssembly', 'APA_PostProduction'];
    let list_workflowActions = [];

    for (const workflowTypeFormID of list_workflowTypeFormIDs) {
      const workflowTypeForm = await Forms.retrieve('workflowForms', workflowTypeFormID);

      if (workflowTypeForm) {
        for (const step of workflowTypeForm.path.slice(1)) {
          list_workflowActions.push(step.formName);
        }
      }
    }

    const workflowAction = list_workflowActions.includes(action.typeFormName);

    // When viewing a 'Single Layer Tension Measurements' type action, we also want to see some additional information not directly contained in the action record:
    // - the number of wires that have been re-tensioned since the last time measurements were uploaded
    // - the number of replaced wires from the layer's winding action (which can be compared per side to the number of re-tensioned wires)
    let retensionedWires_versions = [null, null];
    let retensionedWires_values = [[], []];
    let numberOfReplacedWires = [null, null];

    if (action.typeFormId === 'x_tension_testing') {
      // Retrieve all versions of the action (ordered from latest to earliest)
      // Then filter the list of versions to only include those which satisfy the following criteria:
      //  - uploaded by the M2M Client (i.e. those where new tension measurements were uploaded)
      //  - with version number no greater than the version currently being viewed
      const actionVersions = await Actions.versions(req.params.actionId);
      const versionNumber = (req.query.version) ? parseInt(req.query.version, 10) : 99;

      let filteredVersions = [];

      for (const action of actionVersions) {
        if ((action.userName == 'M2M Client') && (action.recordVersion <= versionNumber)) filteredVersions.push(action);
      }

      // If there are at least two matching versions of the action (i.e. so that some comparison can actually be made) ...
      if (filteredVersions.length > 1) {
        // Save the version numbers of the two most recent versions (these are the ones whose tension measurements will be compared)
        retensionedWires_versions = [filteredVersions[0].recordVersion, filteredVersions[1].recordVersion];

        // Loop through the tension measurements on both sides, compare them across the versions, and save any that are different (including the wire or wire segment number)
        // Note that we can use a single loop here, since the number of wire (segments) is always the same on both sides
        // Also note that we want to see the wire or wire segment number instead of its index, so use an offset that converts from the latter to the former (dependent on the wire layer)
        let offset_wireIndex = ((action.data.apaLayer === 'x') || (action.data.apaLayer === 'g')) ? 1 : 8;

        for (let i = 0; i < filteredVersions[0].data.measuredTensions_sideA.length; i++) {
          if (filteredVersions[1].data.measuredTensions_sideA[i] !== filteredVersions[0].data.measuredTensions_sideA[i]) {
            retensionedWires_values[0].push([i + offset_wireIndex, filteredVersions[1].data.measuredTensions_sideA[i], filteredVersions[0].data.measuredTensions_sideA[i]]);
          }

          if (filteredVersions[1].data.measuredTensions_sideB[i] !== filteredVersions[0].data.measuredTensions_sideB[i]) {
            retensionedWires_values[1].push([i + offset_wireIndex, filteredVersions[1].data.measuredTensions_sideB[i], filteredVersions[0].data.measuredTensions_sideB[i]]);
          }
        }
      }

      // Set up a match condition dictionary, where we want to find the Winding action performed on the same APA component and the same side as the tension measurements being viewed
      // Then attempt to get a list of all matching actions ... this should return at least one action, since the winding should already have been performed before the tension measurements
      let match_condition = {
        typeFormId: `${action.data.apaLayer}_winding`,
        componentUuid: action.componentUuid,
      };

      const matching_windingActions = await Actions.list(match_condition);

      // If there is at least one matching winding action, count the number of replaced wires noted for each side
      if (matching_windingActions.length > 0) {
        numberOfReplacedWires = [0, 0];

        windingAction = await Actions.retrieve({ actionId: matching_windingActions[0].actionId });
        const replacedWires = windingAction.data.replacedWires;

        for (let i = 0; i < replacedWires.length; i++) {
          let singleWire_solderPads = replacedWires[i].solderPad;

          if (typeof singleWire_solderPads === 'number') {
            singleWire_solderPads = `${singleWire_solderPads}`;
          }

          if (replacedWires[i].side === 'a') {
            numberOfReplacedWires[0] += singleWire_solderPads.split(',').length;
          } else {
            numberOfReplacedWires[1] += singleWire_solderPads.split(',').length;
          }
        }
      }
    }

    // Render the interface page
    res.render('action.pug', {
      action,
      actionVersions,
      actionTypeForm,
      queryDictionary: req.query,
      retensionedWires_versions,
      retensionedWires_values,
      numberOfReplacedWires,
      workflowAction,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// Edit an existing action record
router.get('/action/:actionId/edit', permissions.checkPermission('actions:perform'), async function (req, res, next) {
  try {
    // Retrieve the most recent version of the record corresponding to the specified action ID, and throw an error if there is no such record
    const action = await Actions.retrieve(req.params.actionId);

    if (!action) return res.status(404).render(`There is no action record with action ID = ${req.params.actionId}`);

    // Retrieve the action type form corresponding to the type form ID in the action record, and throw an error if there is no such type form
    const actionTypeForm = await Forms.retrieve('actionForms', action.typeFormId);

    if (!actionTypeForm) return res.status(404).send(`There is no action type form with form ID = ${action.typeFormId}`);

    // Retrieve the workflow ID if the action record already contains such a field
    let workflowId = '';

    if (action.workflowId != null) workflowId = action.workflowId;

    // Render the interface page
    res.render('action_specComponent.pug', {
      action,
      actionTypeForm,
      componentUuid: action.componentUuid,
      componentName: action.componentName,
      workflowId,
      stepIndex: '-99',
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// Perform a new action on an unspecified component
router.get('/action/:typeFormId/unspec', permissions.checkPermission('actions:perform'), async function (req, res, next) {
  try {
    // Retrieve the action type form corresponding to the specified type form ID, and throw an error if there is no such type form
    const actionTypeForm = await Forms.retrieve('actionForms', req.params.typeFormId);

    if (!actionTypeForm) return res.status(404).send(`There is no action type form with form ID = ${req.params.typeFormId}`);

    // Render the interface page
    res.render('action_unspecComponent.pug', {
      actionTypeFormId: req.params.typeFormId,
      actionTypeFormName: actionTypeForm.formName,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// Perform a new action on a specified component
router.get('/action/:typeFormId/spec/:uuid', permissions.checkPermission('actions:perform'), async function (req, res, next) {
  try {
    // Retrieve the action type form corresponding to the specified type form ID, and throw an error if there is no such type form
    const actionTypeForm = await Forms.retrieve('actionForms', req.params.typeFormId);

    if (!actionTypeForm) return res.status(404).send(`There is no action type form with form ID = ${req.params.typeFormId}`);

    // Retrieve the most recent version of the record corresponding to the specified component UUID, and throw an error if there is no such record
    const component = await Components.retrieve(req.params.uuid);

    if (!component) return res.status(404).send(`There is no component record with component UUID = ${req.params.uuid}`);

    // Set both the workflow ID and workflow step index if the former is provided (either both or neither will be present)
    let workflowId = '';
    let stepIndex = '-99';

    if (req.query.workflowId) {
      workflowId = req.query.workflowId;
      stepIndex = req.query.stepIndex;
    }

    // Render the interface page
    res.render('action_specComponent.pug', {
      actionTypeForm,
      componentUuid: req.params.uuid,
      componentName: component.data.componentName,
      workflowId,
      stepIndex,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// Create a new action type
router.get('/actionTypes/:typeFormId/new', permissions.checkPermission('forms:edit'), async function (req, res) {
  try {
    // Check that the specified type form ID is not already being used - attempt to retrieve any and all existing action type forms with this type form ID
    let typeForm = await Forms.retrieve('actionForms', req.params.typeFormId);

    // If there are no existing type forms, set up a new one using the specified type form ID and an initially empty form schema, and save it into the 'actionForms' collection
    // Use the form ID as the form name to start with - the user will have the option of changing the name later via the interface
    if (!typeForm) {
      typeForm = {
        formId: req.params.typeFormId,
        formName: req.params.typeFormId,
        schema: { components: [] },
      };

      Forms.save(typeForm, 'actionForms', req);
    }

    // Redirect the user to the interface page for editing an existing action type form
    res.redirect(302, `/actionTypes/${req.params.typeFormId}/edit`);
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// Edit an existing action type
router.get('/actionTypes/:typeFormId/edit', permissions.checkPermission('forms:edit'), async function (req, res) {
  try {
    // Render the interface page
    res.render('action_editTypeForm.pug', {
      collection: 'actionForms',
      formId: req.params.typeFormId,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// List all action types
router.get('/actionTypes/list', permissions.checkPermission('actions:view'), async function (req, res, next) {
  try {
    // Retrieve a list of all action type forms that currently exist in the 'actionForms' collection, grouped by their 'recommended component type'
    let actionTypeForms = await Forms.listGrouped('actionForms');

    // Set up a list of action type form names for all actions that are part of any workflow
    const list_workflowTypeFormIDs = ['APA_Assembly', 'FrameAssembly', 'APA_PostProduction'];
    let list_workflowActions = [];

    for (const workflowTypeFormID of list_workflowTypeFormIDs) {
      const workflowTypeForm = await Forms.retrieve('workflowForms', workflowTypeFormID);

      if (workflowTypeForm) {
        for (const step of workflowTypeForm.path.slice(1)) {
          list_workflowActions.push(step.formName);
        }
      }
    }

    // For each group of action type forms ...
    for (let actionFormsGroup of actionTypeForms) {
      // Make a copy of the list of type form names, and sort this new copy alphabetically (the order of the original list is preserved)
      let sorted_formNames = [...actionFormsGroup.formName];
      sorted_formNames.sort();

      // Make new lists of the type form IDs and tags, now ordered accordingly to the sorted type form names ...
      // ... i.e. the first type form ID (which may not necessarily be the alphabetically first one) is the one corresponding to the first type form name
      // Additionally, set a variable to indicate if the action type is one that is part of a workflow, by checking to see if the list of action type form names includes the type form name
      let sorted_formIds = [];
      let sorted_tags = [];
      let sorted_workflowActions = [];

      for (const formName of sorted_formNames) {
        const index = actionFormsGroup.formName.indexOf(formName);
        sorted_formIds.push(actionFormsGroup.formId[index]);
        sorted_tags.push(actionFormsGroup.tags[index]);
        sorted_workflowActions.push(list_workflowActions.includes(formName));
      }

      // Overwrite the previously unordered type form name, ID and tags lists with the alphabetically ordered versions, and add the list of flags indicating workflow actions
      actionFormsGroup.formName.splice(0, actionFormsGroup.formName.length, ...sorted_formNames);
      actionFormsGroup.formId.splice(0, actionFormsGroup.formId.length, ...sorted_formIds);
      actionFormsGroup.tags.splice(0, actionFormsGroup.tags.length, ...sorted_tags);
      actionFormsGroup.workflowAction = [...sorted_workflowActions];
    }

    // Render the interface page
    res.render('action_listTypes.pug', { actionTypeForms });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// List all actions across all action types
router.get('/actions/list', permissions.checkPermission('actions:view'), async function (req, res, next) {
  try {
    // Retrieve records of all actions across all action types
    // The first argument should be 'null' in order to match to any type form ID
    const actions = await Actions.list(null);

    // Retrieve a list of all action type forms that currently exist in the 'actionForms' collection
    const allActionTypeForms = await Forms.list('actionForms');

    // Render the interface page
    res.render('action_list.pug', {
      actions,
      allActionTypeForms,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// List all actions of a single action type
router.get('/actions/:typeFormId/list', permissions.checkPermission('actions:view'), async function (req, res, next) {
  try {
    // Set up the object containing the matching conditions ... to start with, this only consists of the specified action type
    // If a component type form ID has been provided in the query, add it to the object under the appropriate field
    let match_condition = { typeFormId: req.params.typeFormId };

    if (req.query.componentTypeFormId) { match_condition.componentTypeFormId = req.query.componentTypeFormId; }

    // Retrieve records of all actions with the specified action type, and optionally further match to those that were performed on the specified component type
    // The first argument should be an object consisting of the match condition, i.e. the type form ID to match to
    const actions = await Actions.list(match_condition);

    // Retrieve the action type form corresponding to the specified type form ID
    const actionTypeForm = await Forms.retrieve('actionForms', req.params.typeFormId);

    // Retrieve a list of all action type forms that currently exist in the 'actionForms' collection
    const allActionTypeForms = await Forms.list('actionForms');

    // Set a variable to indicate if the specified action type is one that is part of a workflow
    // First set up a list of action type form names for all actions that are part of any workflow
    // Then check to see if the list of action type form names includes the type form name of the action type being specified
    const list_workflowTypeFormIDs = ['APA_Assembly', 'FrameAssembly', 'APA_PostProduction'];
    let list_workflowActions = [];

    for (const workflowTypeFormID of list_workflowTypeFormIDs) {
      const workflowTypeForm = await Forms.retrieve('workflowForms', workflowTypeFormID);

      if (workflowTypeForm) {
        for (const step of workflowTypeForm.path.slice(1)) {
          list_workflowActions.push(step.formName);
        }
      }
    }

    // For certain action types, it is useful to display some extra information
    // Add whatever information is relevant to each action record (but using the same generic field name regardless of what the information actually is)
    if (actionTypeForm.formId == 'APANonConformance') {
      for (let ncrAction of actions) {
        ncrAction.additionalInformation = ncrAction.data.nonConformanceTitle;
      }
    } else {
      for (let action of actions) { action.additionalInformation = ''; }
    }

    const workflowAction = list_workflowActions.includes(actionTypeForm.formName);

    // Render the interface page
    res.render('action_listOfSingleType.pug', {
      actions,
      actionTypeForm,
      allActionTypeForms,
      workflowAction,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// Retrieve an existing action record
router.get(['/json/action/:actionId', '/api/action/:actionId'], permissions.checkPermissionJson('actions:view'), async function (req, res, next) {
  try {
    // Set up a query object consisting of the specified action ID and a version number if one is provided (if not, the most recent version is assumed)
    let query = { actionId: req.params.actionId };

    if (req.query.version) query['recordVersion'] = parseInt(req.query.version, 10);

    // Retrieve the specified version of the record
    // If there is no record corresponding to the ID, or the version number is not valid, this returns 'null'
    const action = await Actions.retrieve(query);

    // Return the record in JSON format
    return res.status(200).json(action);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Perform a new action or edit an existing action record
router.post(['/json/action', '/api/action'], permissions.checkPermissionJson('actions:perform'), async function (req, res, next) {
  try {
    logger.info(req.body, 'Submission to /json/action');

    // Save the record ... if successful, this returns the action ID
    const actionId = await Actions.save(req.body, req);

    // Return the record's action ID
    return res.status(201).json(actionId);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Add one or more base64-encoded strings, each one representing a single image, to an action record
router.post(['/json/action/:actionId/addImages/:imageType', '/api/action/:actionId/addImages/:imageType'], permissions.checkPermissionJson('actions:perform'), async function (req, res, next) {
  try {
    // Add the encoded strings to the action record corresponding to the specified action ID ... if successful, the function returns the action ID
    // The encoded strings are contained as an array in the 'req.body.image' parameter (it is passed as a [key, value] pair, with the key being 'images' and the value being the array)
    const result = await Actions.addImageStrings(req.params.actionId, req.body.images, req.params.imageType);

    // Return the record's action ID
    return res.status(201).json(result);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Remove an image from an action record
router.post(['/json/action/:actionId/removeImage/:imageNumber', '/api/action/:actionId/removeImage/:imageNumber'], permissions.checkPermissionJson('actions:perform'), async function (req, res, next) {
  try {
    // Remove the specified image (by number, NOT INDEX) from the action record corresponding to the specified action ID ... if successful, the function returns the action ID
    const result = await Actions.removeImageString(req.params.actionId, req.params.imageNumber);

    // Return the record's action ID
    return res.status(201).json(result);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List all actions of a single action type
router.get(['/json/actions/:typeFormId/list', '/api/actions/:typeFormId/list'], permissions.checkPermissionJson('actions:view'), async function (req, res, next) {
  try {
    // Set up the object containing the matching conditions ... to start with, this only consists of the specified action type
    // If a component UUID has been provided in the query, add it to the object under the appropriate field
    let match_condition = { typeFormId: req.params.typeFormId };

    if (req.query.uuid) { match_condition.componentUuid = req.query.uuid; }

    // Retrieve records of all actions with the specified action type, and optionally further match to those that were performed on the specified component
    // The first argument should be an object consisting of the match condition, i.e. the type form ID to match to
    const actions = await Actions.list(match_condition);

    // Extract only the ID field (in string format) from each action record, and save it into a list to be returned
    let actionIDs = [];

    for (const action of actions) {
      actionIDs.push(action.actionId);
    }

    // Return the list of action IDs
    return res.status(200).json(actionIDs);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List all versions of all actions that have been performed as part of a specified workflow
router.get(['/json/actions/allFromWorkflow/:workflowId', '/api/actions/allFromWorkflow/:workflowId'], permissions.checkPermissionJson('actions:view'), async function (req, res, next) {
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
    return res.status(200).json(workflowActions);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List all versions of all Non-Conformance Report (NCR) actions that have been performed on a specified component
router.get(['/json/actions/ncrsByComponent/:uuid', '/api/actions/ncrsByComponent/:uuid'], permissions.checkPermissionJson('actions:view'), async function (req, res, next) {
  try {
    // Set up an object containing the conditions to match to ... the action type form ID and the component UUID
    let match_condition = {
      typeFormId: 'APANonConformance',
      componentUuid: req.params.uuid,
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
    return res.status(200).json(ncrActions);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List geometry board rejection counts across all [board part number, rejection location] combinations
router.get(['/json/actions/boardRejectionCounts_byPartNumberAndLocation', '/api/actions/boardRejectionCounts_byPartNumberAndLocation'], permissions.checkPermissionJson('actions:view'), async function (req, res, next) {
  try {
    // Retrieve a list of geometry board rejection counts across all [board part number, rejection location] combinations
    const boardRejectionCounts_byPartNumberAndLocation = await Actions.boardRejectionCounts_byPartNumberAndLocation();

    // Return the list of geometry board rejection counts
    return res.status(200).json(boardRejectionCounts_byPartNumberAndLocation);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Compare wire tension measurements across locations (client-side interface)
router.get('/actions/tensionComparisonAcrossLocations', async function (req, res, next) {
  // Render the interface page
  res.render('action_tensionComparisonAcrossLocations.pug', { dictionary_locations: utils.dictionary_locations });
});


/// Compare wire tension measurements across locations (query to server-side)
router.get(['/json/actions/tensionComparisonAcrossLocations/:uuid/:wireLayer/:origin/:destination', '/api/actions/tensionComparisonAcrossLocations/:uuid/:wireLayer/:origin/:destination'], async function (req, res, next) {
  try {
    // Retrieve wire tension measurements that have been performed on a specified wire layer of a specified Assembled APA at two specified locations
    // If successful, this returns an object containing the measured tensions on both sides at both locations, along with the pre-calculated differences between tensions
    const tensions = await Search_ActionsWorkflows.tensionComparisonAcrossLocations(req.params.uuid, req.params.wireLayer, req.params.origin, req.params.destination);

    // Return the object in JSON format
    return res.status(200).json(tensions);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


module.exports = router;
