// Set up the schema for the QC signoffs
function SetSection_qcSignoffs(frameConstr, framePrep, layer_x, layer_v, layer_u, layer_g, coverCaps, shippingPrep, completedAPA) {
  const frameIntakeSurveys_link = (frameConstr.intakeSurveysID !== '' ? `<a href = '/action/${frameConstr.intakeSurveysID}' > Frame Intake Surveys </a>` : `[Frame Intake Surveys not found]`);
  const frameInstallSurveys_link = (frameConstr.installSurveysID !== '' ? `<a href = '/action/${frameConstr.installSurveysID}' > Frame Installation Surveys </a>` : `[Frame Installation Surveys not found]`);

  const meshInstall_link = (framePrep.meshInstallID !== '' ? `<a href = '/action/${framePrep.meshInstallID}' > Mesh Panel Installation Details </a>` : `[Mesh Panel Installation not found]`);
  const rtdInstall_link = (framePrep.rtdInstallID !== '' ? `<a href = '/action/${framePrep.rtdInstallID}' > PD & RTD Installation Details </a>` : `[PD & RTD Installation not found]`);

  const xWinding_link = (layer_x.windingID !== '' ? `<a href = '/action/${layer_x.windingID}' > Winding Details </a>` : `[Winding Details not found]`);
  const xSoldering_link = (layer_x.solderingID !== '' ? `<a href = '/action/${layer_x.solderingID}' > Soldering Details </a>` : `[Soldering Details not found]`);
  const xTensions_link = (layer_x.tensionsID !== '' ? `<a href = '/action/${layer_x.tensionsID}' > Tension Measurements </a>` : `[Tension Measurements not found]`);

  const vWinding_link = (layer_v.windingID !== '' ? `<a href = '/action/${layer_v.windingID}' > Winding Details </a>` : `[Winding Details not found]`);
  const vSoldering_link = (layer_v.solderingID !== '' ? `<a href = '/action/${layer_v.solderingID}' > Soldering Details </a>` : `[Soldering Details not found]`);
  const vTensions_link = (layer_v.tensionsID !== '' ? `<a href = '/action/${layer_v.tensionsID}' > Tension Measurements </a>` : `[Tension Measurements not found]`);

  const uWinding_link = (layer_u.windingID !== '' ? `<a href = '/action/${layer_u.windingID}' > Winding Details </a>` : `[Winding Details not found]`);
  const uSoldering_link = (layer_u.solderingID !== '' ? `<a href = '/action/${layer_u.solderingID}' > Soldering Details </a>` : `[Soldering Details not found]`);
  const uTensions_link = (layer_u.tensionsID !== '' ? `<a href = '/action/${layer_u.tensionsID}' > Tension Measurements </a>` : `[Tension Measurements not found]`);

  const gWinding_link = (layer_g.windingID !== '' ? `<a href = '/action/${layer_g.windingID}' > Winding Details </a>` : `[Winding Details not found]`);
  const gSoldering_link = (layer_g.solderingID !== '' ? `<a href = '/action/${layer_g.solderingID}' > Soldering Details </a>` : `[Soldering Details not found]`);
  const gTensions_link = (layer_g.tensionsID !== '' ? `<a href = '/action/${layer_g.tensionsID}' > Tension Measurements </a>` : `[Tension Measurements not found]`);

  const panelInstall_link = (shippingPrep.panelInstallID !== '' ? `<a href = '/action/${shippingPrep.panelInstallID}' > Protection Panel Details </a>` : `[Protection Panel Details not found]`);
  const conduitInstall_link = (shippingPrep.conduitInstallID !== '' ? `<a href = '/action/${shippingPrep.conduitInstallID}' > Cable Conduit Details </a>` : `[Cable Conduit Details not found]`);

  const schema_qcSignoffs = {
    "components": [
      {
        "label": "QC Signoffs",
        "hideLabel": true,
        "tableView": true,
        "defaultValue": "QC Signoffs",
        "key": "qcSignoffs",
        "type": "textfield",
        "input": false
      },
      {
        "label": "Frame Construction",
        "reorder": false,
        "addAnotherPosition": "bottom",
        "layoutFixed": false,
        "enableRowGroups": false,
        "initEmpty": false,
        "tableView": false,
        "key": "grid_frameConstr",
        "type": "datagrid",
        "input": false,
        "components": [
          {
            "label": "Columns",
            "columns": [
              {
                "components": [
                  {
                    "label": "Name:",
                    "labelPosition": "left-left",
                    "labelWidth": 10,
                    "tableView": true,
                    "key": "frameConstr_name",
                    "type": "textfield",
                    "input": false,
                    "defaultValue": frameConstr.name
                  }
                ],
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "size": "sm",
                "currentWidth": 2
              },
              {
                "components": [
                  {
                    "label": "Date:",
                    "labelPosition": "left-left",
                    "labelWidth": 10,
                    "tableView": false,
                    "enableMinDateInput": false,
                    "datePicker": {
                      "disableWeekends": false,
                      "disableWeekdays": false
                    },
                    "enableMaxDateInput": false,
                    "key": "frameConstr_date",
                    "type": "datetime",
                    "input": false,
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
                    "defaultValue": frameConstr.date
                  }
                ],
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "size": "sm",
                "currentWidth": 2
              },
              {
                "components": [],
                "size": "sm",
                "width": 1,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 1
              },
              {
                "components": [
                  {
                    "label": "Frame Intake Surveys",
                    "attrs": [
                      {
                        "attr": "",
                        "value": ""
                      }
                    ],
                    "refreshOnChange": false,
                    "key": "frameConstr_intakeSurveys",
                    "type": "htmlelement",
                    "input": false,
                    "tableView": false,
                    "content": `${frameIntakeSurveys_link}<br></br>`
                  }
                ],
                "size": "sm",
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 2
              },
              {
                "components": [
                  {
                    "label": "Frame Installation Surveys",
                    "attrs": [
                      {
                        "attr": "",
                        "value": ""
                      }
                    ],
                    "refreshOnChange": false,
                    "key": "frameConstr_installSurveys",
                    "type": "htmlelement",
                    "input": false,
                    "tableView": false,
                    "content": `${frameInstallSurveys_link}<br></br>`
                  }
                ],
                "size": "sm",
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 2
              },
              {
                "components": [],
                "size": "sm",
                "width": 3,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 3
              }
            ],
            "hideLabel": true,
            "key": "columns",
            "type": "columns",
            "input": false,
            "tableView": false
          }
        ]
      },
      {
        "label": "Frame Preparation",
        "reorder": false,
        "addAnotherPosition": "bottom",
        "layoutFixed": false,
        "enableRowGroups": false,
        "initEmpty": false,
        "tableView": false,
        "key": "grid_framePrep",
        "type": "datagrid",
        "input": false,
        "components": [
          {
            "label": "Columns",
            "columns": [
              {
                "components": [
                  {
                    "label": "Name:",
                    "labelPosition": "left-left",
                    "labelWidth": 10,
                    "tableView": true,
                    "key": "framePrep_name",
                    "type": "textfield",
                    "input": false,
                    "defaultValue": framePrep.name
                  }
                ],
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "size": "sm",
                "currentWidth": 2
              },
              {
                "components": [
                  {
                    "label": "Date:",
                    "labelPosition": "left-left",
                    "labelWidth": 10,
                    "tableView": false,
                    "enableMinDateInput": false,
                    "datePicker": {
                      "disableWeekends": false,
                      "disableWeekdays": false
                    },
                    "enableMaxDateInput": false,
                    "key": "framePrep_date",
                    "type": "datetime",
                    "input": false,
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
                    "defaultValue": framePrep.date
                  }
                ],
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "size": "sm",
                "currentWidth": 2
              },
              {
                "components": [],
                "size": "sm",
                "width": 1,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 1
              },
              {
                "components": [
                  {
                    "label": "Mesh Panel Installation Details",
                    "attrs": [
                      {
                        "attr": "",
                        "value": ""
                      }
                    ],
                    "refreshOnChange": false,
                    "key": "framePrep_meshInstall",
                    "type": "htmlelement",
                    "input": false,
                    "tableView": false,
                    "content": `${meshInstall_link}<br></br>`
                  }
                ],
                "size": "sm",
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 2
              },
              {
                "components": [
                  {
                    "label": "PD & RTD Installation Details",
                    "attrs": [
                      {
                        "attr": "",
                        "value": ""
                      }
                    ],
                    "refreshOnChange": false,
                    "key": "framePrep_rtdInstall",
                    "type": "htmlelement",
                    "input": false,
                    "tableView": false,
                    "content": `${rtdInstall_link}<br></br>`
                  }
                ],
                "size": "sm",
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 2
              },
              {
                "components": [],
                "size": "sm",
                "width": 3,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 3
              }
            ],
            "hideLabel": true,
            "key": "columns",
            "type": "columns",
            "input": false,
            "tableView": false
          }
        ]
      },
      {
        "label": "X Layer Assembly",
        "reorder": false,
        "addAnotherPosition": "bottom",
        "layoutFixed": false,
        "enableRowGroups": false,
        "initEmpty": false,
        "tableView": false,
        "key": "grid_xLayer",
        "type": "datagrid",
        "input": false,
        "components": [
          {
            "label": "Columns",
            "columns": [
              {
                "components": [
                  {
                    "label": "Name:",
                    "labelPosition": "left-left",
                    "labelWidth": 10,
                    "tableView": true,
                    "key": "xLayer_name",
                    "type": "textfield",
                    "input": false,
                    "defaultValue": layer_x.name
                  }
                ],
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "size": "sm",
                "currentWidth": 2
              },
              {
                "components": [
                  {
                    "label": "Date:",
                    "labelPosition": "left-left",
                    "labelWidth": 10,
                    "tableView": false,
                    "enableMinDateInput": false,
                    "datePicker": {
                      "disableWeekends": false,
                      "disableWeekdays": false
                    },
                    "enableMaxDateInput": false,
                    "key": "xLayer_date",
                    "type": "datetime",
                    "input": false,
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
                    "defaultValue": layer_x.date
                  }
                ],
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "size": "sm",
                "currentWidth": 2
              },
              {
                "components": [],
                "size": "sm",
                "width": 1,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 1
              },
              {
                "components": [
                  {
                    "label": "Winding Details",
                    "attrs": [
                      {
                        "attr": "",
                        "value": ""
                      }
                    ],
                    "refreshOnChange": false,
                    "key": "xLayer_winding",
                    "type": "htmlelement",
                    "input": false,
                    "tableView": false,
                    "content": `${xWinding_link}<br></br>`
                  }
                ],
                "size": "sm",
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 2
              },
              {
                "components": [
                  {
                    "label": "Soldering Details",
                    "attrs": [
                      {
                        "attr": "",
                        "value": ""
                      }
                    ],
                    "refreshOnChange": false,
                    "key": "xLayer_soldering",
                    "type": "htmlelement",
                    "input": false,
                    "tableView": false,
                    "content": `${xSoldering_link}<br></br>`
                  }
                ],
                "size": "sm",
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 2
              },
              {
                "components": [
                  {
                    "label": "Tension Measurements",
                    "attrs": [
                      {
                        "attr": "",
                        "value": ""
                      }
                    ],
                    "refreshOnChange": false,
                    "key": "xLayer_tensions",
                    "type": "htmlelement",
                    "input": false,
                    "tableView": false,
                    "content": `${xTensions_link}<br></br>`
                  }
                ],
                "size": "sm",
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 2
              },
              {
                "components": [],
                "size": "sm",
                "width": 1,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 1
              }
            ],
            "hideLabel": true,
            "key": "columns",
            "type": "columns",
            "input": false,
            "tableView": false
          }
        ]
      },
      {
        "label": "V Layer Assembly",
        "reorder": false,
        "addAnotherPosition": "bottom",
        "layoutFixed": false,
        "enableRowGroups": false,
        "initEmpty": false,
        "tableView": false,
        "key": "grid_vLayer",
        "type": "datagrid",
        "input": false,
        "components": [
          {
            "label": "Columns",
            "columns": [
              {
                "components": [
                  {
                    "label": "Name:",
                    "labelPosition": "left-left",
                    "labelWidth": 10,
                    "tableView": true,
                    "key": "vLayer_name",
                    "type": "textfield",
                    "input": false,
                    "defaultValue": layer_v.name
                  }
                ],
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "size": "sm",
                "currentWidth": 2
              },
              {
                "components": [
                  {
                    "label": "Date:",
                    "labelPosition": "left-left",
                    "labelWidth": 10,
                    "tableView": false,
                    "enableMinDateInput": false,
                    "datePicker": {
                      "disableWeekends": false,
                      "disableWeekdays": false
                    },
                    "enableMaxDateInput": false,
                    "key": "vLayer_date",
                    "type": "datetime",
                    "input": false,
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
                    "defaultValue": layer_v.date
                  }
                ],
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "size": "sm",
                "currentWidth": 2
              },
              {
                "components": [],
                "size": "sm",
                "width": 1,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 1
              },
              {
                "components": [
                  {
                    "label": "Winding Details",
                    "attrs": [
                      {
                        "attr": "",
                        "value": ""
                      }
                    ],
                    "refreshOnChange": false,
                    "key": "vLayer_winding",
                    "type": "htmlelement",
                    "input": false,
                    "tableView": false,
                    "content": `${vWinding_link}<br></br>`
                  }
                ],
                "size": "sm",
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 2
              },
              {
                "components": [
                  {
                    "label": "Soldering Details",
                    "attrs": [
                      {
                        "attr": "",
                        "value": ""
                      }
                    ],
                    "refreshOnChange": false,
                    "key": "vLayer_soldering",
                    "type": "htmlelement",
                    "input": false,
                    "tableView": false,
                    "content": `${vSoldering_link}<br></br>`
                  }
                ],
                "size": "sm",
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 2
              },
              {
                "components": [
                  {
                    "label": "Tension Measurements",
                    "attrs": [
                      {
                        "attr": "",
                        "value": ""
                      }
                    ],
                    "refreshOnChange": false,
                    "key": "vLayer_tensions",
                    "type": "htmlelement",
                    "input": false,
                    "tableView": false,
                    "content": `${vTensions_link}<br></br>`
                  }
                ],
                "size": "sm",
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 2
              },
              {
                "components": [],
                "size": "sm",
                "width": 1,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 1
              },
            ],
            "hideLabel": true,
            "key": "columns",
            "type": "columns",
            "input": false,
            "tableView": false
          }
        ]
      },
      {
        "label": "U Layer Assembly",
        "reorder": false,
        "addAnotherPosition": "bottom",
        "layoutFixed": false,
        "enableRowGroups": false,
        "initEmpty": false,
        "tableView": false,
        "key": "grid_uLayer",
        "type": "datagrid",
        "input": false,
        "components": [
          {
            "label": "Columns",
            "columns": [
              {
                "components": [
                  {
                    "label": "Name:",
                    "labelPosition": "left-left",
                    "labelWidth": 10,
                    "tableView": true,
                    "key": "uLayer_name",
                    "type": "textfield",
                    "input": false,
                    "defaultValue": layer_u.name
                  }
                ],
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "size": "sm",
                "currentWidth": 2
              },
              {
                "components": [
                  {
                    "label": "Date:",
                    "labelPosition": "left-left",
                    "labelWidth": 10,
                    "tableView": false,
                    "enableMinDateInput": false,
                    "datePicker": {
                      "disableWeekends": false,
                      "disableWeekdays": false
                    },
                    "enableMaxDateInput": false,
                    "key": "uLayer_date",
                    "type": "datetime",
                    "input": false,
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
                    "defaultValue": layer_u.date
                  }
                ],
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "size": "sm",
                "currentWidth": 2
              },
              {
                "components": [],
                "size": "sm",
                "width": 1,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 1
              },
              {
                "components": [
                  {
                    "label": "Winding Details",
                    "attrs": [
                      {
                        "attr": "",
                        "value": ""
                      }
                    ],
                    "refreshOnChange": false,
                    "key": "uLayer_winding",
                    "type": "htmlelement",
                    "input": false,
                    "tableView": false,
                    "content": `${uWinding_link}<br></br>`
                  }
                ],
                "size": "sm",
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 2
              },
              {
                "components": [
                  {
                    "label": "Soldering Details",
                    "attrs": [
                      {
                        "attr": "",
                        "value": ""
                      }
                    ],
                    "refreshOnChange": false,
                    "key": "uLayer_soldering",
                    "type": "htmlelement",
                    "input": false,
                    "tableView": false,
                    "content": `${uSoldering_link}<br></br>`
                  }
                ],
                "size": "sm",
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 2
              },
              {
                "components": [
                  {
                    "label": "Tension Measurements",
                    "attrs": [
                      {
                        "attr": "",
                        "value": ""
                      }
                    ],
                    "refreshOnChange": false,
                    "key": "uLayer_tensions",
                    "type": "htmlelement",
                    "input": false,
                    "tableView": false,
                    "content": `${uTensions_link}<br></br>`
                  }
                ],
                "size": "sm",
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 2
              },
              {
                "components": [],
                "size": "sm",
                "width": 1,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 1
              }
            ],
            "hideLabel": true,
            "key": "columns",
            "type": "columns",
            "input": false,
            "tableView": false
          }
        ]
      },
      {
        "label": "G Layer Assembly",
        "reorder": false,
        "addAnotherPosition": "bottom",
        "layoutFixed": false,
        "enableRowGroups": false,
        "initEmpty": false,
        "tableView": false,
        "key": "grid_gLayer",
        "type": "datagrid",
        "input": false,
        "components": [
          {
            "label": "Columns",
            "columns": [
              {
                "components": [
                  {
                    "label": "Name:",
                    "labelPosition": "left-left",
                    "labelWidth": 10,
                    "tableView": true,
                    "key": "gLayer_name",
                    "type": "textfield",
                    "input": false,
                    "defaultValue": layer_g.name
                  }
                ],
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "size": "sm",
                "currentWidth": 2
              },
              {
                "components": [
                  {
                    "label": "Date:",
                    "labelPosition": "left-left",
                    "labelWidth": 10,
                    "tableView": false,
                    "enableMinDateInput": false,
                    "datePicker": {
                      "disableWeekends": false,
                      "disableWeekdays": false
                    },
                    "enableMaxDateInput": false,
                    "key": "gLayer_date",
                    "type": "datetime",
                    "input": false,
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
                    "defaultValue": layer_g.date
                  }
                ],
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "size": "sm",
                "currentWidth": 2
              },
              {
                "components": [],
                "size": "sm",
                "width": 1,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 1
              },
              {
                "components": [
                  {
                    "label": "Winding Details",
                    "attrs": [
                      {
                        "attr": "",
                        "value": ""
                      }
                    ],
                    "refreshOnChange": false,
                    "key": "gLayer_winding",
                    "type": "htmlelement",
                    "input": false,
                    "tableView": false,
                    "content": `${gWinding_link}<br></br>`
                  }
                ],
                "size": "sm",
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 2
              },
              {
                "components": [
                  {
                    "label": "Soldering Details",
                    "attrs": [
                      {
                        "attr": "",
                        "value": ""
                      }
                    ],
                    "refreshOnChange": false,
                    "key": "gLayer_soldering",
                    "type": "htmlelement",
                    "input": false,
                    "tableView": false,
                    "content": `${gSoldering_link}<br></br>`
                  }
                ],
                "size": "sm",
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 2
              },
              {
                "components": [
                  {
                    "label": "Tension Measurements",
                    "attrs": [
                      {
                        "attr": "",
                        "value": ""
                      }
                    ],
                    "refreshOnChange": false,
                    "key": "gLayer_tensions",
                    "type": "htmlelement",
                    "input": false,
                    "tableView": false,
                    "content": `${gTensions_link}<br></br>`
                  }
                ],
                "size": "sm",
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 2
              },
              {
                "components": [],
                "size": "sm",
                "width": 1,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 1
              }
            ],
            "hideLabel": true,
            "key": "columns",
            "type": "columns",
            "input": false,
            "tableView": false
          }
        ]
      },
      {
        "label": "Cover Board and Caps Installation",
        "reorder": false,
        "addAnotherPosition": "bottom",
        "layoutFixed": false,
        "enableRowGroups": false,
        "initEmpty": false,
        "tableView": false,
        "key": "grid_coverCaps",
        "type": "datagrid",
        "input": false,
        "components": [
          {
            "label": "Columns",
            "columns": [
              {
                "components": [
                  {
                    "label": "Name:",
                    "labelPosition": "left-left",
                    "labelWidth": 10,
                    "tableView": true,
                    "key": "coverCaps_name",
                    "type": "textfield",
                    "input": false,
                    "defaultValue": coverCaps.name
                  }
                ],
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "size": "sm",
                "currentWidth": 2
              },
              {
                "components": [
                  {
                    "label": "Date:",
                    "labelPosition": "left-left",
                    "labelWidth": 10,
                    "tableView": false,
                    "enableMinDateInput": false,
                    "datePicker": {
                      "disableWeekends": false,
                      "disableWeekdays": false
                    },
                    "enableMaxDateInput": false,
                    "key": "coverCaps_date",
                    "type": "datetime",
                    "input": false,
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
                    "defaultValue": coverCaps.date
                  }
                ],
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "size": "sm",
                "currentWidth": 2
              },
              {
                "components": [],
                "size": "sm",
                "width": 1,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 1
              },
              {
                "components": [
                  {
                    "label": "Spacer 1",
                    "attrs": [
                      {
                        "attr": "",
                        "value": ""
                      }
                    ],
                    "refreshOnChange": false,
                    "key": "spacer1",
                    "type": "htmlelement",
                    "input": false,
                    "tableView": false,
                    "content": `<br></br>`
                  }
                ],
                "size": "sm",
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 2
              },
              {
                "components": [],
                "size": "sm",
                "width": 5,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 5
              }
            ],
            "hideLabel": true,
            "key": "columns",
            "type": "columns",
            "input": false,
            "tableView": false
          }
        ]
      },
      {
        "label": "Shipping Preparation",
        "reorder": false,
        "addAnotherPosition": "bottom",
        "layoutFixed": false,
        "enableRowGroups": false,
        "initEmpty": false,
        "tableView": false,
        "key": "grid_shippingPrep",
        "type": "datagrid",
        "input": false,
        "components": [
          {
            "label": "Columns",
            "columns": [
              {
                "components": [
                  {
                    "label": "Name:",
                    "labelPosition": "left-left",
                    "labelWidth": 10,
                    "tableView": true,
                    "key": "shippingPrep_name",
                    "type": "textfield",
                    "input": false,
                    "defaultValue": shippingPrep.name
                  }
                ],
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "size": "sm",
                "currentWidth": 2
              },
              {
                "components": [
                  {
                    "label": "Date:",
                    "labelPosition": "left-left",
                    "labelWidth": 10,
                    "tableView": false,
                    "enableMinDateInput": false,
                    "datePicker": {
                      "disableWeekends": false,
                      "disableWeekdays": false
                    },
                    "enableMaxDateInput": false,
                    "key": "shippingPrep_date",
                    "type": "datetime",
                    "input": false,
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
                    "defaultValue": shippingPrep.date
                  }
                ],
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "size": "sm",
                "currentWidth": 2
              }, {
                "components": [],
                "size": "sm",
                "width": 1,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 1
              },
              {
                "components": [
                  {
                    "label": "Protection Panel Details",
                    "attrs": [
                      {
                        "attr": "",
                        "value": ""
                      }
                    ],
                    "refreshOnChange": false,
                    "key": "shippingPrep_panel",
                    "type": "htmlelement",
                    "input": false,
                    "tableView": false,
                    "content": `${panelInstall_link}<br></br>`
                  }
                ],
                "size": "sm",
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 2
              },
              {
                "components": [
                  {
                    "label": "Cable Conduit Details",
                    "attrs": [
                      {
                        "attr": "",
                        "value": ""
                      }
                    ],
                    "refreshOnChange": false,
                    "key": "shippingPrep_conduit",
                    "type": "htmlelement",
                    "input": false,
                    "tableView": false,
                    "content": `${conduitInstall_link}<br></br>`
                  }
                ],
                "size": "sm",
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 2
              },
              {
                "components": [],
                "size": "sm",
                "width": 3,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 3
              }
            ],
            "hideLabel": true,
            "key": "columns",
            "type": "columns",
            "input": false,
            "tableView": false
          }
        ]
      },
      {
        "label": "Completed APA",
        "reorder": false,
        "addAnotherPosition": "bottom",
        "layoutFixed": false,
        "enableRowGroups": false,
        "initEmpty": false,
        "tableView": false,
        "key": "grid_completedAPA",
        "type": "datagrid",
        "input": false,
        "components": [
          {
            "label": "Columns",
            "columns": [
              {
                "components": [
                  {
                    "label": "Name:",
                    "labelPosition": "left-left",
                    "labelWidth": 10,
                    "tableView": true,
                    "key": "completedAPA_name",
                    "type": "textfield",
                    "input": false,
                    "defaultValue": completedAPA.name
                  }
                ],
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "size": "sm",
                "currentWidth": 2
              },
              {
                "components": [
                  {
                    "label": "Date:",
                    "labelPosition": "left-left",
                    "labelWidth": 10,
                    "tableView": false,
                    "enableMinDateInput": false,
                    "datePicker": {
                      "disableWeekends": false,
                      "disableWeekdays": false
                    },
                    "enableMaxDateInput": false,
                    "key": "completedAPA_date",
                    "type": "datetime",
                    "input": false,
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
                    "defaultValue": completedAPA.date
                  }
                ],
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "size": "sm",
                "currentWidth": 2
              },
              {
                "components": [],
                "size": "sm",
                "width": 1,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 1
              },
              {
                "components": [
                  {
                    "label": "Spacer 2",
                    "attrs": [
                      {
                        "attr": "",
                        "value": ""
                      }
                    ],
                    "refreshOnChange": false,
                    "key": "spacer2",
                    "type": "htmlelement",
                    "input": false,
                    "tableView": false,
                    "content": `<br></br>`
                  }
                ],
                "size": "sm",
                "width": 2,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 2
              },
              {
                "components": [],
                "size": "sm",
                "width": 5,
                "offset": 0,
                "push": 0,
                "pull": 0,
                "currentWidth": 5
              }
            ],
            "hideLabel": true,
            "key": "columns",
            "type": "columns",
            "input": false,
            "tableView": false
          }
        ]
      },
    ]
  }

  return schema_qcSignoffs;
}

