

var gForms = [];
var lastDraftSave = new Date();
// var readOnly = false;

function MaybeSaveDraft(form) {
  return function(form) {
  // Fixme: run each form
    // time since last draft save
    if(form.readOnly) return;
    var last = form.lastDraftSaveTime || new Date();
    var seconds = Math.floor((new Date() - last) / 1000);
    if(seconds>10) {
      var submission = form.submission;
      submission.state = "draft";
      SubmitData(submission);
    }
  }
}


function SubmitData(form) {
  return function(submission) {
    // actually the 'submit' function
    console.log(...arguments);
    var draft = submission.state !== "submitted";
    
    // Include relevant information about the form, for later retrieval
    submission.formId = formrec.formId; // MUST be in submission.
    submission.formName = formrec.formName; // MUST be in submission.
    submission.formObjectId = formrec._id; // MUST be in submission.
    submission.componentUuid = form.componentUuid; // MUST be in submission for tests

    if(!draft) {
          console.log("SubmitData",...arguments);
    } else {
          console.log("SubmitData AS DRAFT",...arguments);
    }

    function postSuccess(retval) {
        console.log('postSuccess',retval);
        if((retval.error)) {
          form.setAlert("warning",retval.error);
          form.emit('submitError');
        }

        if(!draft) { 
          form.emit('submitDone');
          // go to completed form. Do not leave this page in browser history. 
          // Disable
          var el = form.element;
          form.clear();
          $(el).html(`<a target='_blank' href='${route_on_submit+'/'+retval}'>Submitted</a>`)
        } else {
          // Update the draftid.
          form.submission._id = retval;
          form.lastDraftSaveTime = new Date();

          // Formio doesn't actually have a way of doing this...
          var saveButtons = FormioUtils.searchComponents(form.components,{type:'button',"component.action":'saveState'});
          for(button of saveButtons) {
                button.loading = false;
                button.disabled = false;
                $(button.refs.buttonMessage).text("Draft saved").show().delay(2000).fadeOut(500);
          }

          // also re-enable all submit buttons.
          saveButtons = FormioUtils.searchComponents(form.components,{type:'button',"component.action":'submit'});
          for(button of saveButtons) {
            button.disabled = false;
          }
        }
    }
    function postFail(res,statusCode,statusMsg){
        // On failure, add a failure message
        if(res.responseText && res.responseText.length>0) form.setAlert("danger",res.responseText);
        else                                              form.setAlert("danger",statusMsg + " ("+statusCode+")");
        //- alert("posting failed");
        form.emit('submitError');
        console.log("posting fail",res,statusCode,statusMsg);

    }; 

    console.log("submitting data",submission, JSON.stringify(submission));
    $.ajax(
      { contentType: "application/json",
        method: "post",
        url: submission_url,
        data: JSON.stringify(submission),
        dataType: "json",
        success: postSuccess
      }
      ).fail(postFail);
  }
};



async function addAnEntry()
{
  // User has clicked an add.
  console.log("addAnEntry");

  // If we are running in 'test' mode, we need to ensure that a UUID is picked. 
  if(formrec.collection != 'testForms') {
    //Otherwise, we can simply 
     // add a form panel
     addAFormPanel();
   } else {
    // Ok, we need to have a UUID. So let's ask for it.
    // Create a big modal.
    if(uuidform) uuidform.clear();
    await makeUuidForm();
    $('#uuidModalCenter').on('shown.bs.modal', function (e) {
      // focus on the right field.
      console.log("focus",uuidform.components[0])
      uuidform.components[0].focus();

    })
    $('#uuidModalCenter').modal('show');

  }

}


var uuidform;

async function makeUuidForm() {
  console.log('makeuuidForm');
  // I could do this by API query of the server, but this works for now.
  var schema={
      "components": [
        {
          "label": "Component UUID",
          "spellcheck": false,
          "tableView": false,
          "key": "componentUuid",
          "type": "ComponentUUID",
          "autofocus": true, // make this the initial focus
          "input": true,
          "validate": {
             "required": true
          },
        },
      ]}

  var types = formrec.componentTypes || [];
  if(types.length>0) {
    schema.components[0].autocomplete_types = types.join(',');
  }

  uuidform = await Formio.createForm(
          document.getElementById('uuid-form'),
          schema,
          );
  uuidform.on("change",function(){
    if(uuidform.isValid()) {
      var uuid = uuidform.submission.data.componentUuid;
      if(uuid && uuid.length>10){
        $('#uuidModalCenter').modal('hide');
        addAFormPanel(uuid);

      }
    }
  });

};

