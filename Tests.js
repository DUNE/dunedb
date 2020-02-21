
const database = require("./database.js");
const ObjectID = require('mongodb').ObjectID;

module.exports = {
	getTestData,
	saveTestData
}


async function getTestData(form_id, record_id)
{
  var form_name = 'form_'+form_id.replace(/[^\w]/g,'');
  var col = db.collection(form_name);
  var data = await col.findOne({_id:ObjectID(record_id)});
  console.log('getTestData',form_id, record_id, data);
  return data;
}

async function saveTestData(form_id, testdata, ip, user)
{
  // Save. The testdata object should be: 
  //{ 
  //  data: <the submitted data>,
  //  metadata: <form submission metatadata from formio>, optional
  //}
  // User is the user profile record from req.user.
  // IP is the IP address
  // 
  // Returns the ObjectID of the saved record.
  //
  // assumes permissions have been dealt with by caller.

  console.log("saveTestData",form_id);
  // metadata.
  testdata.form_id = form_id;
  testdata.timestamp=new Date();
  testdata.ip = ip;
  testdata.user = user;
  var form_name = 'form_'+form_id.replace(/[^\w]/g,'');
  var col = db.collection(form_name);
  var result = await col.insertOne(testdata);
  console.log('  result',result.ops);
  return result.ops[0]._id;
}

