// Declare a variable to hold the completed type form that will eventually be submitted to the database
let typeForm;

// Arrays called 'subComponent_fullUuids' and 'subComponent_shortUuids' are always passed through the route to this page
// If we are submitting a new batch-type component, these arrays will contain full and short sub-component UUIDs (and therefore have a size > 0)
// If we are instead just editing an existing batch-type component, or creating or editing a non-batch-type component, the arrays will be empty
const newBatchComponent = (subComponent_fullUuids.length > 0) ? true : false;

// Run a specific function when the page is loaded
window.addEventListener('load', onPageLoad);


// Function to run when the page is loaded
async function onPageLoad() {
  // Set up a new type form based on the schema of the component type form, and add a 'Submit' button (this is only in the scope of this script)
  let schema = componentTypeForm.schema;

  schema.components.push({
    type: 'button',
    theme: 'btn btn-success',
    label: 'Submit Component Record',
    key: 'submit',
    disableOnInvalid: true,
    input: true,
    tableView: false,
  });

  // Render the type form in the page element called 'typeform'
  typeForm = await Formio.createForm(document.getElementById('typeform'), schema, {
    readOnly: false,
    buttonSettings: {
      showCancel: false,
      showSubmit: false,
    }
  });

  // Populate the type form with the contents of the component itself
  //   - if we are creating a new component, this won't make any changes
  //   - if we are editing an existing component, this is where the existing information is filled in
  typeForm.submission = Object.assign(typeForm.submission, component);

  // When the 'Submit' button is pressed, run the appropriate event handler callback function
  // This is a Formio event handler, NOT a jQuery one (the code syntax '.on' is identical, but the input argument and callback structure are different)
  typeForm.on('submit', function (submission) {
    // At this point, the 'submission' object contains ONLY the information that has been entered into the type form (i.e. the 'data' object)
    // Add the other required information, inheriting from the variables that were passed through the route to this page
    submission.componentUuid = component.componentUuid;
    submission.formId = componentTypeForm.formId;

    // If the component originates from a workflow (and therefore a non-empty workflow ID has been provided), save the workflow ID into the 'submission' object
    if (!(workflowId === '')) submission.workflowId = workflowId;

    // When creating a new batch-type component ...
    if (newBatchComponent) {
      // Retrieve the desired number of sub-components from the submission object (since it will have already been entered into the type form by the user)
      const numberOfSubComponents = submission.data.subComponent_count;

      // Get sub-arrays of the full and short sub-component UUIDs by taking slices of the corresponding full arrays, of length equal to the desired number of sub-components
      // Save the sub-arrays into the submission object, under the 'data' field
      const slice_fullUuids = subComponent_fullUuids.slice(0, numberOfSubComponents);
      const slice_shortUuids = subComponent_shortUuids.slice(0, numberOfSubComponents);

      submission.data.subComponent_fullUuids = slice_fullUuids;
      submission.data.subComponent_shortUuids = slice_shortUuids;

      // Get the count of existing components of the same type as the sub-components from the 'componentTypesAndCounts' object
      // If the component is a 'Geometry Board' type, offset the count, to account for an unknown number of boards that might have been manufactured before the database was up and running
      let numberOfExistingSubComponents = 0;

      if (componentTypesAndCounts[submission.data.subComponent_formId].count) numberOfExistingSubComponents = componentTypesAndCounts[submission.data.subComponent_formId].count;
      if (submission.data.subComponent_formId === 'GeometryBoard') numberOfExistingSubComponents += 5000;

      // Set up an array to hold the sub-component type record numbers and submission objects (these will be populated in the sub-component loop below)
      let subComponent_typeRecordNumbers = [];
      let subComponent_objects = [];

      // For each sub-component ...
      for (let s = 0; s < numberOfSubComponents; s++) {
        // Set up a new empty 'sub-submission' object, using the existing 'submission' object as a template, and immediately add all required sub-component information
        let sub_submission = Object.create(submission);

        sub_submission.componentUuid = slice_fullUuids[s];
        sub_submission.formId = submission.data.subComponent_formId;
        sub_submission.data = Object.create(submission.data);

        // Add information to the sub-component's 'data' field indicating the fields and values that are inherited from the batch component
        sub_submission.data.partNumber = submission.data.subComponent_partNumber;
        sub_submission.data.partString = submission.data.subComponent_partString;
        sub_submission.data.fromBatch = submission.componentUuid;
        sub_submission.data.submit = true;

        // Add the sub-component count to the 'data' field, under a new 'Type Record Number' field, and also save this number into the previously declared array
        sub_submission.data.typeRecordNumber = numberOfExistingSubComponents + s + 1;
        subComponent_typeRecordNumbers.push(numberOfExistingSubComponents + s + 1);

        // Since there is nothing more to be added to the sub-component submission object, add it to the array of sub-component submission objects
        subComponent_objects.push(sub_submission);
      }

      // Once all sub-component submission objects have been created, populated and saved, submit the entire array to the database in a single API call ...
      // ... submission of the individual sub-components is handled on the server side to reduce load on the client side     
      // This function does NOT redirect the user anywhere after submission, since we still need to deal with the main batch-type component
      SubmitBatchData(subComponent_objects);

      // Save the sub-component type record number array into the submission object, under the 'data' field that contains the rest of the form-level information
      submission.data.subComponent_typeRecordNumbers = subComponent_typeRecordNumbers;
    }

    // Once all additions and changes to the 'submission' object have been completed, submit it to the database, and then redirect the user as appropriate
    SubmitData(submission);
  });
}


