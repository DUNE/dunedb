// Set up a variable to hold the component type form that will actually be submitted
// This will (eventually) be a modified version of the 'form' defined above
var componentForm = null;

// Submit the component to the DB
function SubmitData(submission)
{
  // Include relevant information about the component and component type form (these MUST be in the submission information)
  submission.componentUuid = component.componentUuid; 
  submission.formName = form.formName;
  submission.formId = form.formId;
  
  // If the submission is successful ...
  function postSuccess(retval)
  {
    // Just in case, output any error messages that might have occurred even with a successful submission
    if(retval.error)
    {
      componentForm.setAlert("warning", retval.error);
      componentForm.emit('error', retval.error);
    }
    else componentForm.setAlert(false);
    
    if(retval.data)
    {
      componentForm.submission = {data: retval.data};
    }
    
    // If creating a new component, change the displayed URL to be the component editing page
    if(newComponent)
    {
      history.replaceState(null, null, '/component/' + retval.componentUuid + '/edit');
      $('#name').html(submission.name);
    }

    componentForm.emit('submitDone', retval.submission);
    
    // Once the submission is complete, go to the page for viewing information about an existing component
    if(retval.componentUuid)
    {
      window.location.href = '/component/' + retval.componentUuid;
    }
  }
  
  // If the submission fails ...
  function postFail(res, statusCode, statusMsg)
  {
    // Set up and relay error messages
    if(res.responseText)
    {
      componentForm.setAlert("danger", res.responseText);
    }
    else
    {
      componentForm.setAlert("danger", statusMsg + " (" + statusCode + ")");
    }
    
    componentForm.emit('submitError');
  };
  
  // Perform the submission to the DB, using the success and failure functions defined above
  $.ajax({contentType: "application/json",
          method: "post",
          url: '/json/component/' + componentUuid,
          data: JSON.stringify(submission),
          dataType: "json",
          success: postSuccess})
   .fail(postFail);
};

// Load the component type form ready for data to be entered and submitted
function loadComponentForm(formId, data) 
{
  if(!formId)
  {
    console.error(loadComponentForm, "No component type ID has been provided!");
  }
  
  $.get('/json/componentForms/' + formId)
   .then(async function(form)
   {
     // Get the component type form
     var schema = form.schema;
     
     // Temporarily add an additional submission button to the job type form
     schema.components.push({type: "button",
                             theme: "btn btn-success",
                             label: "Submit Component",
                             key: "submit",
                             disableOnInvalid: true,
                             input: true,
                             tableView: false});
     
     // Create the form, initially with no data entered
     $('#builtform').empty();
    
     componentForm = await Formio.createForm(document.getElementById('builtform'), schema);
     
     // Populate the form with the contents of the component itself
     // If this page is being used to submit a new component, this won't make any changes
     // If this page is being used to edit an existing component, this is where the existing information is filled in
     componentForm.submission = {data: data};
     componentForm.nosubmit = true;
     
     // Set what happens when actions are performed by the user
     componentForm.on('submit', SubmitData);
   });
};

// Remove empty fields from the submission, in preparation for refilling them from an existing recently submitted component
function removeEmpty(inobj)
{
  var obj = {...inobj};
  
  Object.keys(obj).forEach(function(key)
  {
    if (obj[key] && typeof obj[key] === 'object')
    {
      var subobj = removeEmpty(obj[key])
      
      if(Object.keys(subobj).length === 0)
      {
        delete obj[key];
      }
      else
      {
        obj[key] = subobj;
      }
    }
    else
    {
      if (obj[key] === null)
      {
        delete obj[key];
      }
      
      if (typeof obj[key] === 'string' && obj[key].length === 0)
      {
        delete obj[key];
      }
    }
  });
  
  return obj;
}

// Search the DB for any component of the same type as this submission that was most recently modified (created or edited) by this user
function searchForRecentSubmission()
{
  $('#loadRecentData').hide();
  
  $.post(`/json/search/component/${(component.formId || "")}?limit=1`, {"insertion.user.user_id": "!{user.user_id}"})
   .then(function(recent_components)
   {
     if(recent_components.length > 0)
     {
       var recentComponent = recent_components.shift();
       
       $('#loadRecentData').html(`Copy data from the most recently modified component of this type: '${recentComponent.name}'`)
                           .show()
                           .data('recent-component', recentComponent);
     }
   });
}

// Fill the submission form with the submitted information from the most recently modified component found from above
// Note that this will only fill any fields that are currently empty - it will not overwrite any new information that has already been entered
function fillFromRecentSubmission()
{
  var recentComponent = $('#loadRecentData').data("recent-component");
  
  if(recentComponent)
  {
    $.get('/json' + recentComponent.route)
     .then(function(submission)
     {
       if(!component.formId)
       { 
         loadComponentForm(submission.formId, submission.data);
       }
       else
       {
         var current_data = removeEmpty({...componentForm.submission.data})
         componentForm.submission = {data: {...submission.data, ...current_data}}
       }
     })
  }
}

// On first accessing this page ...
window.addEventListener('load', setupFunction);

async function setupFunction()
{
  // Display the component's type form with or without any existing data filled in
  loadComponentForm(form.formId, component.data);
  
  // For new components, show the button for optionally loading data from a recently modified component of the same type
  if(Object.keys(component.data || {}).length === 0)
  {
    searchForRecentSubmission();
    
    $("#loadRecentData").hide().on("click", fillFromRecentSubmission);
  }      
  
  $('[data-toggle = "popover"]').popover()
}