// Set up the schema for a single wire layer entry
function SetEntry_wireLayer(layer, layerInfo) {
  const schema_wireLayer = {
    components: [{
      label: `Wire Layer ${layer}`,
      key: 'wireLayer_layer',
      type: 'textfield',
      input: false,
      hideLabel: true,
      defaultValue: `Wire Layer ${layer}`,
    },
    {
      label: 'Columns',
      key: 'columns1',
      type: 'columns',
      input: false,
      columns: [{
        components: [{
          label: 'Winder:',
          key: 'wireLayer_winder',
          type: 'textfield',
          input: false,
          defaultValue: layerInfo.winder,
        }],
        width: 3,
        size: 'sm',
      },
      {
        components: [{
          label: 'Winder Head:',
          key: 'wireLayer_winderHead',
          type: 'textfield',
          input: false,
          defaultValue: layerInfo.winderHead,
        }],
        width: 3,
        size: 'sm',
      },
      {
        components: [{
          label: 'Winder Maintenance Signoff:',
          key: 'wireLayer_maintenanceSignoff',
          type: 'textfield',
          input: false,
          defaultValue: layerInfo.winderMaintenenceSignoff,
        }],
        width: 3,
        size: 'sm',
      },
      {
        components: [{
          label: 'Tension Control Signoff:',
          key: 'wireLayer_tensionControlSignoff',
          type: 'textfield',
          input: false,
          defaultValue: layerInfo.tensionControlSignoff,
        }],
        width: 3,
        size: 'sm',
      }],
    },
    {
      "components": [
        {
          "label": "Spacer 1",
          "attrs": [
            {
              "attr": "",
              "value": ""
            }
          ],
          "refreshOnChange": false,
          "key": "spacer1",
          "type": "htmlelement",
          "input": false,
          "tableView": false,
          "content": `<br></br>`
        }
      ],
      "size": "sm",
      "width": 12,
      "offset": 0,
      "push": 0,
      "pull": 0,
      "currentWidth": 12
    },
    {
      label: 'Columns',
      key: 'columns2',
      type: 'columns',
      input: false,
      columns: [{
        components: [{
          label: 'Wire Bobbin Manufacturer(s)',
          key: 'bobbinManufacturer',
          type: 'textfield',
          input: false,
          defaultValue: layerInfo.bobbinManufacturers,
        }],
        width: 2,
        size: 'sm',
      },
      {
        components: [{
          label: 'Number of Replaced Wires',
          key: 'wireLayer_numberOfReplacedWires',
          type: 'number',
          input: false,
          inputFormat: 'plain',
          defaultValue: layerInfo.numberOfReplacedWires,
        }],
        width: 2,
        size: 'sm',
      },
      {
        components: [{
          label: 'Number of Bad Solders',
          key: 'wireLayer_numberOfBadSolders',
          type: 'number',
          input: false,
          inputFormat: 'plain',
          defaultValue: layerInfo.numberOfBadSolders,
        }],
        width: 2,
        size: 'sm',
      },
      {
        components: [{
          label: 'Number of Tension Alarms',
          key: 'wireLayer_numberOfTensionAlarms',
          type: 'number',
          input: false,
          inputFormat: 'plain',
          defaultValue: layerInfo.numberOfTensionAlarms,
        }],
        width: 2,
        size: 'sm',
      },
      {
        components: [{
          label: 'Tension Measurements System',
          key: 'tensions_system',
          type: 'textfield',
          input: false,
          defaultValue: layerInfo.tensions_system,
        }],
        width: 2,
        size: 'sm',
      },
      {
        components: [{
          label: 'Tension Measurements Location',
          key: 'tensions_location',
          type: 'textfield',
          input: false,
          defaultValue: layerInfo.tensions_location,
        }],
        width: 2,
        size: 'sm',
      }],
    },
    {
      "components": [
        {
          "label": "Spacer 2",
          "attrs": [
            {
              "attr": "",
              "value": ""
            }
          ],
          "refreshOnChange": false,
          "key": "spacer2",
          "type": "htmlelement",
          "input": false,
          "tableView": false,
          "content": `<br></br>`
        }
      ],
      "size": "sm",
      "width": 12,
      "offset": 0,
      "push": 0,
      "pull": 0,
      "currentWidth": 12
    },
    {
      components: [{
        label: 'Tension Measurements (Side A)',
        key: 'tensionMeasurements_A',
        type: 'TensionPlots',
        input: false,
        units: 'Tension [N]',
        specification_nominal: 6.25,
        specification_toleranceInner: 2.25,
        axis_limitLower: 3.5,
        axis_limitUpper: 9.0,
        defaultValue: layerInfo.tensions_A
      }]
    },
    {
      components: [{
        label: 'Tension Measurements (Side B)',
        key: 'tensionMeasurements_B',
        type: 'TensionPlots',
        input: false,
        units: 'Tension [N]',
        specification_nominal: 6.25,
        specification_toleranceInner: 2.25,
        axis_limitLower: 3.5,
        axis_limitUpper: 9.0,
        defaultValue: layerInfo.tensions_B
      }]
    }],
  }

  return schema_wireLayer;
}

