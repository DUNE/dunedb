'use strict';

const chalk = require('chalk');
const express = require('express');
const email = require("../lib/email.js");
var permissions = require('../lib/permissions.js');
const Components = require("../lib/Components.js");
const Tags = require("../lib/Tags.js");
const Forms = require("../lib/Forms.js");
const Courses = require("../lib/Courses.js");
const child_process = require("child_process");
const fs = require("fs");

var router = express.Router();
module.exports = router;

// (async function(){
//   logger.info(await manager.getUsersByEmail('ntagg@otterbein.edu'))
// })();

// git info. Get at runtime.
var git_info = null;

// This script should do nothing if there is no git context
child_process.exec('.create_gitinfo.sh',function(error,out,err){

  // Even if this script failed, there may be a .gitinfo file, perhaps provided by the packager.
  fs.readFile(".gitinfo",'utf8',function(err,data){
    if(err) return; // Use defaults.
    git_info = {};
    git_info.revision = data.match(/^Revision: (.+)/m)[1];
    git_info.branch = data.match(/^Branch: (.+)/m)[1];
    git_info.tags = data.match(/^Tags: (.+)/m)[1];
    var git_log_index = data.match(/Recent commits:/).index;
    git_info.log = data.substring(git_log_index);
    // console.log("res:",git_log)
  })
})
// var git_branch, git_log;
// //child_process.exec('git branch --show-current', (error, stdout, stderr) => { git_branch = stdout.trim() });
// child_process.exec('git rev-parse --abbrev-ref HEAD', (error, stdout, stderr) => { git_branch = stdout.trim() });
// child_process.exec('git log -n 10 --date=short --pretty=format:"%ad %h %s"', (err,stdout,stderr) => {git_log = stdout;} );


router.get('/', async function(req, res, next) {
  if(!req.user) {
    return next();
  }
  if(req.user.user_metadata && req.user.user_metadata.start_page) return res.redirect(req.user.user_metadata.start_page);

  var tags = await Tags.get();
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

  logger.info(JSON.stringify(recentComponents));
  logger.info("Tags: "+JSON.stringify(tags));
  res.render('home.pug',{tags,recentComponents,git_info});
},
// Fallback
function(req, res, next) {
  res.render('splash.pug');
}
);



router.get('/category/:tag', async function(req, res, next) {
  function filterTag(tag,menu) {
    var retval = {};
    var got = false;
    logger.info('filterTag %o %o',tag,menu)
    for(var key in menu) {
      var form = menu[key];
      logger.info(form);
      if((form.tags || []).includes(tag) && !form.tags.includes("Trash")) {
        retval[key] = form;
        got = true;
      }
    }
    if(!got) return null;
    return retval;
  }

  var courses = filterTag(req.params.tag, await Courses.list());
  var componentForms = filterTag(req.params.tag, await Forms.list("componentForms") );
  var testForms = filterTag(req.params.tag, await Forms.list("testForms") );
  var jobForms = filterTag(req.params.tag, await Forms.list("jobForms") );
  logger.info("courses: %o",Object.keys(courses||{}))
  logger.info("components: %o",Object.keys(componentForms||{}))
  logger.info("tests: %o",Object.keys(testForms||{}))
  logger.info("jobs: %o",Object.keys(jobForms||{}))
  res.render('category.pug',{tag:req.params.tag,courses,componentForms,testForms,jobForms});

});


