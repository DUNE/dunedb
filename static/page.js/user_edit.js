var schema = {
"components": [
    {
        "label": "Name",
        "tableView": true,
        "key": "name",
        "type": "textfield",
        "input": true
    },
    {
        "label": "Nickname",
        "tableView": true,
        "key": "nickname",
        "type": "textfield",
        "input": true
    },
    {
        "label": "Email",
        "tableView": true,
        "key": "email",
        "type": "email",
        "input": true
    },
    {
        "label": "Picture URL",
        "tableView": true,
        "key": "picture",
        "type": "textfield",
        "input": true
    },
    {
        "label": "Roles",
        "widget": "choicesjs",
        "tableView": true,
        "multiple": true,
        "dataSrc": "url",
        "data": {
            "url": "/json/roles",
            "headers": [
                {
                    "key": "",
                    "value": ""
                }
            ]
        },
        "template": "<span title='{{item.description}}'>{{ item.name }}</span>",
        "selectThreshold": 0.3,
        "key": "roleIds",
        "valueProperty": "id",
        "type": "select",
        "indexeddb": {
            "filter": {}
        },
        "input": true,
        "disableLimit": false
    },
    {
        "label": "Start Page",
        "tableView": true,
        "key": "user_metadata.start_page",
        "type": "textfield",
        "input": true
    },
    {
        "type": "button",
        "label": "Submit",
        "key": "submit",
        "disableOnInvalid": true,
        "input": true,
        "tableView": false
    }
  ]
}


var form;
var user;

function postSuccess(retval){
  console.log('postSuccess',retval);
  if((retval.error)) {
    form.setAlert("warning",retval.error);
    form.emit('submitError');
  }
  form.emit('submitDone');
  user = retval;
  form.submission = {data:JSON.parse(JSON.stringify(user))}; // clone
}

function postFail(res,statusCode,statusMsg){
  // On failure, add a failure message
  if(res.responseText && res.responseText.length>0) form.setAlert("danger",res.responseText);
  else                                              form.setAlert("danger",statusMsg + " ("+statusCode+")");
  //- alert("posting failed");
  form.emit('submitError');
  console.log("posting fail",res,statusCode,statusMsg);
}

function SubmitData(submission) {
  // Only submit changed things.
  var to_update = {};
  for(var key in submission.data) {
    // literal check
    console.log("looking at ",key)
    if(JSON.stringify(submission.data[key])!=JSON.stringify(user[key])){
      to_update[key] = submission.data[key];
      console.log("new value");
    }
    console.log("old_value")
  }
  delete to_update.submit; // Submit button is not really data.
  console.log("Submitting change:",to_update,Object.keys(to_update).length>0);
  if(Object.keys(to_update).length>0) {
    console.log("Submitting change:",to_update);
    $.post(`/json/user/${user_id}`,to_update).done(postSuccess).fail(postFail);
  }
}

function update()
{
  if(!form) return;
  if(!user) return;
  form.submission = {data:JSON.parse(JSON.stringify(user))}; // clone
  for(var key in user) {
    var val = user[key];
    var elems = $(".user_"+key);
    if(key == "permissions") val = val.sort().join('\n');
    if(key == "user_metadata") val = JSON.stringify(val,null,2);
    elems.text(val);
  }
  $(".avatar_image").prop('src',user.picture);
  // $(".user_name").text(user.name);
  // $(".user_last_ip").text(user.last_ip);
  // $(".user_last_ip").text(user.last_ip);
    //- $(".user_email").text(user.email);
    //- $(".user_roles").html(user.roles.join("<br>"));
    //- $(".user_permissions").html(user.permissions.join("<br>"));
    //- $(".user_metadata").html("<pre>"+JSON.stringify(user.user_metadata,null,2)+"</pre>");
}


// Turn off non-editable things in the gui.  (Disallowed by backend too)
if(!is_admin) {
  for(var c of schema.components) {
    if(c.key == "roles" || c.key == "roleIds" || c.key=="permissions" || c.key.startsWith("user_metadata")) c.disabled=true;
  }
}
$(function(){

  $.get(`/json/user/${user_id}`).then((data)=>{user=data; update()});
  Formio.createForm(
          document.getElementById('builtform'),
          schema)
        .then((built)=>{form=built; form.on('submit',SubmitData); update();})

})
