// Declare a variable to hold the completed type form that will eventually be submitted to the database
let typeForm;

// If we are creating a new component, we need to fill in the 'data.typeRecordNumber' value using the 'componentTypesAndCounts' object passed through the route to this page
// Therefore, that object will NOT be empty for a new component, but will be if editing an existing component (when we do not want to increment the 'data.typeRecordNumber' value)
let newComponent = false;

if (Object.keys(componentTypesAndCounts).length > 0) newComponent = true;

// Arrays called 'subComponent_fullUuids' and 'subComponent_shortUuids' are also always passed through the route to this page
// If we are submitting a new batch-type component, these arrays will contain full and short sub-component UUIDs (and therefore have a size > 0)
// If we are instead just editing an existing batch-type component, or creating or editing a non-batch-type component, the arrays will be empty
let newBatchComponent = false;

if (subComponent_fullUuids.length > 0) newBatchComponent = true;


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
    // At this point, the 'submission' object contains ONLY the information that has been entered into the type form (i.e. the 'data' field)
    // Add all other required information, inheriting from the variables that were passed through the route to this page
    submission.componentUuid = component.componentUuid;
    submission.formId = componentTypeForm.formId;
    submission.formName = componentTypeForm.formName;

    // If the component originates from a workflow (and therefore a non-empty workflow ID has been provided), save the workflow ID into the 'submission' object
    if (!(workflowId === '')) submission.workflowId = workflowId;

    // When creating a new component ...
    if (newComponent) {
      // Get the count of existing components of the same type as the new one from the 'componentTypesAndCounts' object
      let numberOfExistingComponents = 0;

      if (componentTypesAndCounts[componentTypeForm.formId].count) numberOfExistingComponents = componentTypesAndCounts[componentTypeForm.formId].count;

      // If the component is a 'Geometry Board' type, offset the count, to account for an unknown number of boards that might have been manufactured before the database was up and running
      // Additionally, we can set up and fill a 'Reception' field in the submission (which is relevant only for new 'Geometry Board' type components)
      if (componentTypeForm.formId === 'GeometryBoard') {
        numberOfExistingComponents += 5000;

        submission.reception = {};
        submission.reception.location = 'lancaster';
        submission.reception.date = (new Date()).toString().slice(0, 10);
      }

      // Add a component type record number to the 'data' field - this is equivalent to the 'UKID' for geometry boards, and just semi-useful information for other component types
      const typeRecordNumber = numberOfExistingComponents + 1;
      submission.data.typeRecordNumber = typeRecordNumber;

      // Components of certain types must have a specifically formatted name, consisting of some fixed prefix and suffix, plus the type record number padded to 5 digits
      if (componentTypeForm.formId === 'GroundingMeshPanel') {
        submission.data.name = `D00300200004-${String(typeRecordNumber).padStart(5, '0')}-UK106-01-00-00`;
      } else if (componentTypeForm.formId === 'CRBoard') {
        submission.data.name = `D00300400001-${String(typeRecordNumber).padStart(5, '0')}-US200-01-00-00`;
      } else if (componentTypeForm.formId === 'GBiasBoard') {
        submission.data.name = `D00300400002-${String(typeRecordNumber).padStart(5, '0')}-US200-01-00-00`;
      } else if (componentTypeForm.formId === 'CEAdapterBoard') {
        submission.data.name = `D00300400003-${String(typeRecordNumber).padStart(5, '0')}-US200-01-00-00`;
      } else if (componentTypeForm.formId === 'SHVBoard') {
        submission.data.name = `D00300500001-${String(typeRecordNumber).padStart(5, '0')}-US200-01-00-00`;
      } else if (componentTypeForm.formId === 'CableHarness') {
        submission.data.name = `D00300500002-${String(typeRecordNumber).padStart(5, '0')}-US200-01-00-00`;
      }
    }

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
      let numberOfExistingSubComponents = 0;

      if (componentTypesAndCounts[submission.data.subComponent_formId].count) numberOfExistingSubComponents = componentTypesAndCounts[submission.data.subComponent_formId].count;

      // If the component is a 'Geometry Board' type, offset the count, to account for an unknown number of boards that might have been manufactured before the database was up and running
      if (submission.data.subComponent_formId === 'GeometryBoard') numberOfExistingSubComponents += 5000;

      // Set up an array to hold the sub-component type record numbers and submission objects (these will be populated in the sub-component loop below)
      let subComponent_typeRecordNumbers = [];
      let subComponent_objects = [];

      // For each sub-component ...
      for (let s = 0; s < numberOfSubComponents; s++) {
        // Set up a new empty 'sub-submission' object, using the existing 'submission' object as a template, and immediately add all required sub-component information
        // For 'Geometry Board' type sub-components, this will include a 'Reception' field
        let sub_submission = Object.create(submission);

        sub_submission.componentUuid = slice_fullUuids[s];
        sub_submission.formId = submission.data.subComponent_formId;

        if (submission.data.subComponent_formId === 'GeometryBoard') {
          sub_submission.reception = {};
          sub_submission.reception.location = 'lancaster';
          sub_submission.reception.date = (new Date()).toISOString().slice(0, 10);
        }

        sub_submission.data = Object.create(submission.data);

        // Add information to the sub-component's 'data' field indicating the fields and values that are inherited from the batch component
        sub_submission.data.partNumber = submission.data.subComponent_partNumber;
        sub_submission.data.partString = submission.data.subComponent_partString;
        sub_submission.data.fromBatch = submission.componentUuid;
        sub_submission.data.submit = true;

        // Add a component type record number to the sub-component's 'data' field - this is equivalent to the 'UKID' for geometry boards, and just semi-useful information for other component types
        // Additionally save this number into the previously declared array
        sub_submission.data.typeRecordNumber = numberOfExistingSubComponents + s + 1;
        subComponent_typeRecordNumbers.push(numberOfExistingSubComponents + s + 1);

        // Add a name to the sub-component 'data' field ... the format of this name will be different depending on the sub-component's component type
        if (submission.data.subComponent_formId === 'CRBoard') {
          sub_submission.data.name = `D00300400001-${String(sub_submission.data.typeRecordNumber).padStart(5, '0')}-US200-01-00-00`;
        } else if (submission.data.subComponent_formId === 'GBiasBoard') {
          sub_submission.data.name = `D00300400002-${String(sub_submission.data.typeRecordNumber).padStart(5, '0')}-US200-01-00-00`;
        } else if (submission.data.subComponent_formId === 'CEAdapterBoard') {
          sub_submission.data.name = `D00300400003-${String(sub_submission.data.typeRecordNumber).padStart(5, '0')}-US200-01-00-00`;
        } else if (submission.data.subComponent_formId === 'SHVBoard') {
          sub_submission.data.name = `D00300500001-${String(sub_submission.data.typeRecordNumber).padStart(5, '0')}-US200-01-00-00`;
        } else if (submission.data.subComponent_formId === 'CableHarness') {
          sub_submission.data.name = `D00300500002-${String(sub_submission.data.typeRecordNumber).padStart(5, '0')}-US200-01-00-00`;
        } else {
          sub_submission.data.name = `Created from ${submission.data.name}`;
        }

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

    // Redirect the user to the appropriate post-submission page ('result' is the component's component UUID)
    // If the component is a 'Returned Geometry Board Batch' type, we must first update the board information (and further redirection will be handled from there)
    // If not, then we can simply proceed with standard post-submission redirection:
    //   - if the component originates from a workflow, go to the page for updating the workflow path step results
    //   - if this is a standalone component, go to the page for viewing the component record
    if (submission.formId === 'ReturnedGeometryBoardBatch') {
      const batchUUID = submission.componentUuid;
      const receptionLocation = 'lancaster';
      const receptionDate = (new Date()).toISOString().slice(0, 10);

      window.location.href = `/component/${batchUUID}/updateBoardLocations/${receptionLocation}/${receptionDate}`;
    } else {
      if (!(workflowId === '')) {
        window.location.href = `/workflow/${workflowId}/component/${result}`;
      } else {
        window.location.href = `/component/${result}`;
      }
    }
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
