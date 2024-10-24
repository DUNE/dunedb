const router = require('express').Router();

const Actions = require('../lib/Actions');
const Components = require('../lib/Components');
const Forms = require('../lib/Forms');
const logger = require('../lib/logger');
const permissions = require('../lib/permissions');
const utils = require('../lib/utils');


/// View a single action record
router.get('/action/:actionId([A-Fa-f0-9]{24})', permissions.checkPermission('actions:view'), async function (req, res, next) {
  try {
    // Set up a query object consisting of the specified action ID and a version number if one is provided (if not, the most recent version is assumed)
    let query = { actionId: req.params.actionId };

    if (req.query.version) query['validity.version'] = parseInt(req.query.version, 10);

    // Simultaneously retrieve the specified version and all versions of the record, and throw an error if there is no record corresponding to the action ID
    const [action, actionVersions] = await Promise.all([
      Actions.retrieve(query),
      Actions.versions(req.params.actionId),
    ]);

    if (!action) return res.status(404).render(`There is no action record with action ID = ${req.params.actionId}`);

    // Retrieve the action type form corresponding to the type form ID in the action record, and throw an error if there is no such type form
    const actionTypeForm = await Forms.retrieve('actionForms', action.typeFormId);

    if (!actionTypeForm) return res.status(404).send(`There is no action type form with form ID = ${action.typeFormId}`);

    // Retrieve the record of the component that the action was performed on, using its component UUID (also found in the action record)
    const component = await Components.retrieve(action.componentUuid);

    // Set a variable to indicate if the specified action type is one that is part of a workflow
    // First set up a list of action type form names for all actions that are part of any workflow
    // Then check to see if the list of action type form names includes the type form name of the action type being specified
    const list_workflowTypeFormIDs = ['APA_Assembly', 'FrameAssembly'];
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
        if ((action.insertion.user.displayName == 'M2M Client') && (action.validity.version <= versionNumber)) filteredVersions.push(action);
      }

      // If there are at least two matching versions of the action (i.e. so that some comparison can actually be made) ...
      if (filteredVersions.length > 1) {
        // Save the version numbers of the two most recent versions (these are the ones whose tension measurements will be compared)
        retensionedWires_versions = [filteredVersions[0].validity.version, filteredVersions[1].validity.version];

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
      component,
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
router.get('/action/:typeFormId/' + utils.uuid_regex, permissions.checkPermission('actions:perform'), async function (req, res, next) {
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
      componentName: component.data.name,
      workflowId,
      stepIndex,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// Edit an existing action
router.get('/action/:actionId([A-Fa-f0-9]{24})/edit', permissions.checkPermission('actions:perform'), async function (req, res, next) {
  try {
    // Retrieve the most recent version of the record corresponding to the specified action ID, and throw an error if there is no such record
    const action = await Actions.retrieve(req.params.actionId);

    if (!action) return res.status(404).render(`There is no action record with action ID = ${req.params.actionId}`);

    // Retrieve the action type form corresponding to the type form ID in the action record, and throw an error if there is no such type form
    const actionTypeForm = await Forms.retrieve('actionForms', action.typeFormId);

    if (!actionTypeForm) return res.status(404).send(`There is no action type form with form ID = ${action.typeFormId}`);

    // Retrieve the record of the component that the action was performed on, using its component UUID (found in the action record)
    const component = await Components.retrieve(action.componentUuid);

    // Retrieve the workflow ID if the action record already contains such a field
    let workflowId = '';

    if (action.workflowId !== null) workflowId = action.workflowId;

    // Render the interface page
    res.render('action_specComponent.pug', {
      action,
      actionTypeForm,
      componentUuid: action.componentUuid,
      componentName: component.data.name,
      workflowId,
      stepIndex: '-99',
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// Create a new action type form
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
    res.redirect(`/actionTypes/${req.params.typeFormId}/edit`);
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// Edit an existing action type form
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
    const list_workflowTypeFormIDs = ['APA_Assembly', 'FrameAssembly'];
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
    const actions = await Actions.list(null, { limit: 200 });

    // Retrieve a list of all action type forms that currently exist in the 'actionForms' collection
    const allActionTypeForms = await Forms.list('actionForms');

    // Render the interface page
    res.render('action_list.pug', {
      actions,
      singleType: false,
      title: 'All Performed Actions (All Types)',
      allActionTypeForms,
      workflowAction: false,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// List all actions of a single action type
router.get('/actions/:typeFormId/list', permissions.checkPermission('actions:view'), async function (req, res, next) {
  try {
    // Retrieve records of all actions with the specified action type
    // The first argument should be an object consisting of the match condition, i.e. the type form ID to match to
    const actions = await Actions.list({ typeFormId: req.params.typeFormId }, { limit: 200 });

    // Retrieve the action type form corresponding to the specified type form ID
    const actionTypeForm = await Forms.retrieve('actionForms', req.params.typeFormId);

    // Retrieve a list of all action type forms that currently exist in the 'actionForms' collection
    const allActionTypeForms = await Forms.list('actionForms');

    // Set a variable to indicate if the specified action type is one that is part of a workflow
    // First set up a list of action type form names for all actions that are part of any workflow
    // Then check to see if the list of action type form names includes the type form name of the action type being specified
    const list_workflowTypeFormIDs = ['APA_Assembly', 'FrameAssembly'];
    let list_workflowActions = [];

    for (const workflowTypeFormID of list_workflowTypeFormIDs) {
      const workflowTypeForm = await Forms.retrieve('workflowForms', workflowTypeFormID);

      if (workflowTypeForm) {
        for (const step of workflowTypeForm.path.slice(1)) {
          list_workflowActions.push(step.formName);
        }
      }
    }

    const workflowAction = list_workflowActions.includes(actionTypeForm.formName);

    // Render the interface page
    res.render('action_list.pug', {
      actions,
      singleType: true,
      title: 'All Performed Actions (Single Type)',
      actionTypeForm,
      allActionTypeForms,
      workflowAction,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// Compare wire tension measurements across locations
router.get('/actions/tensionComparisonAcrossLocations', async function (req, res, next) {
  // Render the interface page
  res.render('action_tensionComparisonAcrossLocations.pug', { dictionary_locations: utils.dictionary_locations });
});


module.exports = router;
