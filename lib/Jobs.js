
const database = require("./database.js");
const ObjectID = require('mongodb').ObjectID;

module.exports = {
	getJobData,
	saveJobData
}


async function getJobData(workflow_id, record_id)
{
  var workflow_name = 'workflow_'+workflow_id.replace(/[^\w]/g,'');
  var col = db.collection(workflow_name);
  var data = await col.findOne({_id:ObjectID(record_id)});
  console.log('getJobData',workflow_id, record_id, data);
  return data;
}

async function saveJobData(workflow_id, jobdata, ip, user)
{
  // Save. The jobdata object should be: 
  //{ 
  //  data: <the submitted data>,
  //  metadata: <job submission metatadata from formio>, optional
  //}
  // User is the user profile record from req.user.
  // IP is the IP address
  // 
  // Returns the ObjectID of the saved record.
  //
  // assumes permissions have been dealt with by caller.

  console.log("saveJobData",wofkflow_id);
  // metadata.
  jobdata.workflow_id = workflow_id;
  jobdata.timestamp=new Date();
  jobdata.ip = ip;
  jobdata.user = user;
  var workflow_name = 'workflow_'+workflow_id.replace(/[^\w]/g,'');
  var col = db.collection(workflow_name);
  var result = await col.insertOne(jobdata);
  console.log('  result',result.ops);
  return result.ops[0]._id;
}

