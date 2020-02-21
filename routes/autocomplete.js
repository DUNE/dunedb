// Pull component data as json doc.
const express = require("express");
const Components = require("../Components.js");
const Tests = require("../Tests.js");

var router = express.Router();
module.exports = router;


// Autocomplete Route

router.get("/uuid",async function(req,res,next) {
  // this functionality is put into Components, in case we change abstraction again.
  var matches = await Components.findUuidStartsWith(req.query.q);
  console.log('autocomplete matches',matches);
  return res.json(matches);

})
