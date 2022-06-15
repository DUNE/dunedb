// Pull component data as json doc.

// FIXME: This could really be broken up into more readable chunks
// Probably should be put into seperate files in routes/api/componentApi.js, etc
// and loaded from this file.
"use strict";
const Actions = require('lib/Actions.js');
const express = require("express");
const Forms = require("lib/Forms.js");
const Components = require("lib/Components.js")('component');
const Tests = require("lib/Tests.js")('test');
const Jobs = require("lib/Jobs.js")('job');
const ComponentTypes = require("lib/ComponentTypes.js");
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


// /generateComponentUuid
// data format: none

var QRCodeSVG = require('qrcode-svg');
const { BASE_URL, AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET } = require("../../lib/constants");

// /api/generateComponentUuid returns the UUID string
// /api/generateComponentUuid/url returns URL+UUID
// /api/generateComponentUuid/svg returns an SVG file that formats the URL+UUID
// /api/generateComponentUuid/svg?ecl=L,M, or H turns down the error correction from Q

router.get('/generateComponentUuid/:format(svg|url)?', permissions.checkPermissionJson('components:edit'), 
  async function(req,res){
    var uuid = Components.newUuid();
    if(req.params.format) {
      if(req.params.format=="url") {
        return res.json(`${BASE_URL}/${uuid.toString()}`);
      }
      if(req.params.format=="svg") {
        var qr = new QRCodeSVG({
          content: `${BASE_URL}/${uuid.toString()}`,
          padding: 0,
          ecl: (['L','M',"H","Q"].includes(req.query.ecl))?req.query.ecl:"Q",
          container: "svg-viewbox",
          join: true
        });
        res.set('Content-Type', "image/svg+xml");
        logger.info(qr.svg());
        return res.send(qr.svg());
      }
    }
    res.json(uuid.toString());
  }
);

// GET /component/uuid
// data format: none
// retrieves component of given id
router.get('/component/'+utils.uuid_regex, permissions.checkPermissionJson('components:view'), 
  async function(req,res){
    // fresh retrival
    var componentUuid = req.params.uuid;
    var component= await Components.retrieve(componentUuid);
    if(!component)  return res.status(400).json({error:"UUID not found"});
    res.json(component);
  }
);


// GET /<shortuuid>
// As above.
router.get('/'+utils.short_uuid_regex, permissions.checkPermissionJson('components:view'), 
  async function(req,res){
    var componentUuid = utils.unshortenUuid(req.params.shortuuid);
    var component= await Components.retrieve(componentUuid);
    if(!component)  return res.status(400).json({error:"UUID not found"});
    res.json(component);
  }
);


// GET /<componentUuid>
// As above.
router.get('/'+utils.uuid_regex, permissions.checkPermissionJson('components:view'), 
  async function(req,res){
    var componentUuid = req.params.uuid
    var component= await Components.retrieve(componentUuid);
    if(!component)  return res.status(400).json({error:"UUID not found"});
    res.json(component);
  }
);


// GET /component/uuid/simple
// data format: component, but only small projection.
// retrieves component of given id, but lightweight
router.get('/component/'+utils.uuid_regex+'/simple', permissions.checkPermissionJson('components:view'), 
  async function(req,res){
    // fresh retrival
    var componentUuid = (req.params.uuid) || shortuuid.toUUID(req.params.shortuuid);
    var component= await Components.retrieve(componentUuid,
      {type:1, "data.name":1, componentUuid:1, validity:1, insertion:1});
    if(!component)  return res.status(400).json({error:"UUID not found"});
    res.json(component);
  }
);