// Set up the schema for the wire-related non-conformance section header
function SetEntry_apaNCRs_header() {
  const schema_apaNCRs_header = {
    components: [{
      label: 'Assembled APA - Wire Non-Conformances',
      key: 'apaNCRs_wires',
      type: 'textfield',
      input: false,
      hideLabel: true,
      defaultValue: 'Assembled APA - Wire Non-Conformances',
    }],
  }

  return schema_apaNCRs_header;
}


// Set up the schema for a single wire-related non-conformance entry
function SetEntry_apaNCRs_wires(ncrInfo) {
  const schema_apaNCRs_wires = {
    components: [{
      label: 'Columns',
      key: 'columns',
      type: 'columns',
      input: false,
      columns: [{
        components: [{
          key: 'apaNCRs_wires_actionId',
          type: 'htmlelement',
          input: false,
          content: `<p><br> <a href = '/action/${ncrInfo.actionId}' > DB Page </a> </br></p>`,
        }],
        width: 1,
        size: 'sm',
      },
      {
        components: [{
          label: 'Type:',
          key: 'apaNCRs_wires_type',
          type: 'textfield',
          input: false,
          defaultValue: ncrInfo.type,
        }],
        width: 2,
        size: 'sm',
      },
      {
        components: [{
          label: 'Layer & Side:',
          key: 'apaNCRs_wires_layerSide',
          type: 'textfield',
          input: false,
          defaultValue: ncrInfo.layerSide,
        }],
        width: 1,
        size: 'sm',
      },
      {
        components: [{
          label: 'Head Board & Pad:',
          key: 'apaNCRs_wires_boardPad',
          type: 'textfield',
          input: false,
          defaultValue: ncrInfo.boardPad,
        }],
        width: 2,
        size: 'sm',
      },
      {
        components: [{
          label: 'Endpoints:',
          key: 'apaNCRs_wires_endpoints',
          type: 'textfield',
          input: false,
          defaultValue: ncrInfo.endpoints,
        }],
        width: 2,
        size: 'sm',
      },
      {
        components: [{
          label: 'Offline Channel:',
          key: 'apaNCRs_wires_offlineChannel',
          type: 'textfield',
          input: false,
          defaultValue: ncrInfo.offlineChannel,
        }],
        width: 2,
        size: 'sm',
      },
      {
        components: [{
          label: 'FEMB-ASIC-ASIC Channel:',
          key: 'apaNCRs_wires_fembChannel',
          type: 'textfield',
          input: false,
          defaultValue: ncrInfo.fembChannel,
        }],
        width: 2,
        size: 'sm',
      }],
    }]
  }

  return schema_apaNCRs_wires;
}