async function addAFormPanel(uuid)
{
  // Create a new form panel from the template
  // NOte template can have only 1 thing in it for this to work:
  var clone = document.querySelector('#form-panel-template').content.cloneNode(true).firstElementChild;
  var targetContainer = document.querySelector('#testpanels');
  // targetContainer.insertBefore(clone,document.querySelector('#add-one-panel'));
  targetContainer.appendChild(clone);
  targetContainer.scrollLeft = clone.offsetLeft;

  var formDiv = $(".builtform",clone).get(0);
  // console.log(newthing);
  console.log("formDiv",clone,formDiv);
  Formio.createForm(
              formDiv,
              formrec.schema,
              { readOnly: readOnly,
                buttonSettings: {showCancel: false, showSubmit: false}
              }
    ).then((form)=>{
        gForms.push(form);
        setTabIndecies(form)
        console.log(form);
        form.submission = Object.assign(form.submission, testdata);
        form.componentUuid  = uuid;

        if(!readOnly) {
          form.on('submit',SubmitData(form));
          form.on('change',MaybeSaveDraft(form));
        
        }
        // Set tabindexes so that we 
    })
    
  if(uuid) {
    // Insert into header
    var componentDiv = $(".componentInfo",clone);
    $('.uuid',componentDiv).html(uuid);
    console.log(componentDiv);
    getComponentSimpleInfo(uuid).then((component)=>{
      console.log("component",component);
      $('.name',componentDiv).html(component.data.name);
      getComponentTypeInfo(component.type).then((info)=>{
        console.log("info",info);
        $("img.icon",componentDiv).attr("src",info.icon);
      })
     });
  }

}

// Library this up at some point:
// Cache info globally
var gComponentSimpleCache = {};
async function getComponentSimpleInfo(uuid)
{
  if(uuid in gComponentSimpleCache) return gComponentSimpleCache[uuid];
  var component = $.get('/json/component/'+uuid+"/simple");
  gComponentSimpleCache[uuid] = component;
  return component;
}

var gComponentTypeInfoCache = {};
async function getComponentTypeInfo(type)
{

  if(type in gComponentTypeInfoCache) return gComponentTypeInfoCache[type];
  var info = $.get('/json/componentTypes/'+type);
  gComponentTypeInfoCache[type] = info;
  return info;
}



// copied over from jquery UI core
$.extend($.expr[':'], {
  focusable: function(element) {
    var nodeName = element.nodeName.toLowerCase(),
      tabIndex = $.attr(element, 'tabindex');
    return (/input|select|textarea|button|object/.test(nodeName)
      ? !element.disabled
      : 'a' == nodeName || 'area' == nodeName
        ? element.href || !isNaN(tabIndex)
        : !isNaN(tabIndex))
      // the element and all of its ancestors must be visible
      // the browser may report that the area is hidden
      && !$(element)['area' == nodeName ? 'parents' : 'closest'](':hidden').length;
  }
});

function setTabIndecies(form)
{
  // find 
  var all = $(":focusable",form.element);
  // sort them into tabindex order
  all.sort(function(a,b){
    var at = a.tabindex || 0;
    var bt = b.tabindex || 0;
    return a-b;
  });
  // Now explicitly add tabindecies, with 1000 stride.
  var i = 0;
  var offset = gForms.length;
  for(var el of all) {
    i++;
    el.setAttribute("tabindex", (i*1000)+offset );
  }
}



// ----------- Setup
$(async function(){


  console.log("schema",formrec.schema);
  console.log("BLAH!")


  // Add draft and submit buttons.
  var append_to = formrec.schema;
  if(formrec.schema.display === 'wizard') append_to = formrec.schema.components[formrec.schema.components.length-1]; // last page.

  // Add save-as-draft button.
  append_to.components.push({type:'button', action:"saveState", state: 'draft', theme: 'secondary', key:'saveAsDraft', label:'Save Draft'});
    
  // add submit button
  append_to.components.push({ type: "button",label: "Submit",key: "submit",disableOnInvalid: true,input: true,tableView: false  });

  $("#add-an-entry").on('click',addAnEntry);
  addAnEntry();

});





