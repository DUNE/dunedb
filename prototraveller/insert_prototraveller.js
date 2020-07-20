
var sietchConnect  = require("../client/SietchConnect.js");
var fs = require('fs');
var moment = require('moment');
var autoForm = require('../lib/automaticallyCreateSchema.js')

var sietch = new sietchConnect(require('./sietch.xyz.json'));


sietch.connect().then(async ()=>{

	try{
		// First, create the components.
		
		var uuids = {};
		var data = JSON.parse(fs.readFileSync('sietch_win/tblGeneral.json'));
		// console.dir(data);

		for(var rec of data) {
			console.log('rec',rec);
			if(!rec.APAID) continue; // need a valid line
			var uuid = await sietch.get("/generateComponentUuid");
			console.log("Creating "+uuid);
	    var component = {
	      componentUuid: uuid,
	      type: "Protodune APA",
	      data: {	name: "protoAPA " + rec.APAID,
	      				...rec
	      			},
	      metadata: {'createdBy':'insert_protodune.js'}
	    }

			var retval = await sietch.post("/component/"+uuid,component);
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
			var formId = 'prototype_apa_' + filename.match(/.*tbl(.*)\.json/)[1];
			var formName = 'Prototype APA ' + filename.match(/.*tbl(.*)\.json/)[1];
			var formName = formName.replace('_',' ');
			console.log(formId);

			// Compose the test records
			var tests = [];
			for(var record of data) {
				var test = {data:record};
				test.componentUuid = uuids[record.APAID]; // Assign this uuid.
				if(!test.componentUuid) continue; // null line.
				test.formId = formId;
	      test.formName = formName;
	      test.state = "submitted";
	      test.data = {...record};
	      test.metadata = {'createdBy':'insert_protodune.js'}
				// var retval = await sietch.post('/test',test);
				console.log('inerted test record',retval);
				tests.push(test)
			}
			// console.log(autoForm(tests));
			// return;
			// generate the form.
			var newform = {
				formId: formId,
				formName: formName,
				schema: autoForm(tests),
			}
			var form = await sietch.post('/testForms/'+formId,newform);

			// Now set this to all the test, and submit
			for(var test of tests) 
			{
				test.formObjectId = form._id;
			  await sietch.post('/test/',test);
			}

		}
	} catch(err) {
		console.error(err.toString());
		console.error(err.stack)
	}

})
