# Internal Mongo Schemas


## Schema version 4.2

Here I wanted more consistency between different records. 
### Record layout
This is the typical layout for any record. Not all records have all these fields.
```
{
    _id: <ObjectId>,               // Always auto-set at creation time. 
    recordType: <string>,          // e.g. component, form, test, job
    collection: <string>,          // collection name
    componentUuid: <BSON object>,  // UUID of component, binary form.
    formId: <string>,              // id of form used 
    data: {}                       // for tests and jobs and components
    metadata: {}                   // reserved for formio stuff
    schema: {}                     // for forms
}
```


#### Common block: Insertion
All records (forms, components, test, jobs) should have this block.
```
{
    insertDate: <date>,   	// Timestamp written to database
    ip: <string>					// ip address of creator client
    user: <user>					// trimmed user record (see below)
}
```

#### Common block: User
Used in the Insertion block, above.
```
insertion: {
  displayName: <String>,         // Printable name
  user_id:   <string>,           // auth0 user_id 
  emails: [ <string>, ...]       // email list
}
```

#### Common block: Validity
All records that evolve (components, forms) should have this.
```
validity: {
  startDate: <Date>       // Date this version becomes active
  version: <integer>	    // version number for validity; later numbers are more correct
  changedFrom: <ObjectId> // Row number of the last version of this form. SHOULD be version-1...
}
```

#### Common block: CreatedFrom:
```
{
  createdFrom: // Exists only if this record was created by process
    processRecordId:  <ObjectId> // Record ID 'processed' collection
    id: <ObjectID>,              // The record (typically a job) that led to the creation of this object
    recordType: <String>,        // usually a job
    collection: <String>,        // usually 'jobs'
    formId: <String>             // Name of the form that did this
    formObjectId: <ObjectId>     // specific reference to the form that did this.
    processId: <String>,         // Name of the process invoked.
  }

}
```

#### Common elements to all records:
All records in the datbase should have the following fields:
```
  _id: <ObjectId>,    // Auto-set by Mongo, Includes insertion timestamp redundantly.
  recordType: <string>,  // component, form, test, job
```

(Because the `id` field is set by Mongo, it contains a timestamp. This timestamp should be the same as the insertion.startDate timestamp to within a second.)


#### Common

In addition, some will have this field:
```
  collection: <string> // the name of the Mongo collection this record is stored in
```


### Component Record
```
{
  // supplied by API:
  _id: <ObjectId>,    // Auto-set by Mongo, Includes insertion timestamp redundantly.
  recordType: "component",  // component, form, test, job
  insertion: <insertion block>,
  state: "submitted",
  referencesComponents: [ <BSON Uuid>,... ], // list of uuids in data given below.., found by deep searh
  createdFrom: {},  //optional, see createdFrom block.

  // supplied by caller:
  type: <string>,   
  componentUuid,              // component uuid
  validity: <validity block>  // Fields are auto-set if empty.
  data: {
    name: <string>  // user-readable name
  }
  metadata: {}

}
```

### Form
```
{
  // supplied by API:
  _id: <ObjectId>,    // Auto-set by Mongo, Includes insertion timestamp redundantly.
  recordType: "form",  // component, form, test, job
  collection: <string>, // which form collection this comes from.
  insertion: <insertion block>

  // Supplied by caller:
  validity: <validity block>
  formId: <string>   //  identifier for this form type
  formName: <string> //  Name of this form
  schema: {
    components:[...]
  }
  processes: { // optional
      <processId> : <algorithm,
      ...
  } 
}
```


### Test / Job
```
{
  // supplied by API:
  _id: <ObjectId>,    // Auto-set by Mongo, Includes insertion timestamp redundantly.
  recordType: <string>   //  "test" or "job" respectively
  insertion: <insertion block>
  createdFrom: {},  //optional, see createdFrom block.
  }]

  // supplied by caller:

  componentUuid,  // BSON component UUID. Required for 'test', should not be there for 'job'. Provided via api route.
  formId: <string>, 
  formName: <string>,        // OMIT???
  formObjectId: <ObjectId>,  // objectID of the form record used.
  state: <string>         // Required. "submitted" for final data, "draft" for a draft
                          // Also reserved: 'trash'
  data: { ...  }      // actual test data. (Also contains uuid?)
  metadata: { ... },   // optional, Formio stuff.
  processed: [<objects>] // processes that have been applied to record
}
```


### Process records
Collection 'processed'.
```
{
  _id: <ObjectId>
  input: {                // Describes the original Job record that was procssed/
    recordType: <String>,
    collection: <String>,
    _id: <ObjectId>
  },
  process: {
    _id: <ObjectId>
    formId: <String>
    collection: <String>,
    processId: <String>
  }
}
```


### Comonent relationships:
This collection is used to find connections between Components, and is reconstructed automatically by either map-reduce or on record insert.  This is not structured like the others, since it is basically a reconstructable index rather than storage.

```
{
  _id: <BSON Uuid>,
  referredToBy: [<BSON Uuid>,... ]
}
```

































## OBSOLTE - Schema version 3
### Components

```
{
	_id: ObjectId(),   		// Autoallocated by Mongo at write time
	recordType: 'component', // required
	effectiveDate: <date>  // Validity date start
	submit: {
	  insertDate: <date>,   	// Timestamp written to database
      ip: <string>					// ip address of creator client
      user: {}					// trimmed user record (see below)
      version: <integer>	    // version number for validity; later numbers are more correct
      diff_from: <objectId>     // row _id number of the last version
	}
	componentUuid: <Binary UUID blob>
	<any other fields>
}
```

### Forms
The same format is used for the `componentForm`, `testForms`, and `jobForms` collections
```
{
	_id: <ObjectId>,        // Document ID autoallocated by Mongo at write 
	recordType: 'form',
	collection: <string>   // Name of mongodb collection this record is put in.
	form_id:  <string>   // Identifier for this form type 
	insertDate: <date> // time record was inserted
	submit_ip:  <string> // ip address of creator
	user:  {}			// trimmed user record.
	revised_by: <string> // display name of above  FIX
	diff_from: <ObjectID> // last version
	version: <integer>  // version number
	effectiveDate: <Date> // when to start using this form in anger
	schema: {             // this is the Formio form record used to describe data entry
		components: [...]
	}
	metadata: {}         // junk created by Formio
}
```

### Tests
```
{
  _id: <ObjectId>         // ObjectId assigned by mongo, at time of first draft-save
                           // For strict time ordering, use insertDate below.
  form_id:  <string>       // name of the form>   REQUIRED
  form: {              
     _id:                  // Record of form used to generate this test
     form_id:              // form_id of that form
     form_title:           // Title of that form
     version:              // version used
     effectiveDate:        // effectiveDate of that form version
     insertDate:           // insertDate of that form version.
  }
  

  data: {                  // The actual data payload.
         componentUuid: <string>  // --> REQUIRED for test, not for jobs
                                  //matches [  A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}
         <any other data>
        }
  metadata: {}            // Formio junk. Probably useless.
  state: <string>         // Required. "submitted" for final data, "draft" for a draft verison.
                          // Also reserved: 'trash'
  
  insertDate: <Date>   // timestamp of submission recieved by DB
  user: {}             // trimmed user object
}
```

## Common subrecords

Trimmed User Record:
```
{ 
	user_id: <string>, // the auth0 id, unless it starts with 'm2m' for a machine user
	displayName: <string>,  // What to display
	emails: [ <string>, ... ] // array of email addresses, usually only first one used.
}
```