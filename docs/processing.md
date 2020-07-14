## Post-processing

A process is a way that Job contents can be split up into multiple Components and Tests.

To compose a process in the Form Editor, click on the '+ Post Process' bar immediately below the builder area.

Click on 'Add Another' to create a new process, or on the pencil icon to change an existing one.

There are two fields. The Process ID field should be a simple name describing what the process does. This will appear both on buttons, and in the database.

The second field is for javascript.  This should be code that can take apart the data in this form and use it.

This code must be written in plain JavaScript and can access only 3 external symbols:

`data` is a plain object, containing one filled-out form's data.

`function createComponent(data)` is a function that creates a new Component, using the data object.  Returned is a nearly-complete Component record, which looks like the schema (i.e. it has a componentUuid assigned).

`function createTest(componentUuid,formId,data)` is a function that creates a new Test object, for the given component, formId and the data.  It returns the complete test record. 

The code does not need to return anything.  The `console.log()` function is provided for creating log output an debugging. Logs will be saved in the resulting processing record.

FIXME: create a node-based standalone testbed to help development.

###Example:
Given form data that looks like this:
```
data: {
	tubeList: [
		{tubeNumber: '1', passed:true},
		{tubeNumber: '2', passed:false}
	]
}
```

We want to create two tubes, each of which has a simple test. 
Our algorithm can be this text:
```
for(var tube of data.tubeList){
	console.log("working on tube",tube);
	var tubeComponent = createComponent(
		{
			type: 'TUBE',  // must have a type
			tubeNumber:tube.tubeNumber,  // other data.
		);
	createTest( tubeComponent.componentUuid, 'tubeTest', {
			passed: tube.passed
		});
}
```

This will result in these objects in the database:
```
component: { componentUuid: aaaa, data:{type:'TUBE', tubeNumber:1}}
component: { componentUuid: bbbb, data:{type:'TUBE', tubeNumber:2}}
test: { componentUuid: aaaa, formId: 'tubeTest', data:{passed: true} }
test: { componentUuid: bbbb, formId: 'tubeTest', data:{passed: false} } 
```

### Constraints
For security reasons, only javascript builtin functions are allowed. Timeout functions, `async` functions, and `eval` should not work. 
Scripts that take longer than 500 ms to process will be aborted.