router.get('/component/'+utils.uuid_regex+'/relationships', permissions.checkPermissionJson('components:view'), 
  async function(req,res){
  try{
    // fresh retrival
    var componentUuid = (req.params.uuid) || shortuuid.toUUID(req.params.shortuuid);
    var relationships = await Components.relationships(componentUuid);
    if(!relationships)  return res.status(400).json({error:"UUID not found"});
    // for(var i in relationships.linkedFrom) {
    //   var list = relationships.linkedFrom[i];
    //   for(var elem of list) elem.componentUuid = MUUID.from(elem.componentUuid).toString();
    // }
    // for(var i in relationships.linkedTo) {
    //   var list = relationships.linkedTo[i];
    //   for(var elem of list) elem.componentUuid = MUUID.from(elem.componentUuid).toString();
    // }
    // logger.info("relationships",relationships);
    res.json(relationships);
  } catch(err) {
      logger.error(err);
      res.status(400).json({error:"Save failure "+err.toString()})
    }  
  }
);


// POST /component/uuid
// data format: {
//   data: {
//     component fields, including uuid
//   }
// }
//
// retrieves component of given id
router.post('/component/'+utils.uuid_regex, permissions.checkPermissionJson('components:edit'), 
  async function(req,res,next){
    var componentUuid = (req.params.uuid) || shortuuid.toUUID(req.params.shortuuid);
    var record = req.body;
    record.componentUuid = componentUuid; // Ensure that record is keyed with URL route
    try {
      logger.info("saving component",record);
      var data = await Components.save(record,req);
      return res.json(data);
    } catch(err) {
      logger.error(err);
      res.status(400).json({error:"Save failure "+err.toString()})
    }  
  }
);


router.get('/components/:type', permissions.checkPermissionJson('components:view'), 
  async function(req,res,next){
    // FIXME, add search terms
    try {
      var type = decodeURIComponent(req.params.type);
      var data = await Components.list({type:type});
      return res.json(data);
    } catch(err) {
      res.status(400).json({error:err.toString()})
    }  
  }
);


Cache.add('componentTypes',
    async function(){
      logger.info("regenerating componentTypes");
      var types = await Components.getTypes();
      var forms = await Forms.list('componentForms');
      var componentTypes = deepmerge(types,forms);
      return componentTypes;
  },
  ['componentCountsByType','formlist_componentForms'] // invalidate if these are invalidated
);

router.get('/componentTypes/:type?', permissions.checkPermissionJson('components:view'), 
  async function(req,res,next){
    try {
      var componentTypes =  await ComponentTypes.list();
      // one type
      if(req.params.type) return res.json(componentTypes[decodeURIComponent(req.params.type)]);
      return res.json(componentTypes);
    } catch(err) {
      res.status(400).json({error:err.toString()})
    }  
  }
);

router.get('/componentTypesTags', permissions.checkPermissionJson('components:view'), 
  async function(req,res,next){
    logger.info("Type tags",)
    try {
      var data = await Forms.list("componentForms");
      var list=[{formId:"Trash"}];
      for(var key in data) {
        list.push(data[key]);
      }
      return res.json(list);
    } catch(err) {
      res.status(400).json({error:err.toString()})
      logger.info({route:req.route.path},err.message);
    }  
  }
);


////////////////////////////////////////////////////////
// Actions

