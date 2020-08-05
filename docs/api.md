# Sietch API

(Sietch schema v4, July 2020)

Sietch does all API calls via HTTP GET and POST.  This can be done, for example, with the python `http` library.

The API can be accessed one of two ways, by either a session token, or with a JWT token.

Session tokens are typically used by browsers; the user signs in using authentication through the auth0.com framework, and the browser keeps track of the session ID with a cookie. This cookie is sent with every API request (which is usually being done via an AJAX call in one of the UI web pages.)  It is not recommended that exteranal callers use this method programmatically, but this is very useful for checking results in a browser.  To use this, replace the "/api" prefix below with "/json".

With the JWT tokens, authentication takes place with an intial POST request to '/machineAuthenticate' with a header 
```
 content-type: application/json
```
and a JSON body with 
```
{
  "user_id": "m2mXXXXXXXXXXXXX",
  "secret": "secretXXXXXXXXX"
}
```
where these two fields are granted by a Sietch admin.  These users are special ones, that must be created, and will have specific permissions for accessing the calls below.
 This all returns a single string that is a signed JWT access token that authorizes any later requests using that token.  Those requests should include headers:
```
 content-type: application/json
 authorization: 'Bearer XXXXXXXXXX
```
where XXXXXXXXXX is the JWT access token string.

These calls are all served from `routes/api.js`

## Results
Results will always be in JSON form, either a single element or an object. Successful calls with have status code 200.

If a call fails for some reason, it the response will be a status code in the 400-499 range, and will usually return a JSON document of this form:
```
{
  error: <string>
}
```
The 'error' field will exist only if there was a problem.

## Validity

The Validity object tells the Sietch engine how a revised object should be used.


The `version` field, if included, should always be an integer one greater than the most recently entered version of this item. If not defined, this will be assigned automatically.  Note that if included, this could result in a conflict (if someone else was editing this record at the same time). If this is the case, an error will be returned, and this update will not be saved.

The 'startDate' field tells the system when this update will become 'live'.  If this is a new item, this indicates the first time the item comes into existence.  If this is an update, then this represents the time this update happened (i.e. that the object changed).  A date of zero is start-of-time and is valid.   If not included, this will default to a value of NOW.

See presentations to illustrate how version and startDate are used to overlay data.

## API calls about Components

A component is a single physical object. It may change over time.

#### GET /api/generateComponenentUuid
Required permissions: "components:edit"

This call returns a JSON-formatted string giving a newly-generated UUID suitable for use with a component.  This UUID does not yet exist in the database; a component must be saved with this UUID first.  This is useful when generating linked objects before saving them.

Please ONLY use this call to generate new UUIDs; do not generate them on your own.

More options:
```
/api/generateComponentUuid returns the UUID as a json string, e.g.
  "e09f7620-d351-11ea-b1dc-0b7c5496a782"
/api/generateComponentUuid/url returns URL+UUID:
  "https://sietch.xyz/ee19a050-d351-11ea-b1dc-0b7c5496a782"

/api/generateComponentUuid/svg returns an SVG file that formats the URL+UUID

/api/generateComponentUuid/svg?ecl=L,M, or H turns down the error correction from Q
```


#### GET /api/component/123456789-abcd-1234-1234-123456789abc

Required permissions: "components:view"

This call retrieves the Component record for this Component UUID, as a hex string (with dashes).  If the component does not exist, an error will be returned.

#### POST  /api/component/123456789-abcd-1234-1234-123456789abcd

Required permissions: "components:edit" (changing an existing component)
or "components:create" (which only allows new insertions)

This sets the component to the new information provided. The body of the post should be formatted as follows:
```
{
  type: <string>,               // Component name, consistent with sietch records. New   types can be defined on the fly. 
  data: {
    ...component data
  },
  metadata: { ...optional, whatever you want...},
  validity: {   // optional
    startDate: <ISO 8601 Date String>,  // optiona, defaults to NOW
    version: <int>                      // optional, defaults to latest+1
  }
}
```


#### POST  /api/component/123456789-abcd-1234-1234-123456789abcd/simple
As above, but only reports type, data.name, validity, and insertion. 

## API calls related to Forms

A form describes a [Formio.js](https://github.com/formio/formio.js) schema allowing data entry or formatted data viewing.


#### GET /api/<collection>/<test_id>

Required permissions: "forms:view"

This retrieves the current Formio.js record that describes the schema (i.e. what the data{} blocks look like). 

There are three different collection accessible, e.g.
```
  /api/componentForms/component_type
  /api/testForms/test_one_id
  /api/jobForms/workflow_two_id
```
These are for component descriptions, test descriptions, or workflow/job descriptions respectively.

This retrieves the most recent version of this form, as described in the [schema.md document][schema.md].

TODO: allow ondate, version, and rollback via query parameters


#### POST /api/<collection>/<test_id>

Required permissions: "forms:edit"

This creates a new form, or updates an existing one. The `collection` parameter must be one of `componentForms`, `testForms`, or `jobForms`.  The `test_id` parameter identifies the form.

The record should exist as follows:
```
{
  "formName": <string>,  // human readable name for this form
  "schema": <schema object> // the Formio.js schema
  "validity:" {             // optional
    "startDate": <ISO 8601 Date string>,
    "version": <integer>
  }
}
```

## API Calls related to Tests and Jobs

Tests and Jobs are forms filled out by people during workflow. The only difference is that a Test references a specific Component UUID, and a Job does not.

For Jobs, use /api/job
for tests, use /api/test

### GET /api/test/123456780abcdef12345678 (or /api/job/:id)

Required permissions: "tests:view"

The number here is the 24-character hex code representation of the ObjectID of a specific test.

Returns the test record.


### Post /api/test (or /api/job)

Required permissions: "tests:submit" or "jobs:submit" respectively

Submits new test data. Format must be as follows:
```
{
  formId: <string>,     // The ID of the form corresponding to this 
  formName: <string>,   // The name of the form, should match as above.
  formObjectId: <hex string>, // The ObjectID of the _id of the form object used to create this test data.
  componentUuid: "123456789-abcd-1234-1234-123456789abcd", // Component UUID of the tested component. Omit for a Job record.
  data: {...},    // form data
  metadata: {...} // optional
}
``` 


### Post /api/search
Searching is allowed with URLs formatted as follows:
``` 
  /api/search
  /api/search/<recordType>
  /api/search/<recordType>/<formId>
```
For example:
```
  /api/search/tests
  /api/search/components/SteelTube
```

The URL also accepts query parameters for limit and skip. Limit defaults to 100 entries from each record type. For example, this gives entries 40 through 60.
```
 /api/search/job/MyWorkflowForm?limit=20&skip=40
```


The posted search parameters must have an object with at least one element defined:
```
{
  "search": "text search keywords",  // uses mongo text search
  "insertionAfter": <Date>, //  Limit search to records inserted after timestamp
  "insertionBefore": <Date>, //  Limit search to records inserted before timestamp
  "data.thing": 123, // searches the 'thing' subfield of the data object for exact match to Value.
  "data.thing2": "value2"
  }
}
```

In general, this will honor any mongo search parameterization.  




