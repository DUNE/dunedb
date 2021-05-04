   var metaschema = {
      "components": [
      
        {
          "label": "Commit Form",
          "showValidations": false,
          "theme": "info",
          "disableOnInvalid": true,
          "tableView": false,
          "key": "submit",
          "type": "button",
          "input": true,
          "validate": {
            "unique": false,
            "multiple": false
          }
        },
        {
          "label": "formId",
          "key": "formId",
          "type": "hidden",
          "input": true,
          "tableView": false,
          "validate": {
            "unique": false,
            "multiple": false
          }
        },
        {
          "label": "Form Name",
          "spellcheck": true,
          "tableView": true,
          "validate": {
            "unique": false,
            "required": true,
            "multiple": false
          },
          "key": "formName",
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
                                "language": "en",
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
                                "language": "en",
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
          "width": 4,
          "offset": 0,
          "push": 0,
          "pull": 0,
          "size": "md"
          },
          {
          "components": [
            {
              "label": "Component Types",
              "widget": "choicesjs",
              //- "placeholder": "default: applies to all component types",
              "tooltip": "Select the component types this form will apply to. Leave to apply to all.",
              "description":"If left blank, this form applies to all components.",
              "tableView": true,
              "multiple": true,
              "dataSrc": "url",
              "data": {
                "values": [
                  {
                    "label": "",
                    "value": ""
                  }
                ],
                "url": "/json/componentTypesTags",
                "headers": [
                  {
                    "key": "",
                    "value": ""
                  }
                ]
              },
              "valueProperty": "formId",
              "template": "<span>{{ item.formId }}</span>",
              "selectThreshold": 0.3,
              "validate": {
                "multiple": true
              },
              "key": "componentTypes",
              "type": "select",
              "indexeddb": {
                "filter": {}
              }
            }
          ],
          "width": 4,
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
            "tooltip": "Categories of forms or workflows this component relates to. Use Trash tag to delete from view.",
            "tableView": false,
            "storeas": "array",
            "key": "tags",
            "type": "tags",
            "input": true,
            }
          ],
          "width": 4,
          "offset": 0,
          "push": 0,
          "pull": 0,
          "size": "md"
          },
          ]
        },        
        {
          "label": "formbuilder",
          "tag": "div",
          "className": "formbuilder_area",
          "attrs": [
            {
              "attr": "",
              "value": ""
            }
          ],
          "refreshOnChange": false,
          "tableView": false,
          "key": "formbuilder",
          "type": "htmlelement",
          "input": false,
          "validate": {
            "unique": false,
            "multiple": false
          }
        },
        {
          "label": "schema",
          "key": "schema",
          "type": "hidden",
          "input": true,
          "tableView": false,
          "validate": {
            "unique": false,
            "multiple": false
          }
        },
        {     
            "title": "Post-entry processing",
            "collapsible": true,
            "tableView": false,
            
            "key": "postEntryProcessing",
            "type": "panel",
            "label": "Panel",
            "input": false,
            "components": [
                 {
                    "html": "<p>See notes at <a href=\"/docs/processing.md\">/docs/processing.md</a></p>",
                    "label": "Process Notes",
                    "refreshOnChange": false,
                    "tableView": false,
                    "key": "processNotes",
                    "type": "content",
                    "input": false
                  },
                  {
                    "label": "Processes",
                    "keyLabel": "Process ID",
                    "addAnother": "Add a process",
                    "hideLabel": true,
                    "tableView": false,
                    "key": "processes",
                    "type": "datamap",
                    "input": true,
                    "valueComponent": {
                      "input": true,
                      "key": "key",
                      "tableView": true,
                      "label": "Algorithm",
                      "rows": 20,
                      "hideLabel": true,
                      "type": "textarea",
                     "customClass": "fixed-width-textarea",
                      "modalEdit": true
                    }
                  },                 
            ],
            "collapsed": true
        },
        {
          "label": "Commit Form",
          "showValidations": false,
          "theme": "info",
          "disableOnInvalid": true,
          "tableView": false,
          "key": "submit",
          "type": "button",
          "input": true,
          "validate": {
            "unique": false,
            "multiple": false
          }
        }
      ]
    };