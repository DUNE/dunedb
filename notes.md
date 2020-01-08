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
		component_uuid: text uuid
		type: text component type
		name: human-readable name
		...
	}
	~~~~

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

