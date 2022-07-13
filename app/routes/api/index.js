// Pull component data as json doc.

// FIXME: This could really be broken up into more readable chunks
// Probably should be put into seperate files in routes/api/componentApi.js, etc
// and loaded from this file.
"use strict";
const Actions = require('lib/Actions.js');
const express = require("express");
const Forms = require("lib/Forms.js");
const Components = require("lib/Components.js");
const Workflows = require("lib/Workflows.js");
const Cache = require("lib/Cache.js");
const utils = require("lib/utils.js");
const permissions = require("lib/permissions.js");
const logger = require('../../lib/logger');
const chalk = require("chalk");
const pretty = require('express-prettify');
const ManagementClient = require('auth0').ManagementClient;
const m2m = require('lib/m2m.js');

var MUUID = require('uuid-mongodb');
const deepmerge = require('deepmerge');

var router = express.Router();
module.exports = router;

router.use(pretty({query:'pretty'})); // allows you to use ?pretty to see nicer json.

const { BASE_URL, AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET } = require("../../lib/constants");


////////////////////////////////////////////////////////
// Components

/// Retrieve the most recent version of a single component record
router.get('/component/' + utils.uuid_regex, permissions.checkPermissionJson('components:view'), async function(req, res, next) {
  try {
    // Retrieve the most recent version of the record corresponding to the specified component UUID
    const component = await Components.retrieve(req.params.uuid);

    // Return the record in JSON format
    return res.json(component, null, 2);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Save a new or edited component record
router.post('/component', permissions.checkPermissionJson('components:edit'), async function(req, res, next) {
  try {
    // Display a logger message indicating that a record is being saved via the '/component' route
    logger.info(req.body, 'Submission to /component');

    // Save the record
    const component = await Components.save(req.body, req);
    res.json(component.componentUuid);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


////////////////////////////////////////////////////////
// Actions

/// Retrieve the most recent version of a single action record
router.get('/action/:actionId([A-Fa-f0-9]{24})', permissions.checkPermissionJson('actions:view'), async function (req, res, next) {
  try {
    // Retrieve the most recent version of the record corresponding to the specified action ID
    const action = await Actions.retrieve(req.params.actionId);

    // Return the record in JSON format
    return res.json(action, null, 2);
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

    // Save the record
    const action = await Actions.save(req.body, req);
    res.json(action.actionId);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Retrieve records of all actions that have been performed on a single component across all action types
router.get('/actions/' + utils.uuid_regex, permissions.checkPermissionJson('actions:view'), async function (req, res, next) {
  try {
    // Retrieve all records using the specified component UUID
    const match_condition = { componentUuid: req.params.uuid };

    const actions = await Actions.list(match_condition);

    // Return the records in JSON format
    return res.json(actions);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


////////////////////////////////////////////////////////
// Forms

// API/Backend: Get a list of form schema
router.get('/:collection(componentForms|actionForms|workflowForms)/:format(list|object)?', 
  async function(req,res,next){
    try {
      var obj = await Forms.list(req.params.collection)
      if(req.params.format=="list") {
        var list = [];
        // console.log(obj);
        for(var key in obj) list.push(obj[key]);
        return res.json(list);
      }

      return res.json(obj);
    }catch(err) {
      res.status(400).json({error:err.toString()})
    } 
  });

// API/Backend: Get a form schema

router.get('/:collection(componentForms|actionForms|workflowForms)/:formId', 
  async function(req,res,next){
    if(req.params.collection == 'componentForms') Cache.invalidate('componentTypes');  

    var rec = await Forms.retrieve(req.params.collection,req.params.formId);
    // if(!rec) return res.status(404).send("No such form exists");
    if(!rec) { res.status(400).json({error:"no such form "+req.params.formId}); return next(); };
    logger.info(rec);
    res.json(rec);
  }
);


// API/Backend: Update a form schema.
router.post('/:collection(componentForms|actionForms|workflowForms)/:formId', 
  async function(req,res,next){
    logger.info(chalk.blue("Schema submission","/json/"+req.params.collection));

    var formId = req.params.formId;
    var input = req.body;
    try{
    if(req.body.formId !== formId)  throw new Error("FormId does not match API call.") 
      var inserted_record = await Forms.save(req.body, req.params.collection, req);
      res.json(inserted_record);
    } catch(err) { 
      logger.info({route:req.route.path},err.message);
      res.status(400).json({error:err.toString()}) 
    }
  }
);


////////////////////////////////////////////////////////
// Workflows

/// Retrieve the most recent version of a single workflow record
router.get('/workflow/:workflowId([A-Fa-f0-9]{24})', permissions.checkPermissionJson('workflows:view'), async function (req, res, next) {
  try {
    // Retrieve the most recent version of the record corresponding to the specified workflow ID
    const workflow = await Workflows.retrieve(req.params.workflowId);

    // Return the record in JSON format
    return res.json(record, null, 2);
  } catch(err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Save a new or edited workflow record
router.post('/workflow', permissions.checkPermissionJson('workflows:edit'), async function (req, res, next) {
  try {
    // Display a logger message indicating that a record is being saved via the '/workflow' route
    logger.info(req.body, 'Submission to /workflow');

    // Save the record
    const workflow  = await Workflows.save(req.body, req);
    res.json(workflow.workflowId);
  } catch(err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});



router.get("/workflow/:workflowId/"+utils.uuid_regex, permissions.checkPermissionJson("workflows:view"),
  async function(req, res, rext) {
  try {

    var outrec  = await Workflows.evaluate(req.params.workflowId, req.params.uuid);
    return res.json(outrec);
  } catch(err) {
    logger.info({route:req.route.path},err.message);
    res.status(400).json({error:err.toString()});
  }
})


// searching via POST parameters
// 
// /search/<recordType>/<type>?search=<textsearch>&insertAfter=<date>&insertBefore=<date>
router.post("/search/:recordType(component)?/:formId?",  permissions.checkPermissionJson('tests:view'), 
  async function retrieve_test_data(req,res,next) {
  try {
    logger.info("search request",req.params,req.body);
    var searchterms = null;
    var matchobj = {...req.body};
    var formId = null;
    var limit, skip;
    if(req.query.limit) limit = parseInt(req.query.limit);
    if(req.query.skip) limit = parseInt(req.query.limit);
    var skip = req.query.skip;
    if(req.params.formId) formId = decodeURIComponent(req.params.formId);

    if(matchobj.search) {
      searchterms = decodeURIComponent(matchobj.search);
      delete matchobj.search;
    }
    if(matchobj.insertionAfter) {
      matchobj["insertion.insertDate"] = {...matchobj["insertion.insertDate"],$gte: new Date(matchobj.insertionAfter)};
      delete matchobj.insertionAfter;
    }
    if(matchobj.insertionBefore) {
      matchobj["insertion.insertDate"] = {...matchobj["insertion.insertDate"],$lte: new Date(matchobj.insertionBefore)};
      delete matchobj.insertionBefore;
    }

    if(Object.keys(matchobj).length<1 && !searchterms) throw new Error("No search parameter specified.")

    var result = [];
    if(!req.params.recordType || req.params.recordType === 'component') {
      if(formId) matchobj.type = formId;
      result.push(...await Components.search(searchterms,matchobj,limit,skip));
      // logger.info("result",result);
    }
    return res.json(result);


  } catch(err) {
    logger.info({route:req.route.path},err.message);
    res.status(400).json({error:err.toString()});
  }
});


////////////////////////////////////////////////////////
// Users

/// To ensure the manager below works:
///    - go to Auth0 Dashboard -> Applications -> APIs -> Auth0ManagementAPI
///    - go to the "Machine to Machine Applications" tab
///    - set the application to "Authorized"
///    - using the pulldown arrow on the right to authorise the scopes given below
/// There is no issue using the same 'clientId' and 'clientSecret' that we use for the main authentication

const manager = new ManagementClient({
  domain: AUTH0_DOMAIN,
  clientId: AUTH0_CLIENT_ID,
  clientSecret: AUTH0_CLIENT_SECRET,
  scope: 'read:users update:users read:roles'
});


/// Retrieve a list of all human users
router.get('/users/list', permissions.checkPermissionJson('users:view'), async function (req, res, next) {
  try {
    // Get a list of all available roles in the Auth0 tenant
    const all_user_roles = await manager.getRoles(req.query);

    // Set up a matrix of which roles belong to which users
    let promises = [];

    for(const role of all_user_roles) {
      promises.push(manager.getUsersInRole({
        id: role.id,
        per_page: 100,
      }))
    }

    const role_results = await Promise.all(promises);

    // Collect and collate all information and roles for each user
    let user_data = {};

    for(let i = 0; i < all_user_roles.length; i++) {
      const role = all_user_roles[i];
      const users_with_role = role_results[i];

      for (const u of users_with_role) {
        user_data[u.user_id] = user_data[u.user_id] || u;
        user_data[u.user_id].roles = user_data[u.user_id].roles || [];
        user_data[u.user_id].roles.push(role.name);
      }
    }

    // Return the list of users in JSON format
    res.json(Object.values(user_data));
  } catch(err) {
    logger.info({route:req.route.path},err.message);
    res.status(500).json({error:err.toString()});
  }
});


router.get("/m2mUsers", permissions.checkPermissionJson("users:edit"),
  async (req,res,next) => {
    try {
      res.json(await m2m.ListMachineUsers());
    } catch(err) {
      logger.info({route:req.route.path},err.message);
      res.status(400).json({error:err.toString()});
    }
  }
)

router.post("/m2mUser/delete", permissions.checkPermissionJson("users:edit"),
  async (req,res,next) => {
    try {
      return res.json(await m2m.DeleteMachineUser(req.body.user_id));
    } catch(err) {
      logger.info({route:req.route.path},err.message);
      res.status(400).json({error:err.toString()});
    }
  }
);

// Modify or add a machine user.
router.post("/m2mUser", permissions.checkPermissionJson("users:edit"),
  async (req,res,next) => {
    try {
  
      var rec = await m2m.AddMachineUser(
          {
            user_id: req.body.user_id,
            displayName: req.body.displayName,
            email: req.body.email,
            permissions: req.body.permissions
          }
        );
      var output_record = { url: BASE_URL, 
                            client_credentials: {
                              user_id: rec.user_id,
                             secret:  rec.secret,
                            }
                          };
      return res.json(output_record);

    } catch(err) {
      logger.info({route:req.route.path},err.message);
      res.status(400).json({error:err.toString()});
    }
  }
)
