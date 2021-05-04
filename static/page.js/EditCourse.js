var builder_wizard = false

    var schema = {
        "components": [
          {
            "label": "courseId",
            "key": "courseId",
            "type": "hidden",
            "input": true,
            "tableView": false
          },
          {
            "label": "Course Name",
            "tableView": true,
            "validate": {
              "required": true
            },
            "key": "name",
            "type": "textfield",
            "input": true
          },
          {
            "label": "Columns",
            "columns": [
              {
                "components": [
                  {
                    "label": "Revised on",
                    "disabled": true,
                    "tableView": false,
                    "enableMinDateInput": false,
                    "datePicker": {
                      "disableWeekends": false,
                      "disableWeekdays": false
                    },
                    "enableMaxDateInput": false,
                    "key": "insertion.insertDate",
                    "type": "datetime",
                    "input": true,
                    "widget": {
                      "type": "calendar",
                      "displayInTimezone": "viewer",
                      "locale": "en",
                      "useLocaleSettings": false,
                      "allowInput": true,
                      "mode": "single",
                      "enableTime": true,
                      "noCalendar": false,
                      "format": "yyyy-MM-dd hh:mm a",
                      "hourIncrement": 1,
                      "minuteIncrement": 1,
                      "time_24hr": false,
                      "minDate": null,
                      "disableWeekends": false,
                      "disableWeekdays": false,
                      "maxDate": null
                    },
                    "hideOnChildrenHidden": false
                  }
                ],
                "width": 3,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "size": "md"
              },
              {
                "components": [
                  {
                    "label": "Version",
                    "mask": false,
                    "spellcheck": true,
                    "disabled": true,
                    "tableView": false,
                    "delimiter": false,
                    "requireDecimal": false,
                    "inputFormat": "plain",
                    "key": "validity.version",
                    "type": "number",
                    "input": true,
                    "hideOnChildrenHidden": false
                  }
                ],
                "width": 3,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "size": "md"
              },
              {
                "components": [
                  {
                    "label": "Last Revised By",
                    "disabled": true,
                    "tableView": true,
                    "key": "insertion.user.displayName",
                    "type": "textfield",
                    "input": true,
                    "hideOnChildrenHidden": false
                  }
                ],
                "size": "md",
                "width": 3,
                "offset": 0,
                "push": 0,
                "pull": 0
              },
              {
                "components": [
                  {
                    "label": "Form goes live on",
                    "tableView": false,
                    "enableMinDateInput": false,
                    "datePicker": {
                      "disableWeekends": false,
                      "disableWeekdays": false
                    },
                    "enableMaxDateInput": false,
                    "key": "validity.startDate",
                    "type": "datetime",
                    "input": true,
                    "widget": {
                      "type": "calendar",
                      "displayInTimezone": "viewer",
                      "locale": "en",
                      "useLocaleSettings": false,
                      "allowInput": true,
                      "mode": "single",
                      "enableTime": true,
                      "noCalendar": false,
                      "format": "yyyy-MM-dd hh:mm a",
                      "hourIncrement": 1,
                      "minuteIncrement": 1,
                      "time_24hr": false,
                      "minDate": null,
                      "disableWeekends": false,
                      "disableWeekdays": false,
                      "maxDate": null
                    },
                    "hideOnChildrenHidden": false
                  }
                ],
                "size": "md",
                "width": 3,
                "offset": 0,
                "push": 0,
                "pull": 0
              }
            ],
            "tableView": false,
            "key": "columns",
            "type": "columns",
            "input": false
          },
          {
            "label": "Columns",
            "tableView": false,
            "key": "columns",
            "type": "columns",
            "input": false,
            "columns": [
              {
                "components": [
                  {
                    "label": "Icon",
                    "tooltip": "A small icon to represent this component. Should be clean and simple. A good source is The Noun Project.",
                    "tableView": false,
                    "image": true,
                    "webcam": false,
                    "fileTypes": [
                      {
                        "label": "",
                        "value": ""
                      }
                    ],
                    "fileMaxSize": "50KB",
                    "key": "icon",
                    "type": "file",
                    "imageSize": "50",
                    "input": true,
                    "hideOnChildrenHidden": false
                  }
                ],
                "width": 6,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "size": "md"
              },
              {
                "components": [
                  {
                    "label": "Tags",
                    "placeholder": "categories",
                    "tooltip": "Categories of forms or workflows this component relates to",
                    "tableView": false,
                    "storeas": "array",
                    "key": "tags",
                    "type": "tags",
                    "input": true,
                    "hideOnChildrenHidden": false
                  }
                ],
                "width": 6,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "size": "md"
              }
            ]
          },
          {
            "label": "ComponentType",
            "tableView": true,
            "dataSrc": "url",
            "data": {
              "values": [
                {
                  "label": "",
                  "value": ""
                }
              ],
              "url": "/json/componentForms/list",
              "headers": [
                {
                  "key": "",
                  "value": ""
                }
              ]
            },
            "idPath": "formId",
            "valueProperty": "formId",
            "template": "<span>{{ item.formName }}</span>",
            "selectThreshold": 0.3,
            "validate": {
              "required": true,
              "onlyAvailableItems": false
            },
            "key": "componentType",
            "type": "select",
            "indexeddb": {
              "filter": {}
            },
            "input": true,
            "disableLimit": false
          },
          {
            "label": "Description",
            "autoExpand": false,
            "tableView": true,
            "key": "description",
            "type": "textarea",
            "input": true
          },
          {
            "label": "Path",
            "reorder": true,
            "addAnother": "Add Step",
            "addAnotherPosition": "bottom",
            "layoutFixed": false,
            "enableRowGroups": false,
            "initEmpty": false,
            "tableView": false,
            "defaultValue": [
              {
                "type": "",
                "formId": "",
                "advice": ""
              }
            ],
            "key": "path",
            "type": "datagrid",
            "defaultOpen": false,
            "input": true,
            "components": [
              {
                "label": "Type",
                "widget": "choicesjs",
                "tableView": true,
                "data": {
                  "values": [
                    {
                      "label": "Component",
                      "value": "component"
                    },
                    {
                      "label": "Workflow",
                      "value": "job"
                    },
                    {
                      "label": "Test",
                      "value": "test"
                    }
                  ]
                },
                "selectThreshold": 0.3,
                "validate": {
                  "required": true,
                  "onlyAvailableItems": false
                },
                "key": "type",
                "type": "select",
                "indexeddb": {
                  "filter": {}
                },
                "input": true,
                "defaultValue": "test"
              },
              {
                "label": "Form ID",
                "widget": "choicesjs",
                "tableView": true,
                "dataSrc": "url",
                "data": {
                  "values": [
                    {
                      "label": "",
                      "value": ""
                    }
                  ],
                  "url": "/json/{{row.type}}Forms/list",
                  "headers": [
                    {
                      "key": "",
                      "value": ""
                    }
                  ]
                },
                "dataType": "string",
                "idPath": "formId",
                "valueProperty": "formId",
                "template": "<span>{{ item.formName }} [{{ item.formId }}]</span>",
                "refreshOn": "path.type",
                "clearOnRefresh": true,
                "selectThreshold": 0.3,
                "validate": {
                  "required": true,
                  "onlyAvailableItems": false
                },
                "key": "formId",
                "type": "select",
                "indexeddb": {
                  "filter": {}
                },
                "input": true,
                "disableLimit": false
              },
              {
                "label": "Identifier",
                "placeholder": "data.name_of_uuid_field",
                "tooltip": "For 'workflow' type: the dot-notation data path to the UUID number of the component",
                "tableView": true,
                "key": "identifier",
                "customConditional": "show = (row.type==\"component\") || (row.type==\"job\");",
                "type": "textfield",
                "input": true
              },
              {
                "label": "Advice",
                "editor": "quill",
                "autoExpand": false,
                "tableView": true,
                "modalEdit": true,
                "defaultValue": "<p><br></p>",
                "key": "advice",
                "type": "textarea",
                "as": "html",
                "input": true,
                "isUploadEnabled": false
              }
            ]
          }
        ]
      }



    var form = null;
    var lastDraftSave = new Date();


    function SubmitData(submission) {
      try{
      // actually the 'submit' function
      var draft = submission.state !== "submitted";
      
      // Include relevant information about the form, for later retrieval
      submission.data.courseId = courseId; // MUST be in submission.

      console.log("SubmitData",...arguments);

      function postSuccess(retval) {
          console.log('postSuccess',retval);
          if((retval.error)) {
            form.setAlert("warning",retval.error);
            form.emit('submitError');
          }

          if(!draft) { 
            schemaRecordChange(retval);
            form.emit('submitDone');
            // go to completed form. Do not leave this page in browser history. 
          } else {
            // Update the draftid.
            form.submission.data._id = retval;

            lastDraftSave = new Date();

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
      console.log("submitting data",submission.data, JSON.stringify(submission));
      $.ajax(
        { contentType: "application/json",
          method: "post",
          url: '/json/course/'+courseId,
          data: JSON.stringify(submission.data),
          dataType: "json",
          success: postSuccess
        }
        ).fail(postFail);

      } catch (e) {
        console.error(e);
        debugger;
      }
    };

    function schemaRecordChange(course) {
        console.log("schemaRecordChange",course);
        gcourse = course;

        if(((course||{}).validity)||{}.version>0) course.validity.version+=1;

        // If the start date is in the past, make the new start date 'now'
        if(course.validity && moment(course.validity.startDate).isBefore(moment())) 
          course.validity.startDate = moment().toISOString();

        // If no form title, autofill with the form ID
        if(!course.name || (course.name.length==0))
          course.name = course.courseId;

        // set.
        form.submission = {data: course};
    }

    // ----------- Setup
    window.onload = async function() {


      console.log("schema",schema);

      // Add draft and submit buttons.
      var append_to = schema;
      if(schema.display === 'wizard') append_to = schema.components[schema.components.length-1]; // last page.

      // Add save-as-draft button.
      if(!readOnly) {
        //- append_to.components.push({type:'button', action:"saveState", state: 'draft', theme: 'secondary', key:'saveAsDraft', label:'Save Draft'});
        
        // add submit button
        append_to.components.push({ type: "button",label: "Submit",key: "submit",disableOnInvalid: true,input: true,tableView: false
        });
      }


      // Remove submit button if it's read-only




      form = await Formio.createForm(
                  document.getElementById('builtform'),
                  schema,
                  { readOnly: readOnly,
                    buttonSettings: {showCancel: false, showSubmit: false}
                    //- saveDraft: true,
                    //- saveDraftThrottle: 1000
                  });
                  //- });
      //- form.url="https://nowhere.com";
      console.log(form);

      schemaRecordChange(course)

      if(!readOnly) {
        form.on('submit',SubmitData);
      }

    }