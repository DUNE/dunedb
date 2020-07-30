
# TODO

### Feature: tidy up production site
- Remove 'toy' things.  -> Largely done. Some forms remain.
- Add front page and css files that are specific to site, including link to dev site. Use a global variable available to pug and global.config.  ->Done.

- Think about permissions for devsite being different - how? - change the permissions code to prefix 'dev:' to all permissons questions.  Grant `dev:*` to all user accounts  ->Done.



### Feature: track component ownership chains up-and-down with graphical interface
- First need a data source to mimic what I want
- Then need to build map-reduce sets to allow fast lookup
- Then need to build a gui

### Feature: allow user to self-promote based on a collaboration secret
- Basic feature, works by config.js option. ->Done
- Also, send email

### Feature: icons
- Add an icon upload on each form page (comp,test,workfow)
  - Sensible max size
  - Keep a Cache of these files in memory, resizing to sensible if needed?  But then how to serve?

### Features: searching
- Look at full text search of components and workflows DONE July 27 v 4.4
- Attempt to pull up a version of the form and allow partial entries with auto-lookup. DONE July 27 v 4.4
- Document API

### Features: authentication and authorization
- Deal with user roles and permissions correctly
  - DONE July 18 2020.  Users without any role get the 'user' role, which in development means all permissions.  Also, roles are now reported back to Sietch from auth0
- Have info page for each user -> DONE July 28 
- Change m2m users: instead of storing in mongo, instead store in auth0.
  - The m2m creation script should do a createUser, with app_metadata including the secret
  - The m2m authorization script can then check with a getUser({username:"user","app_metadata.secret":"secret"});
- Add timeout on m2m requests by ip to stop brute-force attacks

### Feature:
- Add tags to test and workflow -> Done
- For tests, valid tags should include component types ->Done
- Have a 'mothball' or 'trash' type so it doesn't show up. ->Done
- Organize by tags - not done




### Feature:
- Search for components
		- UI  -first pass done
		- API


# Updates - Meeting July 14 APA DB Group

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


# Updates July 28 2020

- User permissions system now implemented correctly 
  - New users are assigned a starting role automatically.  Currently, that role is "all access" but that is now easily changed.

- Searching now implemented.  Full-text searching, along with form-based "Advanced" search page now active.  API for searching now available too.

- Reworked generation of QR codes a bit for a cleaner result, to make it easier to get just the QR code for the cutter/printer devices. Eager to hear back what will work.

- User information pages now available

# Some Finished to-do items:
### Feature:
- Print out 'contact sheet' of QR codes for all the newly created ones in a Process 
	DONE  July 14

### Feature:
- Load last test's data into new test, to save time (button)
	DONE  July 14

### Feature:
- Try to better translate Workflow Form components into output Test Form components when auto-generating the Tests DONE July 15

### FIX:
- Dashboard sidebar is not visibile in mobile formats. Can be fixed with hide/show button, as shown in https://bootstrapious.com/p/bootstrap-sidebar -> DONE!  That site not useful, went with something more straightforward. July 23 20

### Backend:
- Break the Component form into multiple subforms for convenience when editing.  -> done
-  This will also make it easier to allow auto-generated schema for new component types.
- But this means I'll have to change schema so that data.type is no longer used, just a root-level type. This shouldn't be a problem; v4 schema already requires it. ->done

### Feature:
- Attempt Component form auto-creation (Do this after I've split the component forms) -> Done