// Set up the schema for the other non-conformance section header
function SetEntry_otherNCRs_header() {
  const schema_otherNCRs_header = {
    components: [{
      label: 'Other Non-Conformances',
      key: 'otherNCRs',
      type: 'textfield',
      input: false,
      hideLabel: true,
      defaultValue: 'Other Non-Conformances',
    }],
  }

  return schema_otherNCRs_header;
}


// Set up the schema for a single non-wire non-conformance entry
function SetEntry_otherNCRs(ncrInfo) {
  const schema_otherNCRs = {
    components: [{
      label: 'Columns',
      key: 'columns',
      type: 'columns',
      input: false,
      columns: [{
        components: [{
          label: 'Component:',
          labelPosition: 'left-left',
          key: 'otherNCRs_component',
          type: 'textfield',
          labelWidth: 25,
          labelMargin: 5,
          input: false,
          defaultValue: ncrInfo.component,
        },
        {
          label: 'Type:',
          labelPosition: 'left-left',
          key: 'otherNCRs_type',
          type: 'textfield',
          labelWidth: 15,
          labelMargin: 5,
          input: false,
          defaultValue: ncrInfo.type,
        },
        {
          key: 'otherNCRs_actionId',
          type: 'htmlelement',
          input: false,
          content: `<p> <a href = '/action/${ncrInfo.actionId}' > DB Page </a> </p>`,
        }],
        width: 3,
        size: 'sm',
      },
      {
        components: [{
          label: 'Description:',
          labelPosition: 'left-left',
          autoExpand: true,
          key: 'otherNCRs_description',
          type: 'textarea',
          labelWidth: 12,
          labelMargin: 1,
          input: false,
          defaultValue: ncrInfo.description,
        }],
        width: 9,
        size: 'sm',
      }],
    }]
  }

  return schema_otherNCRs;
}