/// Retrieve the most recent version of a single action record
router.get('/action/:actionId([A-Fa-f0-9]{24})', permissions.checkPermissionJson('actions:view'), async function (req, res, next) {
  try {
    // Retrieve the most recent version of the record corresponding to the specified action ID
    var action = await Actions.retrieve(req.params.actionId);

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
    var action = await Actions.save(req.body, req);
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
    var match_condition = { componentUuid: req.params.uuid };

    var actions = await Actions.list(match_condition);

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
router.get('/:collection(testForms|componentForms|jobForms|actionForms)/:format(list|object)?', 
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

router.get('/:collection(testForms|componentForms|jobForms|actionForms)/:formId', 
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
router.post('/:collection(testForms|componentForms|jobForms|actionForms)/:formId', 
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


/////////////////////////////////////////////////////////////
// Test data

/// submit test form data
router.post("/test", permissions.checkPermissionJson('tests:submit'), 
  async function submit_test_data(req,res,next) {
    logger.info(chalk.blue("Form submission",req.params.formId));
    // var body = await parse.json(req);
    try {
      logger.info(req.body,"Submission to /test");
      var outrec = await Tests.save(req.body, req);
      res.json(outrec);
    } catch(err) {
      logger.error("error submitting form /test"+req.params.formId);
      res.status(400).json({error:err.toString()});
    } 
  }
);


// Get a specific test

router.get("/test/:record_id([A-Fa-f0-9]{24})",  permissions.checkPermissionJson('tests:view'), 
  async function retrieve_test_data(req,res,next) {
  try {
    logger.info("retrieve test data",req.params);
    var record = await Tests.retrieve(req.params.record_id);
    return res.json(record,null,2);
  } catch(err) {
    logger.info({route:req.route.path},err.message);
    res.status(400).json({error:err.toString()});
  }
});


// Get summary data for specific test
router.get("/test/:record_id([A-Fa-f0-9]{24})/info",  permissions.checkPermissionJson('tests:view'), 
  async function retrieve_test_data(req,res,next) {
  try {
    var test = await Tests.retrieve(req.params.record_id, {_id:1, componentUuid:1, formId: 1, insertion: 1});
    var forminfo = {};
    if(test) forminfo = (await Forms.list("testForms"))[test.formId];
    var record = {...forminfo,...test};
    return res.json(record,null,2);
  } catch(err) {
    logger.info({route:req.route.path},err.message);
    res.status(400).json({error:err.toString()});
  }
});

// Get many specific tests
router.post("/test/getBulk",  permissions.checkPermissionJson('tests:view'), 
  async function(req,res,next) {

  try {
    if(!Array.isArray(req.body)) throw(new Error("/test/getBulk expects and array"))
    var input = req.body;
    // console.log("/test/getBulk with ",req.body.length, " entries");
    logger.info("retrieve test data",req.body);
    var records = await Tests.retrieveBulk(req.body);
    return res.json(records,null,2);
  } catch(err) {
    logger.info({route:req.route.path},err.message);
    res.status(400).json({error:err.toString()});
  }
});

// Get list of tests done on a specific component

router.get("/tests/"+utils.uuid_regex,  permissions.checkPermissionJson('tests:view'), 
  async function (req,res,next) {
  try {
    return res.json(await Tests.listComponentTests(req.params.uuid));
  } catch(err) {
    logger.info({route:req.route.path},err.message);
    res.status(400).json({error:err.toString()});
  }
});




/////////////////////////////////////////////////////////////
// Job data

/// submit job form data
// Same as test, but no componentUuid required.
router.post("/job", permissions.checkPermissionJson('jobs:submit'), 
  async function submit_test_data(req,res,next) {
    logger.info(chalk.blue("Job submission",req.params.formId));
    // var body = await parse.json(req);
    try {
      var outrec  = await Jobs.save(req.body, req);
      res.json(outrec.jobId);
    } catch(err) {
      logger.info({route:req.route.path},err.message);
      res.status(400).json({error:err.toString()});
    } 
  }
);


router.get("/job/:record_id([A-Fa-f0-9]{24})",  permissions.checkPermissionJson('tests:view'), 
  async function retrieve_test_data(req,res,next) {
  try {
    logger.info("retrieve test data",req.params);
    var record = await Jobs.retrieve(req.params.record_id);
    return res.json(record,null,2);
  } catch(err) {
      logger.info({route:req.route.path},err.message);
      res.status(400).json({error:err.toString()});
  }
});


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
router.post("/search/:recordType(component|job|test)?/:formId?",  permissions.checkPermissionJson('tests:view'), 
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
    if(!req.params.recordType ||req.params.recordType === 'test') {
      if(formId) matchobj.formId = formId;
      // logger.info("matchobj",matchobj);
      result.push(...await Tests.search(searchterms,matchobj,limit,skip));
      // logger.info("result",result);
    }
    if(!req.params.recordType || req.params.recordType === 'job') {
      if(formId) matchobj.formId = formId;
      result.push(...await Jobs.search(searchterms,matchobj,limit,skip));
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
