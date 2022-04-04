// Set up an array to hold the test type forms that will actually be submitted
// Each of these will (eventually) be a modified version of the 'form' defined above
var testForms = [];

// Save the currently entered data as a draft test instead of a final submission
function SaveDraft(testForm)
{
  return function(testForm)
  {
    // Get the time since the last draft save for a single component in this test
    // If the component's test has never been saved, set the time to be the time at which this page is first accessed
    var last = testForm.lastDraftSaveTime || new Date();
    var seconds = Math.floor((new Date() - last) / 1000);
    
    // If the last draft save time was more than 10 seconds ago, save the current data as a draft
    if(seconds > 10)
    {
      var submission = testForm.submission;
      submission.state = "draft";
      
      SubmitData(submission);
    }
  }
}

// Submit the test data to the DB, either as a draft or as a final submission
function SubmitData(testForm)
{
  return function(submission)
  {
    var draft = submission.state !== "submitted";
    
    // Include relevant information about the test type form and tested component (these MUST be in the submission information)
    submission.formId = form.formId;
    submission.formName = form.formName;
    submission.formObjectId = form._id;
    submission.componentUuid = testForm.componentUuid;
    
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
        
        // Set up and display a link to the page for viewing the test results, but do not go there automatically
        var el = testForm.element;
        testForm.clear();
        
        $(el).html(`<a href = '${'/test/' + retval}' target = '_blank'>Results Submitted (Click to View)</a>`)
      }
      
      // If the submission is a draft ...
      else
      {
        // Update the draft's ID, and reset the time of the last draft save
        testForm.submission._id = retval;
        testForm.lastDraftSaveTime = new Date();
        
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
};

// Add a new component to the test
var uuidform;

async function addAnEntry()
{
  // Since every test must be associated with a component, the user must enter a component UUID
  // Provide a one-line auto-complete form for this
  
  // First, clear any existing UUID form
  if(uuidform)
  {
    uuidform.clear();
  }
  
  // (Re)Create the UUID form
  var schema =
  {
    "components": [
    {
      "label": "Component UUID",
      "spellcheck": false,
      "tableView": false,
      "key": "componentUuid",
      "type": "ComponentUUID",
      "autofocus": true,
      "input": true,
      "validate": {"required": true}
    }]
  }

  uuidform = await Formio.createForm(document.getElementById('uuid-form'), schema);
  
  // When a UUID is entered into the box, check that it is valid, and if so set the submission contents accordingly
  // Then add a new component panel to the overall multi-component test's display
  uuidform.on("change", function()
  {
    if(uuidform.isValid())
    {
      var uuid = uuidform.submission.data.componentUuid;
      
      if(uuid && uuid.length > 10)
      {
        $('#uuidModalCenter').modal('hide');
        addAFormPanel(uuid);
      }
    }
  });
  
  // Display the popup modal for the user to enter a component UUID
  // Upon display, focus the cursor into the input box
  $('#uuidModalCenter').on('shown.bs.modal', function (e)
  {
    uuidform.components[0].focus();
  })
  
  $('#uuidModalCenter').modal('show');
}

// Add a new component panel to the overall multi-component test's display
async function addAFormPanel(uuid)
{
  // Create a new component panel from the base form template
  // Add the new panel to the overall multi-component test's display
  var templateClone = document.querySelector('#form-panel-template').content.cloneNode(true).firstElementChild;
  
  var targetContainer = document.querySelector('#testpanels');
  targetContainer.appendChild(templateClone);
  targetContainer.scrollLeft = templateClone.offsetLeft;
  
  // Set up the actual contents of the new panel, based on test's type form
  // Then save the individual forms into the array for later access, and set up the tab indices on each panel
  // Finally, set what happens when actions are performed by the user
  
  // Note: 'tabIndices' are used to set the order in which elements on a page are selected using the Tab key
  // Here, the input box and buttons on each component panel are assigned sequential tab indices so they can be moved to one after the other
  
  var formDiv = $(".builtform", templateClone).get(0);
  
  Formio.createForm(formDiv, form.schema, {readOnly: false,
                                           buttonSettings: {showCancel: false,
                                                            showSubmit: false}})
        .then((testForm) => {testForms.push(testForm);
                         setTabIndices(testForm)
                         
                         testForm.componentUuid  = uuid;
                         
                         testForm.on('submit', SubmitData(testForm));
                         testForm.on('change', SaveDraft(testForm));})
  
  // Get selected information about the component, for display on the panel
  if(uuid)
  {
    var componentDiv = $(".componentInfo", templateClone);
    $('.uuid', componentDiv).html(uuid);
    
    getComponentName(uuid).then((component) => 
    {
      $('.name', componentDiv).html(component.data.name);
      
      getComponentType(component.formName).then((component) => 
      {
        $('.formName', componentDiv).html(component.formName);
      })
    });
  }

}

// Set the tab indices of elements within each component panel
// Note: the first part of the code below has been copied over from the jquery UI core
$.extend($.expr[':'], 
{
  focusable: function(element) 
  {
    var nodeName = element.nodeName.toLowerCase(),
      tabIndex = $.attr(element, 'tabindex');
    
    return (/input|select|textarea|button|object/.test(nodeName)
      ? !element.disabled
      : 'a' == nodeName || 'area' == nodeName
        ? element.href || !isNaN(tabIndex)
        : !isNaN(tabIndex))
      && !$(element)['area' == nodeName ? 'parents' : 'closest'](':hidden').length;
  }
});

function setTabIndices(testForm)
{
  // Find all available interactable elements (boxes, buttons, etc.) on the panel
  var elements = $(":focusable", testForm.element);
  
  // Sort them by increasing tab index order
  elements.sort(function(a, b)
  {
    var at = a.tabindex || 0;
    var bt = b.tabindex || 0;
    
    return a - b;
  });
  
  // Now explicitly add tab indices, with steps of 1000 between individual elements
  var i = 0;
  var offset = testForms.length;
  
  for(var el of elements)
  {
    i++;
    el.setAttribute("tabindex", (i * 1000) + offset);
  }
}

// Get component information
var gComponentNameCache = {};

async function getComponentName(uuid)
{
  if(uuid in gComponentNameCache)
  {
    return gComponentNameCache[uuid];
  }
  
  var component = $.get('/json/component/' + uuid + '/simple');
  gComponentNameCache[uuid] = component;
  
  return component;
}

// Get component type information
var gComponentTypeCache = {};

async function getComponentType(type)
{
  if(type in gComponentTypeCache)
  {
    return gComponentTypeCache[type];
  }
  
  var componentType = $.get('/json/componentTypes/' + type);
  gComponentTypeCache[type] = componentType;
  
  return componentType;
}

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
  
  // If the user clicks the corresponding button, add a new component to the test
  $("#add-an-entry").on('click', addAnEntry);
  addAnEntry();
}
