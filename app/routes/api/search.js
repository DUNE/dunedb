const router = require('express').Router();

const ComponentSearch = require('lib/ComponentSearch.js');

const Components = require("lib/Components.js");
const permissions = require("lib/permissions.js");
const logger = require('../../lib/logger');


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


router.get('/search/byLocation/:location', async function (req, res, next) {
  try {
    // Retrieve a list of geometry boards that have been received at the specified location
    const boardsByPartNumber = await ComponentSearch.listBoardsByLocation(req.params.location);

    // Return the list in JSON format
    return res.json(boardsByPartNumber);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


router.get('/search/byPartNumber/:partNumber', async function (req, res, next) {
  try {
    // Retrieve a list of geometry boards of the specified part number that have been received at any location
    const boardsByLocation = await ComponentSearch.listBoardsByPartNumber(req.params.partNumber);

    // Return the list in JSON format
    return res.json(boardsByLocation);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


module.exports = router;
