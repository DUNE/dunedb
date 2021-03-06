// pug routes
const chalk = require('chalk');
const express = require('express');
const MUUID = require('uuid-mongodb');
const moment = require('moment');

var permissions = require('lib/permissions.js');
const logger = require('../lib/logger');
var utils = require("lib/utils.js");

var router = express.Router();

module.exports = router;

router.get('/search/:recordType?/:formId?',permissions.checkPermission("components:view"),
 async function(req,res,next) {
    var recordType = req.params.recordType;
    var formId = req.params.formId?decodeURIComponent(req.params.formId):null;
    logger.info("/search ", recordType,formId)
    res.render("searchForm.pug",{recordType,formId});
});
