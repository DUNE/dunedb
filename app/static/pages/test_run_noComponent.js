// Create an auto-complete form to allow the user to select a component UUID to run the test with
// If a good UUID is selected, create the corresponding URL for running the test on the component, and go to the page
$(async function()
{
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

  form = await Formio.createForm(document.getElementById('builtform'), schema);
  form.on("change", function()
  {
    if(form.isValid())
    {
      var uuid = form.submission.data.componentUuid;
      
      if(uuid && uuid.length > 10)
      {
        window.location.assign(`/test/${formId}/${uuid}`)
      }
    }
  });
});
