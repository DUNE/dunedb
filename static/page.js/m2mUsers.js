    var form;
    $(async function(){
      form = await Formio.createForm(
        document.getElementById("formio"),
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
                "placeholder": "What will be shown in forms",
                "tableView": true,
                "validate": {
                  "required": true,
                  "minLength": 5
                },
                "key": "displayName",
                "type": "textfield",
                "input": true
              },
              {
                "label": "Email",
                "description": "Should be a real email address of responsible script owner",
                "tableView": true,
                "validate": {
                  "required": true
                },
                "key": "email",
                "type": "email",
                "input": true
              },
              {
                "label": "Permissions",
                "widget": "choicesjs",
                "tableView": true,
                "multiple": true,
                "data": {
                  "values": [
                    { "label": "dev:components:edit",   "value": "dev:components:edit" },
                    { "label": "dev:components:view",   "value": "dev:components:view" },
                    { "label": "dev:components:create", "value": "dev:components:create" },
                    { "label": "dev:jobs:view",         "value": "dev:jobs:view" },
                    { "label": "dev:jobs:submit",       "value": "dev:jobs:submit" },
                    { "label": "dev:tests:view",        "value": "dev:tests:view" },
                    { "label": "dev:tests:submit",      "value": "dev:tests:submit" },
                    { "label": "dev:docs:create",       "value": "dev:docs:create" },
                    { "label": "dev:docs:edit",         "value": "dev:docs:edit" },
                    { "label": "dev:docs:view",         "value": "dev:docs:view" },
                    { "label": "components:edit",   "value": "components:edit" },
                    { "label": "components:view",   "value": "components:view" },
                    { "label": "components:create", "value": "components:create" },
                    { "label": "jobs:view",         "value": "jobs:view" },
                    { "label": "jobs:submit",       "value": "jobs:submit" },
                    { "label": "tests:view",        "value": "tests:view" },
                    { "label": "tests:submit",      "value": "tests:submit" },
                    { "label": "docs:create",       "value": "docs:create" },
                    { "label": "docs:edit",         "value": "docs:edit" },
                    { "label": "docs:view",         "value": "docs:view" },
                  ]
                },
                "selectThreshold": 0.3,
                "key": "permissions",
                "type": "select",
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
          });

        $('tr.user_row').on('click',function(){
          form.submission = {
            data:{
            user_id: $(".user_id",this).text(),
            email: $(".email",this).text(),
            displayName: $(".displayname",this).text(),
            permissions: $(".permissions",this).text().split(','),
          }};
          $('#deleteButton').removeAttr('disabled');
        })
        
        $('#clearForm').on("click",()=>{
          form.submission={}
          $('#deleteButton').attr('disabled',true);
        });

        function postFail(res,statusCode,statusMsg){
          // On failure, add a failure message
          if(res.responseText && res.responseText.length>0) form.setAlert("danger",res.responseText);
          else                                              form.setAlert("danger",statusMsg + " ("+statusCode+")");
          //- alert("posting failed");
          form.emit('submitError');
          console.log("posting fail",res,statusCode,statusMsg);
        }

        $('#deleteButton').on('click',function(){
          if(form.submission.data.user_id)
            $.post("/json/m2mUser/delete",
              {
                user_id:form.submission.data.user_id,
              }).done(()=>{
                  form.emit('submitDone');
                  window.location.reload()
                })
                .fail(postFail);

        })

        // Register for the submit event to get the completed submission.
       form.on('submit', function(submission) {
          $('#creds').hide();
          $.post("/json/m2mUser",submission.data).done((creds)=>
          {
            form.emit('submitDone');
            $('#creds').show()
            $('#creds pre').text(JSON.stringify(creds,null,2));
          }).fail(postFail);
       });
        
       

    })