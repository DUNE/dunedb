- [Sietch API](#sietch-api)
  * [Results](#results)
  * [Validity](#validity)
  * [API calls about Components](#api-calls-about-components)
      - [GET /api/generateComponenentUuid](#get--api-generatecomponenentuuid)
      - [GET /api/component/123456789-abcd-1234-1234-123456789abc](#get--api-component-123456789-abcd-1234-1234-123456789abc)
      - [POST  /api/component/123456789-abcd-1234-1234-123456789abcd](#post---api-component-123456789-abcd-1234-1234-123456789abcd)
      - [POST  /api/component/123456789-abcd-1234-1234-123456789abcd/simple](#post---api-component-123456789-abcd-1234-1234-123456789abcd-simple)
  * [API calls related to Forms](#api-calls-related-to-forms)
      - [GET `/api/<collection>/<test_id>`](#get---api--collection---test-id--)
      - [POST `/api/<collection>/<test_id>`](#post---api--collection---test-id--)
  * [API Calls related to Tests and Jobs](#api-calls-related-to-tests-and-jobs)
      - [GET /api/test/123456780abcdef12345678 (or /api/job/:id)](#get--api-test-123456780abcdef12345678--or--api-job--id-)
      - [GET /api/test/123456780abcdef12345678/info](#get--api-test-123456780abcdef12345678-info)
      - [Post /api/test (or /api/job)](#post--api-test--or--api-job-)
  * [API Calls for auto-complete](#api-calls-for-auto-complete)
      - [/autocomplete/uuid?q="f123"](#-autocomplete-uuid-q--f123-)
      - [/autocomplete/testId?q="0abc"](#-autocomplete-testid-q--0abc-)
      - [Post /api/search](#post--api-search)
  * [API Calls for User Management](#api-calls-for-user-management)
      - [GET /api/roles](#get--api-roles)
      - [GET /api/users](#get--api-users)
      - [GET /api/user/user_id|12312313212312](#get--api-user-user-id-12312313212312)
      - [POST /api/user/user_id|12312313212312](#post--api-user-user-id-12312313212312)

<small><i><a href='http://ecotrust-canada.github.io/markdown-toc/'>Table of contents generated with markdown-toc</a></i></small>

# Sietch API

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


## Obtaining credentials
At the moment, machine-to-machine credentials are created on the commandline on the server host using this format:
```
$ lib/m2m.js --name <name of script> --email <email of responsible person> 
```
The config is the last few lines of text.  FIXME: automate this for admin users.

## Client libraries

In the github repository (https://nathanieltagg/sietch) there is a 'client' subdirectory, which contains code usable from within python or node standalone scripts. Either version requires you to have a credentials file containing the above authentication codes.

### Python
To use the python libraries, copy SietchConnect.py to your project, then:
```python
from SietchConnect import SietchConnect
import json
 
sietch = new SietchConnect("credentials.json") # or whatever file you have.
component = sietch.api("/component/123456789-abcd-1234-1234-123456789abc")
sietch.api("/component/123456789-abcd-1234-1234-123456789abc",{<new component version>})
```
The if a second argument is given to the `api` call it is treated as a 'POST' operation; if not, it's a 'GET' operation. Commands throw errors if unsuccessful, and will return python objects analagous to the JSON below, and the second argument posts

### Node.js
The SietchConnect.js file shows a similar format for running scripts from node.  (I know this isn't very popular, but I've found it more convenient than mentally switching languages to python.).  Most functions are promises/async and throw errors if unsuccessful.
```
const SietchConnect = require("./SietchConnect.js");

async function do_stuff() {
    var sietch = new SietchConnect("localhost_config.json");
    await sietch.connect();
    // Print out the JSON list of component Types.
    console.log(await sietch.get('/componentTypes'));
    // Connection statistics
    console.log(sietch.report())
}
do_stuff().then(()=>{console.log("Done!")});
```

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


#### GET `/api/<collection>/<formId>`

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


#### POST `/api/<collection>/<formId>`

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

#### GET /api/test/123456780abcdef12345678 (or /api/job/:id)

Required permissions: "tests:view"

The number here is the 24-character hex code representation of the ObjectID of a specific test.

Returns the test record.

#### GET /api/test/123456780abcdef12345678/info
Return basic insertion and ID info, plus form info, on that specific test.



#### Post /api/test (or /api/job)

Required permissions: "tests:submit" or "jobs:submit" respectively

Submits new test data. Format must be as follows:
```
{
  componentUuid: "123456789-abcd-1234-1234-123456789abcd", // Component UUID of the tested component. Omit for a Job record.
  formId: <string>,     // The ID of the form corresponding to this 

  formName: <string>,   // Optional. If not set, current (latest) form name is used.
  formObjectId: <hex string>, // Optional. The ObjectID of the _id of the form object used to create this test data. If not, the current (latest) version of the form is used

  data: {...},    // required: form data

  metadata: {...} // optional.  Can contain things like user script version.
}
``` 

## API Calls for auto-complete

#### /autocomplete/uuid?q="f123"
Find some matches for that particular starting sequence of a component UUID

#### /autocomplete/testId?q="0abc"
Find some matches for that particular starting sequence for a Test id.



#### Post /api/search
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



## API Calls for User Management

#### GET /api/roles

Requires `users:view` permission. (Admin only)
Lists all roles available

#### GET /api/users
Returns a list of all users. (Admin only)
Can use query parameters:
```
  /api/users?per_page=10&page=3&q='name:jane*'
```
Returns email, name, permissions of all registered users.

#### GET /api/user/user_id|12312313212312

Requires `users:view` permission. (Admin only)
OR can be accessed if you are logged in as the user being queried

Returns all info on that user.  Personal information includes IP address, name, email, picture URL, roles, permissions, authentication methods.  

#### POST /api/user/user_id|12312313212312

Requires `users:edit` permission. (Admin only)
OR some function accessable if you are logged in as that user.

Can set fields:
`'user_metadata','email','picture','family_name','given_name','name','nickname','phone_number'`

Admin only can set roles with the `roleIds` parameter, using the auth0 role id strings.

Admin only can set `user_metata` object fields.  Currently, the only field used is `start_page` to determine the landing page for that user.

This is to be used mostly by managers to either promote users' permissions, to change email addresses (so that users can use the 'lost password' links by auth0), or set the starint page.


## Courses

A Course is a description of a series of steps that must be undertaken to complete a construction or QA task. This typically includes a component, and some tests or jobs that should be done on that component.

These are briefly described below:

#### GET /api/courses
Get a list of courseIds

#### GET /api/<courseId>
Get the course object that describes the course of courseId

#### POST /api/<courseId>
Set a new version of the course object of that courseId

#### GET /api/<courseId>/<uuid>
This evaluates the object against the course requirements, and returns the Course object, with extra fields attached:
```
{
  recordType: "courseEvaluation",
  courseId: <string>,
  insertion: <insertion>,
  validity: <validity>,
  icon: [...],
  tags: [...],
  path: [<step>,<step>,<step>],
  evaluation: [<evaluatedStep>, <evaluatedStep>, <evaluatedStep>]
  score: <number>,  // How many steps got completed at least once
  score_denominator: <number>,  // number of steps to be scored
  most_recent: <step>,  // the most recent step to be completed
  next_step: <step>,  // the next step that should be logically completed in the course order
}
```

An `evaluatedStep` is just like a step, except it includes a `result` property:
```
  result: [ {obj}, {obj},..]
```
where the objects represent completed steps for that component.  e.g. a Test result includes testId and insertion information.

## Docs and Wiki

The docs are available for users at `/doc` and `/doc/topicname`.
Note that this is different from the the static documentation, which is at `/docs/filename.md`


#### GET /api/doc

Retrieves a list of docIds for all valid documents.

#### GET /api/doc/topicName

Retrieves the record for the topicName topic, retrieving a JSON document including the Markdown code.  A rendered version of the document is at `/doc/topicName`

#### POST /api/doc/topicName

Saves a new version of the topicName.  Format should match that in the schema document, namely:
```
{ 
  docId: "topicname",
  data: <markdown string>
}
```
Version data will be auto-incremented on save.





