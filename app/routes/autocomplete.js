// Pull component data as json doc.
const express = require("express");
const Components = require("lib/Components.js")('component');
const Tests = require("lib/Tests.js")('test');
const logger = require('../lib/logger');

var router = express.Router();
module.exports = router;


// Autocomplete Route

router.get("/uuid",async function(req,res,next) {
  // this functionality is put into Components, in case we change abstraction again.
  var types = null;
  if(req.query.type) types = req.query.type.split(',');
  var matches = await Components.findUuidStartsWith(req.query.q,types,8);
  if(matches instanceof Error) return res.json([]);

  for(var m of matches) {
    m.val = m.componentUuid;
    m.text = m.val + ' ' +m.data.name;
  }
  // logger.info('autocomplete matches',matches);
  return res.json(matches);
})



router.get("/testId",async function(req,res,next) {
  // this functionality is put into Components, in case we change abstraction again.
  var matches = await Tests.findTestIdStartsWith(req.query.q,req.query.formId);
  //console.log(req.query);
  if(matches instanceof Error) return res.json([]);

  for(var m of matches) {
    m.val = m._id;
    m.text = m.formId + ' ' + m.val;
  }
  // logger.info('autocomplete matches',matches);
  return res.json(matches);
})

