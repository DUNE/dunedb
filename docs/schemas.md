# Internal Mongo Schemas


## Schema version 5

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
user: {
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
  ancestor_id: <ObjectId> // _id  of the version edited to create this one. 
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
  icon: <file reference>, // nice icon to display this thing with.
  tags: <array of string> // Category tags.  "Trash" = don't show this entry to users
  componentType: <string> // Applies to Test forms only; limits which Components have this as a test option.
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
  icon: <file reference>, // nice icon to display this thing with.
  tags: <array of string> // Category tags.  "Trash" = don't show this entry to users
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


### Course:
This represents a sequence of tasks that should be taken in terms of work proceedures.
For example, an element might need to be entered in the DB, then located, then weighed, then tested for tension, then shipped.

```
{
  _id: <BSON Uuid>,      // specific object
  recordType: "course",
  courseId: <string>,      // unique name of this path
  validity: <validity>,  // This is a versioned object
  insertion: <insertion>,

  name: <string>,    // user-readable name of this path (mutable)
  icon: <file reference>, // nice icon to display this thing with.
  tags: [ <string>,... ],  // Which tags to apply. Typically only one tag
  path: <path>,

  componentType,  // Primary component type this course will track.
};
```
where 
```
<path> = {
  [<step>,...]
}
```
and 
```
  <step> = {
    type: 'component|job|test', 
    formId: <string>,
    advice: <string> , // Mouse-over or other explanitory text
    identifier: <string>, // valid for component and job types.  
                          // Dot-notation version of how to look up the object in question in the record. i.e. if 
                          // Workflow has an apaId value that stores the UUID, this should be "data.uuid". Does
                          // not yet support array values.
  }
```


