// Run a specific function when the page is loaded
window.addEventListener('load', populateExecutiveSummary);


// Function to run when the page is loaded
async function populateExecutiveSummary() {
  console.log(collatedInfo);

  // Render forms for the QC signoffs
  $('div.entry_qcSignoffs').each(function () {
    const form_qcSignoffs = $('.form_qcSignoffs', this);
    const signoffInfo = form_qcSignoffs.data('record');
    const schema_qcSignoffs = SetSection_qcSignoffs(signoffInfo[0], signoffInfo[1], signoffInfo[2], signoffInfo[3], signoffInfo[4], signoffInfo[5], signoffInfo[6], signoffInfo[7], signoffInfo[8]);

    Formio.createForm(form_qcSignoffs[0], schema_qcSignoffs, { readOnly: true, });
  })

  // Render forms for the wire layers
  $('div.entry_wireLayers').each(function () {
    const form_wireLayers = $('.form_wireLayers', this);
    const layerInfo = form_wireLayers.data('record');
    const schema_wireLayers = SetEntry_wireLayer(layerInfo[0], layerInfo[1])

    Formio.createForm(form_wireLayers[0], schema_wireLayers, { readOnly: true, });
  })

  // Render the assembled APA wire-related non-conformances section header
  $('div.entry_apaNCRs_header').each(function () {
    const form_apaNCRs_header = $('.form_apaNCRs_header', this);
    const schema_apaNCRs_header = SetEntry_apaNCRs_header()

    Formio.createForm(form_apaNCRs_header[0], schema_apaNCRs_header, { readOnly: true, });
  })

  // Render forms for the assembled APA wire-related non-conformances
  $('div.entry_apaNCRs_wires').each(function () {
    const form_apaNCRs_wires = $('.form_apaNCRs_wires', this);
    const ncrInfo = form_apaNCRs_wires.data('record');
    const schema_apaNCRs_wires = SetEntry_apaNCRs_wires(ncrInfo[0])

    Formio.createForm(form_apaNCRs_wires[0], schema_apaNCRs_wires, { readOnly: true, });
  })

  // Render the other non-conformances section header
  $('div.entry_otherNCRs_header').each(function () {
    const form_otherNCRs_header = $('.form_otherNCRs_header', this);
    const schema_otherNCRs_header = SetEntry_otherNCRs_header()

    Formio.createForm(form_otherNCRs_header[0], schema_otherNCRs_header, { readOnly: true, });
  })

  // Render forms for the other non-conformances ... covering non wire-related assembled APA, frame and mesh panel NCRs
  $('div.entry_otherNCRs').each(function () {
    const form_otherNCRs = $('.form_otherNCRs', this);
    const ncrInfo = form_otherNCRs.data('record');
    const schema_otherNCRs = SetEntry_otherNCRs(ncrInfo[0])

    Formio.createForm(form_otherNCRs[0], schema_otherNCRs, { readOnly: true, });
  })
}
