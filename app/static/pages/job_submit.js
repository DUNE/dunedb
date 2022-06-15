// Set up a variable to hold the job type form that will actually be submitted
// This will (eventually) be a modified version of the 'form' defined above
var jobForm = null;

// Submit the job to the DB
function SubmitData(submission)
{
  try
  {
    // Include relevant information about the job type form (these MUST be in the submission information)
    submission.formId = form.formId;
    submission.formName = form.formName;
    submission.formObjectId = form._id;
    
    // If the submission is successful ...
    function postSuccess(retval)
    {
      // Just in case, output any error messages that might have occurred even with a successful submission
      if(retval.error)
      {
        jobForm.setAlert("warning", retval.error);
        jobForm.emit('submitError');
      }
      
      jobForm.emit('submitDone');
        
      // Go to the page for viewing information about the submitted job, and do not leave the submission page in the browser history
      window.location.replace('/job/' + retval);
    }
    
    // If the submission fails ...
    function postFail(res, statusCode, statusMsg)
    {
      // Set up and relay error messages
      if(res.responseText)
      {
        jobForm.setAlert("danger", res.responseText);
      }
      else
      {
        jobForm.setAlert("danger", statusMsg + " (" + statusCode + ")");
      }
      
      jobForm.emit('submitError');
    }; 

    // Perform the submission to the DB, using the success and failure functions defined above
    $.ajax({contentType: "application/json",
            method: "post",
            url: '/json/job',
            data: JSON.stringify(submission),
            dataType: "json",
            success: postSuccess})
     .fail(postFail);
  }
  catch(e)
  {
    // TOFIX: not sure what to put here (used to be console and debugger, but we're no longer using them)
  }
};

// On first accessing this page ...
window.addEventListener('load', loadingFunction);

async function loadingFunction()
{
  // Temporarily add an additional submission button to the job type form
  var append_to = form.schema;
  
  if(form.schema.display === 'wizard')
  {
    append_to = form.schema.components[form.schema.components.length - 1];
  }

  append_to.components.push({type: "button",
                             theme: "btn btn-success",
                             label: "Submit Job",
                             key: "submit",
                             disableOnInvalid: true,
                             input: true,
                             tableView: false});
  
  // Get the revised job type form
  jobForm = await Formio.createForm(document.getElementById('builtform'), form.schema, {readOnly: false,
                                                                                        buttonSettings: {showCancel: false,
                                                                                                         showSubmit: false}});
  
  // Populate the form with the contents of the job itself
  // If this page is being used to submit a new job, this won't make any changes
  // If this page is being used to edit an existing job, this is where the existing information is filled in
  jobForm.submission = Object.assign(jobForm.submission, job);
  
  // Set what happens when actions are performed by the user
  jobForm.on('submit', SubmitData);
}