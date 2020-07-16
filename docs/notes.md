# Notes


## TODO
# FIX:
	- Dashboard sidebar is not visibile in mobile formats. Can be fixed with hide/show button, as shown in https://bootstrapious.com/p/bootstrap-sidebar

# Feature:
	- Add tags to test and workflows
	- For tests, valid tags should include component types

# Backend:
	- Break the Component form into multiple subforms for convenience when editing. 
	-  This will also make it easier to allow auto-generated schema for new component types.
	- But this means I'll have to change schema so that data.type is no longer used, just a root-level type. This shouldn't be a problem; v4 schema already requires it.

# Feature:
	- Attempt Component form auto-creation (Do this after I've split the component forms)


# Feature:
	- Search for components
		- UI
		- API


## Updates - Meeting July 14 APA DB Group

### Talks opened with DB group
 - HWDB is the 'validated' software for all groups to archive into
 - A LOT of redundant work with mine - I'm further along, I think.
 - Unclear what the final solution will be. Right now working with provider -> archive model
 - After presenting to them..

### Backend schema rewrite
 - Schemas now documented [schema.md](schema.md)
 - More consistent between classes
 - Still some cosmetic knock-on bugs I'm chasing down

### Front-end facelift
  - Want to make things a bit more professional-looking
  - Still working on this
   
### Getting some documentation together
  - Trying to use [https://sietch.xyz/docs](ttps://sietch.xyz/docs) markdown files to document everything, for my own sake as well as others

### Processing
  - Workflows can now be 'processed'
  	- Script is written into the Workflow form in javascript
  	- After submission, user with privs can click the 'process' button
  	- Creates Components and Tests out of the single workflow.
  	- Not perfect yet
  		- Auto-creates Forms, but not good ones.  Formatting, specs are not copied over,
  		- Need printable contact sheet


## Some Finished to-do items:
# Feature:
	- Print out 'contact sheet' of QR codes for all the newly created ones in a Process 
	DONE  July 14
# Feature:
	- Load last test's data into new test, to save time (button)
	DONE  July 14
# Feature:
	- Try to better translate Workflow Form components into output Test Form components when auto-generating the Tests DONE July 15