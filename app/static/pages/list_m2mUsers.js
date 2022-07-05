// Declare the input form for creating and editing m2m user client details
var form;

$(async function()
{
  // Create the input form
  form = await Formio.createForm(document.getElementById("formio"), 
  {
    "display": "form",
    "components": [
    {
      "label": "User ID",
      "disabled": true,
      "tableView": true,
      "key": "user_id",
      "type": "textfield",
      "input": true
    },
    
    {
      "label": "Display Name",
      "placeholder": "This will be saved and shown in forms",
      "tableView": true,
      "validate": {"required": true,
                   "minLength": 5},
      "key": "displayName",
      "type": "textfield",
      "input": true
    },
    
    {
      "label": "Email",
      "placeholder": "This should be the real email address of a responsible script owner",
      "tableView": true,
      "validate": {"required": true},
      "key": "email",
      "type": "email",
      "input": true
    },
    
    {
      "label": "Permissions (click and select from dropdown menu)",
      "widget": "choicesjs",
      "tableView": true,
      "multiple": true,
      "data": 
      {
        "values": [
          { "label": "components:edit",       "value": "components:edit" },
          { "label": "components:view",       "value": "components:view" },
          { "label": "actions:perform",       "value": "actions:perform" },
          { "label": "actions:view",          "value": "actions:view"    },
        ]
      },
      "selectThreshold": 0.3,
      "key": "permissions",
      "type": "select",
      "input": true
    },
    
    {
      "type": "button",
      "theme": "info",
      "label": "Submit Changes",
      "key": "submit",
      "disableOnInvalid": true,
      "input": true,
      "tableView": false
    }]
  });
  
  // If the user clicks on an existing m2m user client's entry, fill in the contents of the form automatically
  // Also, re-enable the button for deleting the client (is disabled if the form contains no contents)
  $('tr.user_row').on('click', function()
  {
    form.submission = {data: {user_id    : $(".user_id", this).text(),
                              email      : $(".email", this).text(),
                              displayName: $(".displayname", this).text(),
                              permissions: $(".permissions", this).text().split(',')}};
                              
    $('#deleteButton').removeAttr('disabled');
  })
        
  // If the user clicks the button to clear the form, clear the contents and disable the deletion button
  $('#clearForm').on("click", () => 
  {
    form.submission = {}
    
    $('#deleteButton').attr('disabled', true);
  });

  // If the submission of a new m2m user client fails ...
  function postFail(res, statusCode, statusMsg)
  {
    // Set up and relay error messages
    if(res.responseText)
    {
      form.setAlert("danger", res.responseText);
    }
    else
    {
      form.setAlert("danger", statusMsg + " (" + statusCode + ")");
    }
    
    form.emit('submitError');
  }
  
  // If the user clicks the button to delete a m2m user client, perform the appropriate 'submission' to the DB
  // Then reload the current page, showing the m2m users
  $('#deleteButton').on('click', function()
  {
    if(form.submission.data.user_id)
    {
      $.post("/json/m2mUser/delete", {user_id: form.submission.data.user_id})
       .done(() => {form.emit('submitDone');            
                    window.location.reload()})
       .fail(postFail);
    }
  })

  // For a new or edited m2m user client, perform the actual submission to the DB
  form.on('submit', function(submission)
  {
    $('#creds').hide();
    
    $.post("/json/m2mUser", submission.data)
     .done((creds) => {form.emit('submitDone');
                       $('#creds').show()
                       $('#creds pre').text(JSON.stringify(creds, null, 2));})
     .fail(postFail);
  });
})
