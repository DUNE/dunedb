'use strict';

const chalk = require('chalk');
const express = require('express');
var permissions = require('lib/permissions.js');
var router = express.Router();
var Docs = require("lib/Docs.js");
const fs = require("fs/promises");
const logger = require('../lib/logger');

module.exports = router;


var showdown = require('showdown');
showdown.setFlavor('github');
var md_converter = new showdown.Converter();



// Static documentation
async function serve_markdown_file(req,res,next)
{
  try{
    var filename = __dirname+'/../docs/'+req.params.file;
    logger.info(filename);
    var data = await fs.readFile(filename,"utf8")
    return res.render("md.pug",{md:md_converter.makeHtml(data)});
  } catch(err) {
    return res.status(404).send("No such md file");
  }
}

router.get("/docs/:file(*.md)",serve_markdown_file);
router.get("/docs",function(req,res,next){
  req.params.file = 'index.md'; 
  return serve_markdown_file(req,res,next);
});
router.use("/docs",express.static('../docs'));


router.get("/doc",permissions.checkPermission("docs:view"),
  async function(req,res,next) {
    var docslist = await Docs.list();
    console.log(docslist);
    res.render("docList.pug",{docslist});
  }
);

router.get("/doc/:docId/edit",permissions.checkPermission("docs:edit"),
  function(req,res,next) {
    res.render("docEdit.pug");
  }
);


router.get("/doc/:docId",permissions.checkPermission("docs:view"),
  async function(req,res,next) {
    var docId = req.params.docId;
    var options = {};

    var renderData = {};
    if(req.query.v) {
      options.version = parseInt(req.query.v);
      renderData.version = req.query.v;
    }

    var record = await Docs.retrieve(docId,options);
    if(!record) {
      record = {data:`This document (${docId}) does not yet exist. [Click here to create it](/doc/${docId}/edit)`}
    }
    renderData.md = md_converter.makeHtml(record.data);
    if(permissions.hasPermission(req,"docs:edit")) renderData.editlink="/doc/"+docId+"/edit";
    // console.log("context",context)
    res.render("md.pug",renderData);
  }
);

