var pending = [];

$(function(){
  $('div.section').each(function(){
    var section = this;
    var builtform = $('.builtform',this);
    console.log(builtform);
    var recordType = builtform.data("recordtype");
    var record = builtform.data("record");
    console.log("Building",recordType,record);
    // Get the form schema.
    var schema_url = '';
    if(recordType=="component") schema_url = "/json/componentForms/"+record.type;
    else if(recordType=="test") schema_url = "/json/testForms/"+record.formId;
    else if(recordType=="job") schema_url = "/json/jobForms/"+record.formId;
    else return;
    pending.push(section);
    console.log("pending",pending);
    $.get(schema_url,function(formRecord) {
      console.log("got formrecord",schema_url,formRecord);
      // Update some things in the metadata.
      $(".formname",section).text(formRecord.formName);

      Formio.createForm(builtform[0],formRecord.schema,
        {
            readOnly: true,
            renderMode: 'html'
        }).then(function(form){
          console.log("Formio form created")
          form.submission = record;
          form.nosubmit = true; // Use the beforeSubmit hook.
          pending = pending.filter(e=> e!==section );
          if(pending.length == 0) window.print();
        });
    }) // end $.get
  }) // end $.each
}) // end onload