// Function to submit the individual batch sub-component records to the database
function SubmitBatchData(submission) {
  $.ajax({
    contentType: 'application/json',
    method: 'post',
    url: '/json/componentBatch',
    data: JSON.stringify(submission),
    dataType: 'json',
    success: postSuccess,
  }).fail(postFail);


  // Function to run for a successful submission
  function postSuccess(result) {
    // If the submission result contains an error (even with a successful submission), display it along with the appropriate Formio alert type
    if (result.error) {
      typeForm.setAlert('warning', result.error);
      typeForm.emit('error', result.error);
    }

    // Display a message to indicate successful submission
    typeForm.emit('submitDone');
  }


  // Function to run for a failed submission
  function postFail(result, statusCode, statusMsg) {
    // If the submission result contains a response message, display it along with the appropriate Formio alert type
    // Otherwise, display any status message and error code instead
    if (result.responseText) {
      typeForm.setAlert('danger', result.responseText);
    } else {
      typeForm.setAlert('danger', `${statusMsg} (${statusCode})`);
    }

    // Display a message to indicate that there was an error in submission
    typeForm.emit('submitError');
  }
};


// Function to submit either a non-batch component or the batch's overall component record to the database
function SubmitData(submission) {
  $.ajax({
    contentType: 'application/json',
    method: 'post',
    url: '/json/component',
    data: JSON.stringify(submission),
    dataType: 'json',
    success: postSuccess,
  }).fail(postFail);


  // Function to run for a successful submission
  function postSuccess(result) {
    // If the submission result contains an error (even with a successful submission), display it along with the appropriate Formio alert type
    if (result.error) {
      typeForm.setAlert('warning', result.error);
      typeForm.emit('error', result.error);
    }

    // Display a message to indicate successful submission
    typeForm.emit('submitDone');

    // Redirect the user to the appropriate post-submission page ('result' is the component's UUID)
    // If the component is a 'Returned Geometry Board Batch' type, we must first update the board information (and further redirection will be handled from there)
    // Similarly, if the component is an 'Assembled APA' type, we must first update the APA frame information
    // Alternatively, if the component is one of the 'XXX Shipment' types, we must first update the individual components' information (in a different way)
    // If neither of these is the case, then we can simply proceed with standard post-submission redirection:
    //   - if the component originates from a workflow, go to the page for updating the workflow path step results
    //   - if this is a standalone component, go to the page for viewing the component record
    let url = '';

    if (submission.formId === 'ReturnedGeometryBoardBatch') {
      url = `/component/${submission.componentUuid}/updateLocations/${'lancaster'}/${(new Date()).toISOString().slice(0, 10)}`;
    } else if (submission.formId === 'AssembledAPA') {
      url = `/component/${submission.componentUuid}/updateLocations/${'installed_on_APA'}/${(new Date()).toISOString().slice(0, 10)}`;

      if (!(workflowId === '')) url += `?workflowId=${workflowId}&stepIndex=0`;
    } else if ((submission.formId === 'APAShipment') || (submission.formId === 'BoardShipment') || (submission.formId === 'DWAComponentShipment') || (submission.formId === 'GroundingMeshShipment') || (submission.formId === 'PopulatedBoardShipment')) {
      url = `/component/${submission.componentUuid}/updateLocations/${'in_transit'}/${(new Date()).toISOString().slice(0, 10)}`;
    } else {
      if (!(workflowId === '')) {
        url = `/workflow/${workflowId}/0/component/${result}`;
      } else {
        url = `/component/${result}`;
      }
    }

    window.location.href = url;
  }


  // Function to run for a failed submission
  function postFail(result, statusCode, statusMsg) {
    // If the submission result contains a response message, display it along with the appropriate Formio alert type
    // Otherwise, display any status message and error code instead
    if (result.responseText) {
      typeForm.setAlert('danger', result.responseText);
    } else {
      typeForm.setAlert('danger', `${statusMsg} (${statusCode})`);
    }

    // Display a message to indicate that there was an error in submission
    typeForm.emit('submitError');
  }
};
