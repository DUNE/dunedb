// Set up a variable to hold the test type form that will actually be submitted
// This will (eventually) be a modified version of the 'form' defined above
var testForm = null;

// Set the initial time of the last draft save to be the time at which this page is first accessed
var lastDraftSave = new Date();

// Save the currently entered data as a draft test instead of a final submission
function SaveDraft()
{
  // Get the time since the last draft save
  var seconds = Math.floor((new Date() - lastDraftSave) / 1000);
  
  // If the last draft save time was more than 10 seconds ago, save the current data as a draft
  if(seconds > 10)
  {
    var submission = testForm.submission;
    submission.state = "draft";
    
    SubmitData(submission);
  }
}

// Submit the test data to the DB, either as a draft or as a final submission
function SubmitData(submission)
{
  try
  {
    var draft = submission.state !== "submitted";
  
    // Include relevant information about the test type form and tested component (these MUST be in the submission information)
    submission.formId = form.formId;
    submission.formName = form.formName;
    submission.formObjectId = form._id;
    submission.componentUuid = componentUuid;
    
    // If the submission is successful ...
    function postSuccess(retval)
    {
      // Just in case, output any error messages that might have occurred even with a successful submission
      if(retval.error)
      {
        testForm.setAlert("warning", retval.error);
        testForm.emit('submitError');
      }

      // If the submission is final ...
      if(!draft)
      { 
        testForm.emit('submitDone');
        
        // Go to the page for viewing the test results, and do not leave the submission page in the browser history
        window.location.replace('/test/' + retval);
      }
      
      // If the submission is a draft ...
      else
      {
        // Update the draft's ID, and reset the time of the last draft save
        testForm.submission._id = retval;
        lastDraftSave = new Date();
        
        // Indicate on screen that the draft has been saved, by briefly showing some text below the corresponding button
        var saveButtons = FormioUtils.searchComponents(testForm.components, {type: 'button',
                                                                             "component.action": 'saveState'});
        
        for(button of saveButtons)
        {
          button.loading = false;
          button.disabled = false;
          
          $(button.refs.buttonMessage).text("Draft Saved").show().delay(2000).fadeOut(500);
        }

        // Re-enable any submission buttons that might have been disabled or removed by other uses of the test type form (i.e. displaying rather than usage)
        submitButtons = FormioUtils.searchComponents(testForm.components, {type: 'button',
                                                                           "component.action": 'submit'});
        
        for(button of submitButtons)
        {
          button.disabled = false;
        }
      }
    }
    
    // If the submission fails ...
    function postFail(res, statusCode, statusMsg)
    {
      // Set up and relay error messages
      if(res.responseText)
      {
        testForm.setAlert("danger", res.responseText);
      }
      else
      {
        testForm.setAlert("danger", statusMsg + " (" + statusCode + ")");
      }
      
      testForm.emit('submitError');
    }; 

    // Perform the submission to the DB, using the success and failure functions defined above
    $.ajax({contentType: "application/json",
            method: "post",
            url: '/json/test',
            data: JSON.stringify(submission),
            dataType: "json",
            success: postSuccess})
     .fail(postFail);
  }
  catch (e)
  {
    // TOFIX: not sure what to put here (used to be console and debugger, but we're no longer using them)
  }
};

// On first accessing this page ...
window.addEventListener('load', loadingFunction);

async function loadingFunction()
{
  // Temporarily add additional submission and save draft buttons to the test type form
  var append_to = form.schema;
  
  if(form.schema.display === 'wizard')
  {
    append_to = form.schema.components[form.schema.components.length - 1];
  }

  append_to.components.push({type: 'button',
                             theme: "btn btn-info",
                             label: 'Save as Draft',
                             key: 'saveAsDraft',
                             action: "saveState",
                             state: 'draft'});
    
  append_to.components.push({type: "button",
                             theme: "btn btn-success",
                             label: "Submit Results",
                             key: "submit",
                             disableOnInvalid: true,
                             input: true,
                             tableView: false});
  
  // Get the revised job type form
  testForm = await Formio.createForm(document.getElementById('builtform'), form.schema, {readOnly: false,
                                                                                         buttonSettings: {showCancel: false,
                                                                                                          showSubmit: false}});
  
  // Populate the form with the contents of the test itself
  // If this page is being used to submit a new test, this won't make any changes
  // If this page is being used to edit an existing draft test, this is where the existing information is filled in
  testForm.submission = Object.assign(testForm.submission, test);
  
  // Set what happens when actions are performed by the user
  testForm.on('change', SaveDraft);
  testForm.on('submit', SubmitData);
}