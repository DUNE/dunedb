'use strict';

const chalk = require('chalk');
const express = require('express');
const email = require("../lib/email.js");
var permissions = require('../lib/permissions.js');
const Components = require("../lib/Components.js");
const Forms = require("../lib/Forms.js");
var router = express.Router();

module.exports = router;


// (async function(){
//   logger.info(await manager.getUsersByEmail('ntagg@otterbein.edu'))
// })();

router.get('/', async function(req, res, next) {
  var recentComponents = [];
  if(((req.session||{}).recent||{}).componentUuid) {
    // logger.info(chalk.blue("recent:",req.session.recent.componentUuid));
    var list = await Components.list({componentUuid:{$in:req.session.recent.componentUuid}});

    //order the list.
    var recentComponents = [];
    for(var u of req.session.recent.componentUuid) {
      recentComponents.push(
          list.find(element=>element.componentUuid ==u)
        );
    }

  }
  var tags = await Forms.tags();
  logger.info(JSON.stringify(recentComponents),tags)
  res.render('home.pug',{tags,recentComponents});
});



router.get('/category/:tag', async function(req, res, next) {
  function filterTag(tag,menu) {
    var retval = {};
    var got = false;
    logger.info('filterTag',tag,menu)
    for(var key in menu) {
      var form = menu[key];
      logger.info(form);
      if((form.tags || []).includes(tag) && !form.tags.includes("Trash")) {
        retval[key] = form;
        got = true;
      }
    }
    // if(!got) return null;
    return retval;
  }

  var componentForms = filterTag(req.params.tag, await Forms.list("componentForms") );
  var testForms = filterTag(req.params.tag, await Forms.list("testForms") );
  var jobForms = filterTag(req.params.tag, await Forms.list("jobForms") );
  logger.info("components:",Object.keys(componentForms||{}))
  logger.info("tests:",Object.keys(testForms||{}))
  logger.info("jobs:",Object.keys(jobForms||{}))
  res.render('category.pug',{tag:req.params.tag,componentForms,testForms,jobForms});

});


