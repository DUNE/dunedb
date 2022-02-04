// Pull component data as json doc.
"use strict";
const express = require("express");
const permissions = require("lib/permissions.js");
const pretty = require('express-prettify');
// const fs = require('fs');
// const util = require('util');
const fs = require("fs/promises");

const Docs = require('lib/Docs.js');

var router = express.Router();
module.exports = router;
router.use(pretty({query:'pretty'})); // allows you to use ?pretty to see nicer json.


/// Docs
router.get("/doc/:docId",  permissions.checkPermissionJson("docs:view"), async function(req,res,next) {
  try {
    var rec = await Docs.retrieve(req.params.docId);
    if(!rec) {
      if(req.query.orDefault) {
       rec = {data:await getDefaultMd()}
      }
    }
    res.json(rec);
  } catch(err) {
    logger.info({route:req.route.path},err.message);
    res.status(400).json({error:err.toString()});
  }
});

var doc_default_md = null;

async function getDefaultMd() 
{
  if(!doc_default_md) {
    doc_default_md = await fs.readFile('./docs/default.md','utf8');
  }
  return doc_default_md;
}


router.post("/doc/:docId",  permissions.checkPermissionJson("docs:edit"), async function(req,res,next) {
  try {
    console.log("submit doc",req.body)
    res.json(await Docs.save(req.body,req));
  } catch(err) {
    logger.info({route:req.route.path},err.message);
    res.status(400).json({error:err.toString()});
  }
});

router.get("/docs",  permissions.checkPermissionJson("docs:view"), async function(req,res,next) {
  try {
    res.json(await Docs.list(req.query));
  } catch(err) {
    logger.info({route:req.route.path},err.message);
    res.status(400).json({error:err.toString()});
  }
});




