
var sietchConnect  = require("../client/SietchConnect.js");
var fs = require('fs');
var moment = require('moment');

var sietch = new sietchConnect();


sietch.connect().then(async ()=>{

	// First, create the components.
	
	var uuids = {};
	var data = JSON.parse(fs.readFileSync('sietch_win/tblGeneral.json'));
	console.dir(data);

	for(var rec of data) {
		console.log('rec',rec);
		var uuid = await sietch.get("/generateComponentUuid");
    var component = {
      componentUuid: uuid,
      type: "Protodune APA",
      data: {...rec}
    }
    component.data.name = "protoAPA " + rec.APAID,
		var retval = await sietch.post("/component/"+uuid,{data:rec});
		uuids[rec.APAID] = uuid;
	}

	// Now add tests.
	var filenames = [
		'sietch_win/tbl030.json',
		'sietch_win/tblFrame_Assembly.json',
		// 'sietch_win/tblGeneral.json',
		'sietch_win/tblGwind.json',
		'sietch_win/tblPrep_For_Winding.json',
		'sietch_win/tblUwind.json',
		'sietch_win/tblVwind.json',
		'sietch_win/tblXwind.json',
	];
	for(filename of filenames) {
		var data = JSON.parse(fs.readFileSync(filename));
		console.log("filename",filename);
		var form_id = 'prototype_apa_' + filename.match(/.*tbl(.*)\.json/)[1];
		console.log(form_id);
		// get list of all fields.
		var fields = {};
		// now insert all records.
		for(var record of data) {
			record.componentUuid = uuids[record.APAID]; // Assign this uuid.
			var submission = {data:record};
			submission.form_id = form_id;
      submission
			var retval = await sietch.post('/test',submission);
			console.log('inerted test record',retval);
		}



	}

})