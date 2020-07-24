var form;
var formrec;
var searchrec;

function CopyToDot(obj,prefix)
{
  var _prefix = prefix || [];
  var retval = {};
  for(var i in obj) {
    var val = obj[i]
        var path = [..._prefix,i];
    var key = path.join('.');
    if(typeof val === 'object') retval = {...retval,...CopyToDot(obj[i],path)};
    if(typeof val === 'string' && val.length>0) retval[key]=val;
    if(typeof val === 'number') retval[key]=val;
  }
  return retval;
}


async function doFormChange()
{
  var submission = form.submission;
  console.log('change',submission);
  // copy data into search record
  // Need to use mongo dot notation to get at subfields

  var searchrec = CopyToDot(submission);
  if(Object.keys(searchrec).length<1) return;
  console.log(searchrec);
  $('#dump').empty().append(JSON.stringify(searchrec,null,2));
  var recordType =  $('#recordTypeSelect').val();
  var formId = encodeURIComponent($('#typeSelect').val());
  var url = `/json/search/${recordType}/${formId}`;
  var result = await $.ajax({
    url: url,
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify(searchrec)
  });

  $('#dump').append(JSON.stringify(result,null,2));

}
$(function(){
  $('#recordTypeSelect').on('change',async function(){
    // job -> jobForms
    var route = '/json/'+$(this).val()+"Forms";
    var types = await $.get(route);
    console.log(types);
    var options = ["<option val='---none---'></option>"];
    for(var type in types){
      options.push(
        `<option value=${type}>${types[type]}</option>`
      );
    }
    console.log(options);
    $('#builtform').empty().hide();
    $('#typeSelect').empty().append(options.join()).show();
  });

  $('#typeSelect').on('change',async function(){ 
    console.log('typechange')
    var recordType =  $('#recordTypeSelect').val();
    var formId = encodeURIComponent($('#typeSelect').val());
    console.log('typechange',recordType,formId);
    formrec = await $.get(`/json/${recordType}Forms/${formId}`);
    $('#builtform').empty().show();
    form = await Formio.createForm(
                  document.getElementById('builtform'),
                  formrec.schema,
                  { 
                    buttonSettings: {showCancel: false, showSubmit: false}
                  });
    form.on('change',doFormChange);
  })
})