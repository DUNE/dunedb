// On first accessing this page ...
window.addEventListener('load', setupFunction);

async function setupFunction()
{
  // Create a single-box input form for specifying the component UUID to search for
  var schema = 
  {
    "components": 
    [
      {
        "label"     : "Component UUID",
        "spellcheck": false,
        "tableView" : false,
        "key"       : "componentUuid",
        "type"      : "ComponentUUID",
        "autofocus" : true,
        "input"     : true,
        "validate"  : {"required": true},
      },
    ]
  }
  
  form = await Formio.createForm(document.getElementById('builtform'), schema);
  
  // When a UUID is entered, first check if it is valid, and then if so, redirect the user to the corresponding component information page
  form.on("change", function()
  {
    if(form.isValid())
    {
      var uuid = form.submission.data.componentUuid;
      
      if(uuid && uuid.length > 10)
      {
        window.location.assign(`/component/${uuid}`)
      }
    }
  });
}
