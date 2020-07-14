# Notes


## TODO
- Front page needs restructuring as a dashboard?
	https://getbootstrap.com/docs/4.1/examples/dashboard/
Leftbar:
	Components
		Recent
		Search
		---
		Types
	Run a test
	Workflows
		type1
		type2
		type3

	Admin:
	Component Forms
	Test Forms
	Workflow forms
	User management

# Feature:
	- Add tags to test and workflows
	- For tests, valid tags should include component types

# Feature:
	- Load last test's data into new test, to save time

# Feature:
	- Print out 'contact sheet' of QR codes for all the newly created ones in a Process 

# Feature:
	- Try to better translate Workflow Form components into output Test Form components when auto-generating the Tests
	- Attempt Component form auto-creation (Do this after I've split the component forms)






- Break the Component form into multiple subforms for convenience when editing. 
	-  This will also make it easier to allow auto-generated schema for new component types.
	- But this means I'll have to change schema so that data.type is no longer used, just a root-level type. This shouldn't be a problem; v4 schema already requires it.



- Search for components
	- UI
	- API
