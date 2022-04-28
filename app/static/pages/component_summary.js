// On loading the component summary page, set up and populate the various sections to be included
var pending = [];

$(function()
{
  // For each section ...
  $('div.section').each(function()
  {
    // Get information about what type of record this section contains
    var section    = this;
    var builtform  = $('.builtform', this);
    var recordType = builtform.data("recordtype");
    var record     = builtform.data("record");
    
    // Get the type form corresponding to the record
    var schema_url = '';
    
    if(recordType === "component") { schema_url = `/json/componentForms/${record.formId}`; }
    else if(recordType === "test") { schema_url = `/json/testForms/${record.formId}`; }
    else if(recordType === "job")  { schema_url = `/json/jobForms/${record.formId}`; }
    else return;
    
    // Add the section to the list of sections to be included in the summary
    pending.push(section);
    
    $.get(schema_url, function(formRecord)
    {
      // Update some things in the metadata
      $(".formname", section).text(formRecord.formName);
      
      // Create the record type form, and disable the submission button (since it is only being displayed)
      Formio.createForm(builtform[0], formRecord.schema, {readOnly: true})
            .then(function(form)
            {
              form.submission = record;
              form.nosubmit = true;
              
              pending = pending.filter(e => e !== section);
            });
    })
  })
})
