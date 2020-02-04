Major todo:
- Login and sessions
- Make all form displays work by ajax calls instead of pug-coding the data.
- Add geotag widget
- After submitting form, go to edit or view screen
- data tests of heavyweight data




Database for sessions

Main database ('sietch_dev' by default)
Database collections:

admin
	- one document, with version info, maybe more

componentForm
	- single document, contains the schema for a component identification
	~~~~
	{
		form_id: "componentForm"
		schema: -object-
		current: true for current version of form
		revised: timestamp
	}
	~~~~

components
	- One document per component. Upsert on edit.
	~~~~
	{
		submit: {
			insertDate:     date/time this record was inserted
			ip:      	 ip address this was submitted from
			user:    	 user info this was subitted by
			version: 	 integer, auto-assigned
			diffFrom:    ObjectID of record this replaced at time of submission.
			diff:        json diff beteween this and previously recorded data.
		}
		effectiveDate:  date/time this one supercedes previous ones. Set to insert time
	    componentUuid
		type: text component type
		name: human-readable name
		...
	}
	~~~~


To recover the correct record, do the same thing as Nick:
	- If no rollback, target insert is end of time
	- if no lookback, target effect is end-of-time
	- Find the entry with the latest effective date before the target effective where insert date is before target insert.

async function retrieveComponent(componentUuid,onDate,rollbackDate) {
	// Find the right component
	// rollbackdate and onDate must be in native Date() format or null

	var query = {componentUuid:componentUuid};
	if(rollbackDate) query["submit.insertDate"] = {$lt: rollbackDate}};  // rollback to things inserted before this time
	if(onDate) query.effectiveDate = {$lt: onDate}; // rollback to things that happened before this time
	var res = await db.collection('components').find(query).sort({effectiveDate:-1}).limit(1).toArray();
	if(res.length<1) return null;
	return res[0];
}


testForms
	- One entry per schema, keyed with 'form_id'; use only the one marked as 'current'
	~~~~
	{
		form_id: key to form type
		schema: -object-
		form_title: Human readable name of form
		current: true for one copy
		revised: timestamp
	}
	~~~~



form_xxx
	~~~~
	{
		form_id: xxx
		timestamp: timestamp
		ip: ip address of submitter
		user: user information
		data: {
			component_uuid: uuid of component tested
			... form data..
		}
		metadata: {
			blah
		}
	}
	~~~~


geotag
	- geotag history for everything

submissions	
	- log of all POST operations.

log
	- log entries


Basic User flow:
- enter new component
	- Brings up ComponentForm, insert
- search for component
	- Bring up static view
- scan component
	- Bring up static view

- Bring up static view of component
		- list of completed tests (click to see static view)
		- click to edit (update)
		- click to fill out form (list)

- edit test

Admin user flow:
- edit Component form
- create form
- edit form

