
// Declare a variable to hold the completed type form that will eventually be submitted to the database
let componentForm;

// If we are editing an existing component, we do not want to increment the 'data.typeRecordNumber' field
// In this case, the 'componentTypesAndCounts' object passed from 'component_edit.pug' will be empty (but populated if creating a new component)
let newComponent = false;

if (Object.keys(componentTypesAndCounts).length > 0) newComponent = true;

// Arrays called 'subComponent_fullUuids' and 'subComponent_shortUuids' are also passed from 'component_edit.pug'
// If we are submitting a new batch-type component, these arrays will contain full and short sub-component UUIDs (and therefore have a size > 0)
// If we are instead editing an existing batch-type component or dealing with a non-batch-type component, the arrays will be empty
let newBatchComponent = false;

if (subComponent_fullUuids.length > 0) newBatchComponent = true;


// Run a specific function when the page is loaded
window.addEventListener('load', onPageLoad);


/// Function to run when the page is loaded
async function onPageLoad() {
  // Set up a new type form based on the schema of the component type form
  let schema = componentTypeForm.schema;

  // Add a 'Submit' button to the type form (this is temporary, only in the scope of this script)
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
  // If we are creating a new component, this won't make any changes
  // If we are editing an existing component, this is where the existing information is filled in
  typeForm.submission = Object.assign(typeForm.submission, component);

  // When the populated type form is submitted (via clicking on the 'Submit' button), run the appropriate event handler callback function
  // This is a Formio event handler, NOT a jQuery one (the code syntax '.on' is identical, but the input argument and callback structure are different)
  typeForm.on('submit', function (submission) {
    // At this point, the 'submission' object contains ONLY the information that has been entered into the type form by the user (the 'data' field)
    // Now add all other required information from the passed variables to the 'submission' object
    submission.componentUuid = component.componentUuid;
    submission.formId = componentTypeForm.formId;
    submission.formName = componentTypeForm.formName;

    // For an entirely new component ...
    if (newComponent) {
      // Find the number of already-existing components of the same type as the component
      let numberOfExistingComponents = 0;

      if (componentTypesAndCounts[componentTypeForm.formId].count) numberOfExistingComponents = componentTypesAndCounts[componentTypeForm.formId].count;

      // If the component is a 'Geometry Board' type, we must offset the number of already-existing components
      // This is to account for an unknown number of boards that might have previously been physically created but not added to the database
      if (componentTypeForm.formId === 'GeometryBoard') numberOfExistingComponents += 5000;

      // Then add a component type record number to the 'data' field of the submission
      submission.data.typeRecordNumber = numberOfExistingComponents + 1;
    }

    // If we are submitting a new batch-type component ...
    if (newBatchComponent) {
      // Retrieve the desired number of sub-components from the submission object (since it will have already been entered into the component type form by the user)
      const numberOfSubComponents = submission.data.subComponent_count;

      // Get sub-arrays of the full and short sub-component UUIDs by taking slices of the corresponding full arrays, of length equal to the desired number of sub-components
      const slice_fullUuids = subComponent_fullUuids.slice(0, numberOfSubComponents);
      const slice_shortUuids = subComponent_shortUuids.slice(0, numberOfSubComponents);

      // Set up an array to hold the sub-component type record numbers (this will be populated in the sub-component loop below)
      let subComponent_typeRecordNumbers = [];

      // Save the full and short sub-component UUID sub-arrays into the submission object, under the 'data' field that contains the rest of the form-level information
      submission.data.subComponent_fullUuids = slice_fullUuids;
      submission.data.subComponent_shortUuids = slice_shortUuids;

      // Find the number of already-existing components of the same type as the sub-components
      let numberOfExistingSubComponents = 0;

      if (componentTypesAndCounts[submission.data.subComponent_formId].count) numberOfExistingSubComponents = componentTypesAndCounts[submission.data.subComponent_formId].count;

      // If the sub-component is a 'Geometry Board' type, we must offset the number of already-existing components
      // This is to account for an unknown number of boards that might have previously been physically created but not added to the database
      if (submission.data.subComponent_formId === 'GeometryBoard') numberOfExistingSubComponents += 5000;

      // For each sub-component ...
      for (let s = 0; s < numberOfSubComponents; s++) {
        // Set up a new empty 'sub-submission' object, using the existing 'submission' object as a template
        let sub_submission = Object.create(submission);

        // Add all required sub-component information
        sub_submission.componentUuid = slice_fullUuids[s];
        sub_submission.formId = submission.data.subComponent_formId;
        sub_submission.data = Object.create(submission.data);

        // Add information to the sub-component's 'data' field indicating the fields and values that are inherited from the batch component
        sub_submission.data.name = `Created from ${submission.data.name}`;
        sub_submission.data.partNumber = submission.data.subComponent_partNumber;
        sub_submission.data.partString = submission.data.subComponent_partString;
        sub_submission.data.fromBatch = submission.componentUuid;

        // Add a component type record number to the sub-component's 'data' field, and save it into the previously declared array
        const subComponent_typeRecordNumber = numberOfExistingSubComponents + s + 1;

        sub_submission.data.typeRecordNumber = subComponent_typeRecordNumber;
        subComponent_typeRecordNumbers.push(subComponent_typeRecordNumber);

        // Since there is nothing more to be added to the sub-component submission data this point, immediately submit it to the DB
        // Do not redirect the user back to the sub-component's information page, since we still need to deal with any other sub-components and the main batch-type component
        SubmitData(sub_submission, false);
      }

      // Save the sub-component type record number array into the submission object, under the 'data' field that contains the rest of the form-level information
      submission.data.subComponent_typeRecordNumbers = subComponent_typeRecordNumbers;
    }

    // Once all additions and changes to the 'submission' object have been completed, submit it to the database
    SubmitData(submission);
  });
}


/// Function to submit the completed 'submission' object to the database
function SubmitData(submission, redirectToInfo = true) {
  // Submit the 'submission' object via a jQuery 'ajax' call, with the success and failure functions as defined below
  $.ajax({
    contentType: 'application/json',
    method: 'post',
    url: '/json/component/',
    data: JSON.stringify(submission),
    dataType: 'json',
    success: postSuccess,
  }).fail(postFail);


  /// Function to run for a successful submission
  function postSuccess(result) {
    // If the submission result contains an error (even with a successful submission), display it along with the appropriate Formio alert type
    if (result.error) {
      typeForm.setAlert('warning', result.error);
      typeForm.emit('error', result.error);
    }

    // Display a 'submission complete' message
    typeForm.emit('submitDone');

    // If desired, once the submission is complete redirect the user back to the component's information page ('result' is the component's component UUID)
    if (redirectToInfo) window.location.href = `/component/${result}`;
  }


  /// Function to run for a failed submission
  function postFail(result, statusCode, statusMsg) {
    // If the submission result contains a response message, display it along with the appropriate Formio alert type
    // Otherwise, display any status message and error code instead
    if (result.responseText) {
      typeForm.setAlert('danger', result.responseText);
    } else {
      typeForm.setAlert('danger', `${statusMsg} (${statusCode})`);
    }

    // Display a 'submission error' message
    typeForm.emit('submitError');
  }
};
