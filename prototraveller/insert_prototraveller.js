
var sietchConnect  = require("../client/SietchConnect.js");
var fs = require('fs');
var moment = require('moment');

var sietch = new sietchConnect();

// common form components
var FormComponents = {
	componentUuid:  {
      "label": "Component UUID",
      "spellcheck": false,
      "disabled": true,
      "tableView": false,
      "key": "componentUuid",
      "type": "ComponentUUID",
      "input": true
    },
	text:  {
      "label": "Text Field",
      "labelPosition": "left-right",
      "spellcheck": true,
      "tableView": true,
      "calculateServer": false,
      "key": "textfield",
      "type": "textfield",
      "input": true
    },
    number: {
      "label": "Number",
      "labelPosition": "left-right",
      "mask": false,
      "spellcheck": true,
      "tableView": false,
      "delimiter": false,
      "requireDecimal": false,
      "inputFormat": "plain",
      "calculateServer": false,
      "key": "specNumberComponent",
      "type": "SpecNumberComponent",
      "input": true
    },
    textarea: {
      "label": "Text Area",
      "labelPosition": "left-right",
      "autoExpand": false,
      "spellcheck": true,
      "tableView": true,
      "calculateServer": false,
      "key": "textArea",
      "type": "textarea",
      "input": true
    },
    date:  {
      "label": "Date / Time",
      "labelPosition":"left-right",
      "tableView": false,
      "datePicker": {
        "disableWeekends": false,
        "disableWeekdays": false
      },
      "calculateServer": false,
      "key": "dateTime",
      "type": "datetime",
      "input": true,
      "suffix": "<i ref=\"icon\" class=\"fa fa-calendar\" style=\"\"></i>",
      "widget": {
        "type": "calendar",
        "displayInTimezone": "viewer",
        "language": "en",
        "useLocaleSettings": false,
        "allowInput": true,
        "mode": "single",
        "enableTime": true,
        "noCalendar": false,
        "format": "yyyy-MM-dd hh:mm a",
        "hourIncrement": 1,
        "minuteIncrement": 1,
        "time_24hr": false,
        "minDate": null,
        "disableWeekends": false,
        "disableWeekdays": false,
        "maxDate": null
      }
    },
    submit:  {
      "type": "button",
      "label": "Submit",
      "key": "submit",
      "disableOnInvalid": true,
      "input": true,
      "tableView": false
    }
}

sietch.connect().then(async ()=>{

	// First, create the components.
	
	var uuids = {};
	var data = JSON.parse(fs.readFileSync('sietch_win/tblGeneral.json'));
	console.dir(data);

	for(var rec of data) {
		console.log('rec',rec);
		var uuid = await sietch.get("/generateComponentUuid");
		rec.componentUuid = uuid;
		rec.type = "Protodune APA";
		rec.name = "Protodune APA " + rec.APAID;
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
		for(var record of data) {
			for(key in record) {
				fields[key] = "unknown";
			}
		}
		// go through and figure out type of each field.
		for(var field in fields) {
			var isNumber = true;
			var isDate = true;
			var isTextField = true;
			for(record of data) {
				var val = record[field];
				if(val) {
					console.log('considering field',val);
					if(parseFloat(val).toString !== val)  isNumber = false;
					try {
					   var d = moment.utc(val);
					   if(!d.isValid()) isDate = false;
					} catch  {
						isDate = false;
					}
					if(! moment.utc(val).isValid()) isDate = false;
					if(val.length &&
					  !(val.includes('\n') || val.includes("\r") || val.length>80 ) ) isTextField = false;
				}
			}	
			var component = {...FormComponents.text};
			if(isTextField) component = {...FormComponents.textarea};
			if(isNumber) component= {...FormComponents.number};
			if(isDate) component = {...FormComponents.date};
			component.key = field;
			component.label = field; // need better name
			//being able to fill these would be good:
			// component.placeholder = ...;
      		// component.description = ...;
      		// component.tooltip = ...;
      		fields[field] = component;      		
		}

		// create the form.
		var form = {
			form_id: form_id,
			form_title: form_id,
			schema: {components:[]},
		}
		form.schema.components.push(FormComponents.componentUuid);
		for(var field in fields) form.schema.components.push(fields[field]);
		form.schema.components.push(FormComponents.submit);

		// insert.
		var retval = await sietch.post('/testForms/'+form_id,form);
		console.log('inserted form',retval);

		// now insert all records.
		for(var record of data) {
			record.componentUuid = uuids[record.APAID]; // Assign this uuid.
			var submission = {data:record};
			submission.form_id = form_id;
			var retval = await sietch.post('/test',submission);
			console.log('inerted test record',retval);
		}



	}

})