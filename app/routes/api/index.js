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
router.get('/:collection(componentForms|actionForms)/:format(list|object)?', 
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

router.get('/:collection(componentForms|actionForms)/:formId', 
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
router.post('/:collection(componentForms|actionForms)/:formId', 
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


/// Workflows
router.get("/workflows", permissions.checkPermissionJson('workflows:view'),
async function (req,res,next) {
  try {
    var record = await Workflows.list();
    return res.json(record,null,2);
  } catch(err) {
    logger.info({route:req.route.path},err.message);
    res.status(400).json({error:err.toString()});
  }
});


router.get("/workflow/:workflowId", permissions.checkPermissionJson('workflows:view'),
async function (req,res,next) {
  try {
    logger.info("retrieve workflow data",req.params);
    var record = await Workflows.retrieve(req.params.workflowId);
    return res.json(record,null,2);
  } catch(err) {
    logger.info({route:req.route.path},err.message);
    res.status(400).json({error:err.toString()});
  }
});

router.post("/workflow/:workflowId", permissions.checkPermissionJson('workflows:view'),
async function (req,res,next) {
  try {
    logger.info("save workflow data",req.params);
    var outrec  = await Workflows.save(req.body, req);
    if(req.body.workflowId !== req.params.workflowId) throw new Error("Mismatch between workflowId in route and posted object");
    return res.json(outrec,null,2);
  } catch(err) {
    logger.info({route:req.route.path},err.message);
    res.status(400).json({error:err.toString()});
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


// User management
var ManagementClient = require('auth0').ManagementClient;
var manager = new ManagementClient({
  // To ensure this works:
  // Go to auth0 dsh: Applications / APIs  / Auth0ManagementAPI
  // Tab:  Machine to Machine Applications
  // Turn on the application to "Authorized"
  // Use the pulldown-arrow on the right and authorize the scopes shown below.
  // There is no issue using the same authentication clientId and clientSecret that we use
  // for the main authentication.

  domain: AUTH0_DOMAIN,
  clientId: AUTH0_CLIENT_ID,
  clientSecret: AUTH0_CLIENT_SECRET,
  scope: 'read:users update:users read:roles'
});
router.get("/roles",  permissions.checkPermissionJson('users:view'),
    async (req,res,next) => {
      try {
        return res.json(await manager.getRoles({per_page:100}));
      } catch(err) {
        logger.info({route:req.route.path},err.message);
        res.status(400).json({error:err.toString()});
      }
    }
);

router.get("/users",  permissions.checkPermissionJson('users:view'),
  async (req,res,next) => {
    try {
      // console.log("roles",await(manager.getUsersInRole({id:"rol_n8NDlqVTh01dZf1Z"})));
      // var result = await manager.getUsers({
      //   per_page: parseInt(req.query.per_page) || 10,
      //   page: parseInt(req.query.page) || 0,
      //   q: req.query.q
      // });
      // get list of all role types.
      var p = req.query;
      if(! p.per_page) p.per_page = 100;
      var all_roles = await manager.getRoles(p);
      var promises = [];
      for(var role of all_roles) {
        promises.push(manager.getUsersInRole({id:role.id,per_page:100}))
      }
      var role_results = await Promise.all(promises);
      var user_data = {};
      for(var i=0;i<all_roles.length;i++) {
        var role=all_roles[i];
        var role_users =role_results[i];
        for (var u of role_users) {
          user_data[u.user_id] = user_data[u.user_id] || u;
          user_data[u.user_id].roles = user_data[u.user_id].roles || [];
          user_data[u.user_id].roles.push(role.name);
        }
      }

      res.json(Object.values(user_data));
    } catch(err) {
      logger.info({route:req.route.path},err.message);
      res.status(400).json({error:err.toString()});
    }
  }
)


async function user_info(user_id) 
{
    var [user,roles_description,permissions_description]= await Promise.all([
       await manager.getUser({id:user_id}),
       await manager.getUserRoles({id:user_id}),
       await manager.getUserPermissions({id:user_id}),
    ]);
    var result = {...user,roles_description,permissions_description};
    result.permissions = [];
    result.roles = [];
    result.roleIds = [];
    for(var a of roles_description) result.roles.push(a.name);
    for(var a of roles_description) result.roleIds.push(a.id);
    for(var a of permissions_description) result.permissions.push(a.permission_name);
    return result;
}


router.get("/user/:user_id",  permissions.checkPermissionOrUserIdJson("users:view"),
  async (req,res,next) => {
    try {
      res.json(await user_info(req.params.user_id));
    } catch(err) {
      logger.info({route:req.route.path},err.message);
      res.status(400).json({error:err.toString()});
    }
  }
)

router.post("/user/:user_id", permissions.checkPermissionOrUserIdJson("users:edit"),
  async (req,res,next) => {
    try {

      // First, check permissions.
      // only admins can edit these values:
      var is_admin = permissions.hasPermission(req,"users:edit");
      if(!is_admin) {
        if(req.body.user_metadata || req.body.roleIds || req.body.roles || req.body.permissions) {
          return res.status(400).json({error:"Metadata, roles, and permissions are only editable by an admin."});
        }
      }

      var resultses = []
      if(req.body.roleIds) {
        /// change roles
        var new_roles = req.body.roleIds;
        //need role_ids submitted.  This code would change from names->roles
        logger.info({user_id:req.user.user_id,new_roles},`${req.user.user_id} attempting to change user roles for user ${req.params.user_id}`);
        var r = await manager.assignRolestoUser({id:req.params.user_id},{roles:req.body.roleIds});
        logger.info(r,"Result of change");

      }
      // if(req.body.roles) {
      //   /// change roles
      //   var new_roles = req.body.roles;
      //   need role_ids submitted.  This code would change from names->roles
      //   var all_roles = await manager.getRoles({per_page:100});
      //   for(var role_name of req.body.roles) {
      //     for(var role of all_roles) {
      //       if(role.name == role_name) {
      //         new_roles.push(role.id);
      //       }
      //     }
      //   }
      //   logger.info({user_id:req.user.user_id,update_user},`${req.user.user_id} attempting to change user roles for user ${req.params.user_id}`);
      //   var r = await manager.assignRolestoUser({id:req.params.user_id},{roles:req.body.roles});
      //   logger.info(r,"Result of change");

      // }
      // if(req.body.permissions) {
      //   /// change permissions
      //   /// Usually this isn't what we want to do!  Use roles instead!
      // }



      var allowed_keys = ['user_metadata','email','picture','family_name','given_name','name','nickname','phone_number',]
      var update_obj = {}
      var update_user = false;
      for(var key in req.body) {
        if(allowed_keys.includes(key)) { update_user = true; update_obj[key] = req.body[key];}
      }
      if(update_user) {
        var r = await manager.updateUser({id:req.params.user_id},update_obj);
        logger.info({user_id:req.user.user_id,update_user},"Changed user profile");
        logger.info(r,"Result of change");
      }

      res.json(await user_info(req.params.user_id));

    } catch(err) {
      logger.info({route:req.route.path},err.message);
      res.status(400).json({error:err.toString()});
    }
  }
)

var m2m = require("lib/m2m.js");
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
