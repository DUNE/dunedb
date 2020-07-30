var form;
var formrec;
var searchrec;


function removeEmpty(inobj)
{
  var obj = {...inobj};
  Object.keys(obj).forEach(function(key) {
    if (obj[key] && typeof obj[key] === 'object') { 
      var subobj = removeEmpty(obj[key])
      if(Object.keys(subobj).length == 0) delete obj[key];
      else obj[key] = subobj;
    }
    else {
      if (obj[key] == null) delete obj[key];
      if (typeof obj[key] === 'string' && obj[key].length == 0) delete obj[key];
    }
  });
  console.log("removeEmpty",inobj,obj);
  return obj;
}

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




async function loadFormIds(recordType)
{
  var route = '/json/'+recordType+"Forms";
  var types = await $.get(route);
  console.log('got types of formId:',types);
  var options = ["<option val=''></option>"];
  for(var type in types){
    options.push(
      `<option value="${type}">${types[type].formName}</option>`
    );
  }
  $('#builtform').empty().hide();
  $('#typeSelect').empty().append(options.join()).show();
}



async function loadForm(recordType,formId,initializeFormData)
{
  console.log('loadForm()',recordType,formId)
  formrec = await $.get(`/json/${recordType}Forms/${formId}`);
  $('#builtform').empty().show();
  form = await Formio.createForm(
               document.getElementById('builtform'),
               formrec.schema,
               { 
                 buttonSettings: {showCancel: false, showSubmit: false}
               });
  form.submission = initializeFormData;
  form.on('change',doFormChange);
}



function doFormChange(event)
{

  console.log('change',form||{}.submission,event);
  // debugger;
  // copy data into search record
  // Need to use mongo dot notation to get at subfields

  // FIXME add search terms for general word search, metadata search fields
  var formParams = {};
  if(form)
    formParams.data= form.submission.data;
  var searchobj = removeEmpty(formParams);
  var searchrec = CopyToDot(searchobj);

  var queryParams = {};
  if($('#textSearchInput').val().length>0)
    searchobj.search=$('#textSearchInput').val();

  if($('#insertionAfter').val())
    searchobj["insertionAfter"] = moment($('#insertionAfter').val()).toISOString();
  if($('#insertionBefore').val())
    searchobj["insertionBefore"] = moment($('#insertionBefore').val()).toISOString();

  var searchrec = CopyToDot(searchobj);

  console.log("cleaned object",searchobj);

  if(Object.keys(searchrec).length<1) return;
  console.log(searchrec);

  

  var params = JsonURL.stringify(searchobj);
  window.history.replaceState({}, "", decodeURIComponent(`${window.location.pathname}?${params}`));

  // put it in the query string. $.param(searchrec);

  var recordType =  $('#recordTypeSelect').val();
  var formId = encodeURIComponent($('#typeSelect').val());
  var url = `/json/search`;
  if(recordType) {
    url+="/"+recordType;
    if(formId) url+="/"+formId;
  }
  var ajaxQuery = {
    url: url,
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify(searchrec)
  };
  $('#search-query').append(JSON.stringify(ajaxQuery,null,2));

  $.ajax(ajaxQuery).then(displayResults);

}


function displayResults(result)
{
  $('#dump').append(JSON.stringify(result,null,2));
  $('#results').empty();

  for(var item of result) {
    var h = `<li class="search-result recordType-${item.recordType}">
              <a href="${item.route}">${item.name||item.formId}</a>
              ${item.recordType} ${item.insertion.user.displayName} ${moment(item.insertion.insertDate).format()}
            </li>`;
    $('#results').append(h);
  }

}



var JSONURL = new JsonURL();
// Initialization

$(function(){
  $(".set-up-datepicker").flatpickr({enableTime: true,wrap:true});
  $(".search-on-change").on('change',doFormChange)
                        .on('keyup',function(){
                            if (event.key === "Enter") doFormChange()
                            });

  $('#recordTypeSelect').on('change',async function(){
    recordType=$(this).val();
    loadFormIds(recordType);
    // Change the url.
    if(recordType)
      history.replaceState(null,null,'/search/'+recordType);
    else
      history.replaceState(null,null,'/search');
   });

  $('#typeSelect').on('change',async function(){ 
    console.log('typechange')
    // recordType =  $('#recordTypeSelect').val();
    formId = encodeURIComponent($('#typeSelect').val());
    if(formId) {
      loadForm(recordType,formId);
      history.replaceState(null,null,'/search/'+recordType+'/'+encodeURIComponent(formId))
    } else {
      form = null;
       $('#builtform').empty().hide();
      history.replaceState(null,null,'/search/'+recordType)
    }
   });

  //Deal with initial route setting.
  // Run immedately as 
  var querystr = window.location.search.substring(1); // remove '?'
  console.log("querystr",querystr);
  var searchObj = JSONURL.parse(decodeURIComponent(querystr));
  if(searchObj) {
    console.log("searchObj",searchObj);
    $("#textSearchInput").val(searchObj.search);
    $("#insertionAfter").val(searchObj.insertionAfter);
    $("#insertionBefore").val(searchObj.insertionBefore);
  }
  if(recordType) {
    $('#recordTypeSelect').val(recordType);
    loadFormIds(recordType).then(function(){
     console.log("recordtype change done?");
     if(formId){
        $('#typeSelect').val(formId);
          // Fixme: fill other search form parameters

          // Fixme: this somehow triggers everything TWICE. No idea why.
          loadForm(recordType,formId,searchObj).then(function(){
            console.log("done");
            doFormChange();
            // fill out the form.
        })
     } else doFormChange();
    })
  } else  doFormChange()
 
});