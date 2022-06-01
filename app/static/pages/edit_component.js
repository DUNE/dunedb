
// Declare script-level variables
var componentForm = null;         // A variable to hold the completed and populated component type form that will eventually be submitted to the DB
var newBatchComponent = false;    // A variable to act as a flag for if we are submitting a new batch-type component or not

// Arrays called  'subComponent_fullUuids' and 'subComponent_shortUuids' are passed from 'edit_component.pug'
// If we are submitting a new batch-type component, these arrays will contain full and short sub-component UUIDs (and therefore have a size > 0)
// If we are instead editing an existing batch-type component or dealing with a non-batch-type component, the arrays will be empty
if (subComponent_fullUuids.length > 0) {
  newBatchComponent = true;
}


// Run a specific function when the page is loaded
window.addEventListener('load', onPageLoad);


/// Function to run when the page is loaded
async function onPageLoad() {
  
  // Make sure that a component type form ID has been provided (using the 'form' variable passed from 'edit_component.pug')
  if(!form.formId) {
    console.error(onPageLoad, "No component type form ID has been provided!");
  }
  
  // Retrieve the component type form corresponding to the provided type form ID, and then ...
  $.get('/json/componentForms/' + form.formId).then(
    async function(form) {
      
      // Set up the component type form's schema
      var schema = form.schema;
      
      // Add a 'Submit' button to the schema (this is temporary, i.e. only in the scope of this script)
      schema.components.push({
        type: "button",
        theme: "btn btn-success",
        label: "Submit Component",
        key: "submit",
        disableOnInvalid: true,
        input: true,
        tableView: false
      });
      
      // Make sure that the designated space on the page where the component type form will be displayed is empty
      $('#builtform').empty();
      
      // Create the component type form using the previously defined schema, and display it in the designated space
      componentForm = await Formio.createForm(document.getElementById('builtform'), schema);
      
      // Populate the (initally empty) form with any pre-existing component information (using the 'component' variable passed from 'edit_component.pug')
      // If a new component is being created, the 'component' variable will not contain any form-level information (i.e. no 'data' field), so it will remain empty
      componentForm.submission = {data: component.data};
      
      // We want to submit the completed type to our own API rather than the 'form.io' server, so set the 'nosubmit' flag on the form to 'true'
      componentForm.nosubmit = true;
      
      // When the populated form is submitted (via clicking on the 'Submit' button added to the schema above), run the appropriate event handler callback function
      // Note that this is a Formio event handler, NOT a jQuery one (the code syntax '.on' is identical, but the input argument and callback structure are different)
      componentForm.on('submit', function(submission) {
        
        // At this point, the 'submission' object contains ONLY the information that has been entered into the component type form by the user
        // Add all required information to the submission object from the 'component' and 'form' variables (passed from 'edit_component.pug')
        submission.componentUuid = component.componentUuid; 
        submission.formName = form.formName;
        submission.formId = form.formId;
        
        // If we are submitting a new batch-type component ...
        if (newBatchComponent) {
          
          // Retrieve the desired number of sub-components from the submission object (since it will have already been entered into the component type form by the user)
          var numberOfSubComponents = submission.data.subComponent_count;
          
          // Then get sub-arrays of the full and short sub-component UUIDs by taking slices of the corresponding full arrays, of length equal to the desired number of sub-components
          var slice_fullUuids = subComponent_fullUuids.slice(0, numberOfSubComponents);
          var slice_shortUuids = subComponent_shortUuids.slice(0, numberOfSubComponents);
          
          // Save the full and short sub-component UUID sub-arrays into the submission object, under the 'data' field that contains the rest of the form-level information
          submission.data.subComponent_fullUuids = slice_fullUuids;
          submission.data.subComponent_shortUuids = slice_shortUuids;
          
          // For each sub-component ...
          for (let s = 0; s < numberOfSubComponents; s++) {
            
            // Set up a new empty 'sub-submission' object, using the existing 'submission' object as a template
            var sub_submission = Object.create(submission);
            
            // Add all required sub-component information
            sub_submission.componentUuid = slice_fullUuids[s];
            sub_submission.formId = submission.data.subComponent_formId;
            sub_submission.data = Object.create(submission.data);
            
            // Add information to the sub-component's 'data' field indicating a default name and which batch-type component it is related to
            var subComponent_name = "Created from " + sub_submission.data.name;
            
            sub_submission.data.name = subComponent_name;
            sub_submission.data.fromBatch = submission.componentUuid;
            
            // Since there is nothing more to be added to the sub-component submission data this point, immediately submit it to the DB
            // Do not redirect the user back to the sub-component's information page, since we still need to deal with any other sub-components and the main batch-type component
            SubmitData(sub_submission, false);
          }
        }
        
        // Once all additions and changes to the submission data have been completed, submit it to the DB
        SubmitData(submission, true);
      });
    });
}


/// Function for submitting the completed submission data to the DB
function SubmitData(submission, redirectToInfo) {
  
  // Submit the 'submission' object to the DB via a jQuery 'ajax' call, with the success and failure functions as defined below
  $.ajax({
    contentType: "application/json",
    method: "post",
    url: '/json/component/' + submission.componentUuid,
    data: JSON.stringify(submission),
    dataType: "json",
    success: postSuccess
  }).fail(postFail);
  
  
  /// Function to run for a successful submission
  function postSuccess(result) {
    
    // If the submission result contains an error (even with a successful submission), display it along with the appropriate Formio alert type
    // Otherwise, set the Formio alert type to 'success'
    if(result.error) {
      componentForm.setAlert('warning', result.error);
      componentForm.emit('error', result.error);
    } else {
      componentForm.setAlert('success');
    }
    
    // If the submission result contains a 'data' field, make sure that the component type form's submission information is the same as the contents of this field
    // It is technically possible that there is no 'data' field if the submitted component has no form-level information ... in which case the component type form will remain empty as well
    if(result.data) {
      componentForm.submission = {data: result.data};
    }
    
    // Display a 'submission complete' message, along with the submission result
    componentForm.emit('submitDone', result.submission);
    
    // If desired, once the submission is complete (and if the result contains a component UUID [which it always should if successful]), redirect the user back to the component's information page
    if((redirectToInfo) && (result.componentUuid)) {
        window.location.href = '/component/' + result.componentUuid;
    }
  }
  
  
  /// Function to run for a failed submission
  function postFail(result, statusCode, statusMsg) {
    
    // If the submission result contains a response message, display it along with the appropriate Formio alert type
    // Otherwise, display any status message and error code instead
    if(result.responseText) {
      componentForm.setAlert('danger', result.responseText);
    } else {
      componentForm.setAlert('danger', statusMsg + " (" + statusCode + ")");
    }
    
    // Display a 'submission error' message
    componentForm.emit('submitError');
  }
};
