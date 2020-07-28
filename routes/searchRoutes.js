// pug routes
const chalk = require('chalk');
const express = require('express');
const shortuuid = require('short-uuid')();
const MUUID = require('uuid-mongodb');
const moment = require('moment');

var permissions = require('../lib/permissions.js');
var utils = require("../lib/utils.js");

var router = express.Router();

module.exports = router;

router.get('/search/:recordType?/:formId?',permissions.checkPermission("components:view"),
 async function(req,res,next) {
    var recordType = req.params.recordType;
    var formId = req.params.formId?decodeURIComponent(req.params.formId):null;
    console.log("/search ", recordType,formId)
    res.render("searchForm.pug",{recordType,formId});
});
