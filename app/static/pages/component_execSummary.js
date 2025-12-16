// Set up the schema for the QC signoffs
function SetEntry_qcSignoffs(frameConstruction, framePreparation, x, v, u, g, coverBoardsAndCaps, postProduction, completedAPA) {
  const frameIntakeSurveys_link = (frameConstruction.intakeSurveys_actionID !== '' ? `<a href = '/action/${frameConstruction.intakeSurveys_actionID}' > Frame Intake Surveys </a>` : `[Frame Intake Surveys not found]`);
  const frameInstallSurveys_link = (frameConstruction.installSurveys_actionID !== '' ? `<a href = '/action/${frameConstruction.installSurveys_actionID}' > Frame Installation Surveys </a>` : `[Frame Installation Surveys not found]`);

  const meshInstall_link = (framePreparation.meshInstall_actionID !== '' ? `<a href = '/action/${framePreparation.meshInstall_actionID}' > Mesh Panel Installation </a>` : `[Mesh Panel Installation not found]`);
  const rtdInstall_link = (framePreparation.rtdInstall_actionID !== '' ? `<a href = '/action/${framePreparation.rtdInstall_actionID}' > PD & RTD Installation </a>` : `[PD & RTD Installation not found]`);

  const xWinding_link = (x.winding_actionID !== '' ? `<a href = '/action/${x.winding_actionID}' > X Winding </a>` : `[Winding not found]`);
  const xSoldering_link = (x.soldering_actionID !== '' ? `<a href = '/action/${x.soldering_actionID}' > X Soldering </a>` : `[Soldering not found]`);
  const xTensions_link = (x.tensions_actionID !== '' ? `<a href = '/action/${x.tensions_actionID}' > X Tension Measurements </a>` : `[Tension Measurements not found]`);

  const vWinding_link = (v.winding_actionID !== '' ? `<a href = '/action/${v.winding_actionID}' > V Winding </a>` : `[Winding not found]`);
  const vSoldering_link = (v.soldering_actionID !== '' ? `<a href = '/action/${v.soldering_actionID}' > V Soldering </a>` : `[Soldering not found]`);
  const vTensions_link = (v.tensions_actionID !== '' ? `<a href = '/action/${v.tensions_actionID}' > V Tension Measurements </a>` : `[Tension Measurements not found]`);

  const uWinding_link = (u.winding_actionID !== '' ? `<a href = '/action/${u.winding_actionID}' > U Winding </a>` : `[Winding not found]`);
  const uSoldering_link = (u.soldering_actionID !== '' ? `<a href = '/action/${u.soldering_actionID}' > U Soldering </a>` : `[Soldering not found]`);
  const uTensions_link = (u.tensions_actionID !== '' ? `<a href = '/action/${u.tensions_actionID}' > U Tension Measurements </a>` : `[Tension Measurements not found]`);

  const gWinding_link = (g.winding_actionID !== '' ? `<a href = '/action/${g.winding_actionID}' > G Winding </a>` : `[Winding not found]`);
  const gSoldering_link = (g.soldering_actionID !== '' ? `<a href = '/action/${g.soldering_actionID}' > G Soldering </a>` : `[Soldering not found]`);
  const gTensions_link = (g.tensions_actionID !== '' ? `<a href = '/action/${g.tensions_actionID}' > G Tension Measurements </a>` : `[Tension Measurements not found]`);

  const panelInstall_link = (postProduction.panelInstall_actionID !== '' ? `<a href = '/action/${postProduction.panelInstall_actionID}' > Protection Panels </a>` : `[Protection Panels not found]`);
  const conduitInstall_link = (postProduction.conduitInstall_actionID !== '' ? `<a href = '/action/${postProduction.conduitInstall_actionID}' > Cable Conduits </a>` : `[Cable Conduits not found]`);

  const schema_qcSignoffs = {
    "components": [
      {
        "label": "QC Signoffs",
        "cellAlignment": "left",
        "bordered": true,
        "key": "qcSignoffs_table",
        "type": "table",
        "numRows": 1,
        "numCols": 1,
        "input": false,
        "tableView": false,
        "rows": [
          [
            {
              "components": [
                {
                  "html": `<h4><strong>QC Signoffs</strong></h4>`,
                  "label": "Content",
                  "refreshOnChange": false,
                  "key": "content",
                  "type": "content",
                  "input": false,
                  "tableView": false
                },
                {
                  "label": "HTML",
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
                  "tableView": false
                },
                {
                  "label": "Columns",
                  "columns": [
                    {
                      "components": [
                        {
                          "label": "Text Field",
                          "placeholder": "Frame Construction",
                          "hideLabel": true,
                          "disabled": true,
                          "tableView": true,
                          "key": "frameConstruction_label",
                          "type": "textfield",
                          "input": true
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
                          "label": "Text Field",
                          "hideLabel": true,
                          "disabled": true,
                          "tableView": true,
                          "key": "frameConstruction_signoff",
                          "type": "textfield",
                          "input": true,
                          "defaultValue": frameConstruction.signoff_name
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
                          "label": "Date / Time",
                          "hideLabel": true,
                          "disabled": true,
                          "tableView": false,
                          "enableMinDateInput": false,
                          "datePicker": {
                            "disableWeekends": false,
                            "disableWeekdays": false
                          },
                          "enableMaxDateInput": false,
                          "key": "frameConstruction_date",
                          "type": "datetime",
                          "input": true,
                          "defaultValue": frameConstruction.signoff_date,
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
                          }
                        }
                      ],
                      "size": "sm",
                      "width": 3,
                      "offset": 0,
                      "push": 0,
                      "pull": 0,
                      "currentWidth": 3
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
                          "label": "HTML",
                          "attrs": [
                            {
                              "attr": "",
                              "value": ""
                            }
                          ],
                          "refreshOnChange": false,
                          "key": "frameConstruction_intakeSurveys",
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
                          "label": "HTML",
                          "attrs": [
                            {
                              "attr": "",
                              "value": ""
                            }
                          ],
                          "refreshOnChange": false,
                          "key": "frameConstruction_installationSurveys",
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
                    }
                  ],
                  "key": "columns1",
                  "type": "columns",
                  "input": false,
                  "tableView": false
                },
                {
                  "label": "Columns",
                  "columns": [
                    {
                      "components": [
                        {
                          "label": "Text Field",
                          "placeholder": "Frame Preparation",
                          "hideLabel": true,
                          "disabled": true,
                          "tableView": true,
                          "key": "framePreparation_label",
                          "type": "textfield",
                          "input": true
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
                          "label": "Text Field",
                          "hideLabel": true,
                          "disabled": true,
                          "tableView": true,
                          "key": "framePreparation_signoff",
                          "type": "textfield",
                          "input": true,
                          "defaultValue": framePreparation.signoff_name
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
                          "label": "Date / Time",
                          "hideLabel": true,
                          "disabled": true,
                          "tableView": false,
                          "enableMinDateInput": false,
                          "datePicker": {
                            "disableWeekends": false,
                            "disableWeekdays": false
                          },
                          "enableMaxDateInput": false,
                          "key": "framePreparation_date",
                          "type": "datetime",
                          "input": true,
                          "defaultValue": framePreparation.signoff_date,
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
                          }
                        }
                      ],
                      "size": "sm",
                      "width": 3,
                      "offset": 0,
                      "push": 0,
                      "pull": 0,
                      "currentWidth": 3
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
                          "label": "HTML",
                          "attrs": [
                            {
                              "attr": "",
                              "value": ""
                            }
                          ],
                          "refreshOnChange": false,
                          "key": "framePreparation_meshInstall",
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
                          "label": "HTML",
                          "attrs": [
                            {
                              "attr": "",
                              "value": ""
                            }
                          ],
                          "refreshOnChange": false,
                          "key": "framePreparation_rtdInstall",
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
                    }
                  ],
                  "key": "columns4",
                  "type": "columns",
                  "input": false,
                  "tableView": false
                },
                {
                  "label": "Columns",
                  "columns": [
                    {
                      "components": [
                        {
                          "label": "Text Field",
                          "placeholder": "X Layer Assembly",
                          "hideLabel": true,
                          "disabled": true,
                          "tableView": true,
                          "key": "x_label",
                          "type": "textfield",
                          "input": true
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
                          "label": "Text Field",
                          "hideLabel": true,
                          "disabled": true,
                          "tableView": true,
                          "key": "x_signoff",
                          "type": "textfield",
                          "input": true,
                          "defaultValue": x.signoff_name
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
                          "label": "Date / Time",
                          "hideLabel": true,
                          "disabled": true,
                          "tableView": false,
                          "enableMinDateInput": false,
                          "datePicker": {
                            "disableWeekends": false,
                            "disableWeekdays": false
                          },
                          "enableMaxDateInput": false,
                          "key": "x_date",
                          "type": "datetime",
                          "input": true,
                          "defaultValue": x.signoff_date,
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
                          }
                        }
                      ],
                      "size": "sm",
                      "width": 3,
                      "offset": 0,
                      "push": 0,
                      "pull": 0,
                      "currentWidth": 3
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
                          "label": "HTML",
                          "attrs": [
                            {
                              "attr": "",
                              "value": ""
                            }
                          ],
                          "refreshOnChange": false,
                          "key": "x_winding",
                          "type": "htmlelement",
                          "input": false,
                          "tableView": false,
                          "content": `${xWinding_link}<br></br>`
                        }
                      ],
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
                          "label": "HTML",
                          "attrs": [
                            {
                              "attr": "",
                              "value": ""
                            }
                          ],
                          "refreshOnChange": false,
                          "key": "x_soldering",
                          "type": "htmlelement",
                          "input": false,
                          "tableView": false,
                          "content": `${xSoldering_link}<br></br>`
                        }
                      ],
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
                          "label": "HTML",
                          "attrs": [
                            {
                              "attr": "",
                              "value": ""
                            }
                          ],
                          "refreshOnChange": false,
                          "key": "x_tensions",
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
                    }
                  ],
                  "key": "columns3",
                  "type": "columns",
                  "input": false,
                  "tableView": false
                },
                {
                  "label": "Columns",
                  "columns": [
                    {
                      "components": [
                        {
                          "label": "Text Field",
                          "placeholder": "V Layer Assembly",
                          "hideLabel": true,
                          "disabled": true,
                          "tableView": true,
                          "key": "v_label",
                          "type": "textfield",
                          "input": true,
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
                          "label": "Text Field",
                          "hideLabel": true,
                          "disabled": true,
                          "tableView": true,
                          "key": "v_signoff",
                          "type": "textfield",
                          "input": true,
                          "defaultValue": v.signoff_name
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
                          "label": "Date / Time",
                          "hideLabel": true,
                          "disabled": true,
                          "tableView": false,
                          "enableMinDateInput": false,
                          "datePicker": {
                            "disableWeekends": false,
                            "disableWeekdays": false
                          },
                          "enableMaxDateInput": false,
                          "key": "v_date",
                          "type": "datetime",
                          "input": true,
                          "defaultValue": v.signoff_date,
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
                          }
                        }
                      ],
                      "size": "sm",
                      "width": 3,
                      "offset": 0,
                      "push": 0,
                      "pull": 0,
                      "currentWidth": 3
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
                          "label": "HTML",
                          "attrs": [
                            {
                              "attr": "",
                              "value": ""
                            }
                          ],
                          "refreshOnChange": false,
                          "key": "v_winding",
                          "type": "htmlelement",
                          "input": false,
                          "tableView": false,
                          "content": `${vWinding_link}<br></br>`
                        }
                      ],
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
                          "label": "HTML",
                          "attrs": [
                            {
                              "attr": "",
                              "value": ""
                            }
                          ],
                          "refreshOnChange": false,
                          "key": "v_soldering",
                          "type": "htmlelement",
                          "input": false,
                          "tableView": false,
                          "content": `${vSoldering_link}<br></br>`
                        }
                      ],
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
                          "label": "HTML",
                          "attrs": [
                            {
                              "attr": "",
                              "value": ""
                            }
                          ],
                          "refreshOnChange": false,
                          "key": "v_tensions",
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
                    }
                  ],
                  "key": "columns8",
                  "type": "columns",
                  "input": false,
                  "tableView": false
                },
                {
                  "label": "Columns",
                  "columns": [
                    {
                      "components": [
                        {
                          "label": "Text Field",
                          "placeholder": "U Layer Assembly",
                          "hideLabel": true,
                          "disabled": true,
                          "tableView": true,
                          "key": "u_label",
                          "type": "textfield",
                          "input": true
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
                          "label": "Text Field",
                          "hideLabel": true,
                          "disabled": true,
                          "tableView": true,
                          "key": "u_signoff",
                          "type": "textfield",
                          "input": true,
                          "defaultValue": u.signoff_name
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
                          "label": "Date / Time",
                          "hideLabel": true,
                          "disabled": true,
                          "tableView": false,
                          "enableMinDateInput": false,
                          "datePicker": {
                            "disableWeekends": false,
                            "disableWeekdays": false
                          },
                          "enableMaxDateInput": false,
                          "key": "u_date",
                          "type": "datetime",
                          "input": true,
                          "defaultValue": u.signoff_date,
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
                          }
                        }
                      ],
                      "size": "sm",
                      "width": 3,
                      "offset": 0,
                      "push": 0,
                      "pull": 0,
                      "currentWidth": 3
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
                          "label": "HTML",
                          "attrs": [
                            {
                              "attr": "",
                              "value": ""
                            }
                          ],
                          "refreshOnChange": false,
                          "key": "u_winding",
                          "type": "htmlelement",
                          "input": false,
                          "tableView": false,
                          "content": `${uWinding_link}<br></br>`
                        }
                      ],
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
                          "label": "HTML",
                          "attrs": [
                            {
                              "attr": "",
                              "value": ""
                            }
                          ],
                          "refreshOnChange": false,
                          "key": "u_soldering",
                          "type": "htmlelement",
                          "input": false,
                          "tableView": false,
                          "content": `${uSoldering_link}<br></br>`
                        }
                      ],
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
                          "label": "HTML",
                          "attrs": [
                            {
                              "attr": "",
                              "value": ""
                            }
                          ],
                          "refreshOnChange": false,
                          "key": "u_tensions",
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
                    }
                  ],
                  "key": "columns9",
                  "type": "columns",
                  "input": false,
                  "tableView": false
                },
                {
                  "label": "Columns",
                  "columns": [
                    {
                      "components": [
                        {
                          "label": "Text Field",
                          "placeholder": "G Layer Assembly",
                          "hideLabel": true,
                          "disabled": true,
                          "tableView": true,
                          "key": "g_label",
                          "type": "textfield",
                          "input": true
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
                          "label": "Text Field",
                          "hideLabel": true,
                          "disabled": true,
                          "tableView": true,
                          "key": "g_signoff",
                          "type": "textfield",
                          "input": true,
                          "defaultValue": g.signoff_name
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
                          "label": "Date / Time",
                          "hideLabel": true,
                          "disabled": true,
                          "tableView": false,
                          "enableMinDateInput": false,
                          "datePicker": {
                            "disableWeekends": false,
                            "disableWeekdays": false
                          },
                          "enableMaxDateInput": false,
                          "key": "g_date",
                          "type": "datetime",
                          "input": true,
                          "defaultValue": g.signoff_date,
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
                          }
                        }
                      ],
                      "size": "sm",
                      "width": 3,
                      "offset": 0,
                      "push": 0,
                      "pull": 0,
                      "currentWidth": 3
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
                          "label": "HTML",
                          "attrs": [
                            {
                              "attr": "",
                              "value": ""
                            }
                          ],
                          "refreshOnChange": false,
                          "key": "g_winding",
                          "type": "htmlelement",
                          "input": false,
                          "tableView": false,
                          "content": `${gWinding_link}<br></br>`
                        }
                      ],
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
                          "label": "HTML",
                          "attrs": [
                            {
                              "attr": "",
                              "value": ""
                            }
                          ],
                          "refreshOnChange": false,
                          "key": "g_soldering",
                          "type": "htmlelement",
                          "input": false,
                          "tableView": false,
                          "content": `${gSoldering_link}<br></br>`
                        }
                      ],
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
                          "label": "HTML",
                          "attrs": [
                            {
                              "attr": "",
                              "value": ""
                            }
                          ],
                          "refreshOnChange": false,
                          "key": "g_tensions",
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
                    }
                  ],
                  "key": "columns10",
                  "type": "columns",
                  "input": false,
                  "tableView": false
                },
                {
                  "label": "Columns",
                  "columns": [
                    {
                      "components": [
                        {
                          "label": "Text Field",
                          "placeholder": "Cover Boards and Caps",
                          "hideLabel": true,
                          "disabled": true,
                          "tableView": true,
                          "key": "coverBoardsAndCaps_label",
                          "type": "textfield",
                          "input": true
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
                          "label": "Text Field",
                          "hideLabel": true,
                          "disabled": true,
                          "tableView": true,
                          "key": "coverBoardsAndCaps_signoff",
                          "type": "textfield",
                          "input": true,
                          "defaultValue": coverBoardsAndCaps.signoff_name
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
                          "label": "Date / Time",
                          "hideLabel": true,
                          "disabled": true,
                          "tableView": false,
                          "enableMinDateInput": false,
                          "datePicker": {
                            "disableWeekends": false,
                            "disableWeekdays": false
                          },
                          "enableMaxDateInput": false,
                          "key": "coverBoardsAndCaps_date",
                          "type": "datetime",
                          "input": true,
                          "defaultValue": coverBoardsAndCaps.signoff_date,
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
                          }
                        }
                      ],
                      "size": "sm",
                      "width": 3,
                      "offset": 0,
                      "push": 0,
                      "pull": 0,
                      "currentWidth": 3
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
                  "key": "columns7",
                  "type": "columns",
                  "input": false,
                  "tableView": false
                },
                {
                  "label": "Columns",
                  "columns": [
                    {
                      "components": [
                        {
                          "label": "Text Field",
                          "placeholder": "Post Production",
                          "hideLabel": true,
                          "disabled": true,
                          "tableView": true,
                          "key": "postProduction_label",
                          "type": "textfield",
                          "input": true
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
                          "label": "Text Field",
                          "hideLabel": true,
                          "disabled": true,
                          "tableView": true,
                          "key": "postProduction_signoff",
                          "type": "textfield",
                          "input": true,
                          "defaultValue": postProduction.signoff_name
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
                          "label": "Date / Time",
                          "hideLabel": true,
                          "disabled": true,
                          "tableView": false,
                          "enableMinDateInput": false,
                          "datePicker": {
                            "disableWeekends": false,
                            "disableWeekdays": false
                          },
                          "enableMaxDateInput": false,
                          "key": "postProduction_date",
                          "type": "datetime",
                          "input": true,
                          "defaultValue": postProduction.signoff_date,
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
                          }
                        }
                      ],
                      "size": "sm",
                      "width": 3,
                      "offset": 0,
                      "push": 0,
                      "pull": 0,
                      "currentWidth": 3
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
                          "label": "HTML",
                          "attrs": [
                            {
                              "attr": "",
                              "value": ""
                            }
                          ],
                          "refreshOnChange": false,
                          "key": "postProduction_protectionPanels",
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
                          "label": "HTML",
                          "attrs": [
                            {
                              "attr": "",
                              "value": ""
                            }
                          ],
                          "refreshOnChange": false,
                          "key": "postProduction_cableConduits",
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
                    }
                  ],
                  "key": "columns11",
                  "type": "columns",
                  "input": false,
                  "tableView": false
                },
                {
                  "label": "Columns",
                  "columns": [
                    {
                      "components": [
                        {
                          "label": "Text Field",
                          "placeholder": "Completed APA",
                          "hideLabel": true,
                          "disabled": true,
                          "tableView": true,
                          "key": "completedAPA_label",
                          "type": "textfield",
                          "input": true
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
                          "label": "Text Field",
                          "hideLabel": true,
                          "disabled": true,
                          "tableView": true,
                          "key": "completedAPA_signoff",
                          "type": "textfield",
                          "input": true,
                          "defaultValue": completedAPA.signoff_name
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
                          "label": "Date / Time",
                          "hideLabel": true,
                          "disabled": true,
                          "tableView": false,
                          "enableMinDateInput": false,
                          "datePicker": {
                            "disableWeekends": false,
                            "disableWeekdays": false
                          },
                          "enableMaxDateInput": false,
                          "key": "completedAPA_date",
                          "type": "datetime",
                          "input": true,
                          "defaultValue": completedAPA.signoff_date,
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
                          }
                        }
                      ],
                      "size": "sm",
                      "width": 3,
                      "offset": 0,
                      "push": 0,
                      "pull": 0,
                      "currentWidth": 3
                    },
                    {
                      "components": [],
                      "size": "sm",
                      "width": 5,
                      "offset": 0,
                      "push": 0,
                      "pull": 0,
                      "currentWidth": 5
                    },
                  ],
                  "key": "columns12",
                  "type": "columns",
                  "input": false,
                  "tableView": false
                }
              ]
            }
          ]
        ]
      }
    ]
  }

  return schema_qcSignoffs;
}

// Set up the schema for a single wire layer entry
function SetEntry_wireLayer(layer, layerInfo) {
  const schema_wireLayer = {
    "components": [
      {
        "label": "Single Layer Wire Information",
        "cellAlignment": "left",
        "bordered": true,
        "key": "singleLayerWireInformation_table",
        "type": "table",
        "numRows": 1,
        "numCols": 1,
        "input": false,
        "tableView": false,
        "rows": [
          [
            {
              "components": [
                {
                  "html": `<h4><strong>Wire Layer ${layer}</strong></h4>`,
                  "label": "Content",
                  "refreshOnChange": false,
                  "key": "content",
                  "type": "content",
                  "input": false,
                  "tableView": false
                },
                {
                  "label": "Columns",
                  "columns": [
                    {
                      "components": [
                        {
                          "label": "Winder",
                          "disabled": true,
                          "tableView": true,
                          "key": "winder",
                          "type": "textfield",
                          "input": true,
                          "defaultValue": layerInfo.winding_winder
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
                          "label": "Winder Head",
                          "disabled": true,
                          "tableView": true,
                          "key": "winderHead",
                          "type": "textfield",
                          "input": true,
                          "defaultValue": layerInfo.winding_winderHead
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
                          "label": "Winder Maintenance Signoff",
                          "disabled": true,
                          "tableView": true,
                          "key": "maintenanceSignoff",
                          "type": "textfield",
                          "input": true,
                          "defaultValue": layerInfo.winding_winderMaintenanceSignoff
                        }
                      ],
                      "size": "sm",
                      "width": 3,
                      "offset": 0,
                      "push": 0,
                      "pull": 0,
                      "currentWidth": 3
                    },
                    {
                      "components": [
                        {
                          "label": "Tension Control Signoff",
                          "disabled": true,
                          "tableView": true,
                          "key": "tensionControlSignoff",
                          "type": "textfield",
                          "input": true,
                          "defaultValue": layerInfo.winding_tensionControlSignoff
                        }
                      ],
                      "size": "sm",
                      "width": 3,
                      "offset": 0,
                      "push": 0,
                      "pull": 0,
                      "currentWidth": 3
                    },
                    {
                      "components": [
                        {
                          "label": "# Replaced Wires",
                          "mask": false,
                          "disabled": true,
                          "tableView": false,
                          "delimiter": false,
                          "requireDecimal": false,
                          "inputFormat": "plain",
                          "key": "replacedWires",
                          "type": "number",
                          "input": true,
                          "defaultValue": layerInfo.winding_numberOfReplacedWires,
                        }
                      ],
                      "size": "sm",
                      "width": 2,
                      "offset": 0,
                      "push": 0,
                      "pull": 0,
                      "currentWidth": 2
                    }
                  ],
                  "key": "columns1",
                  "type": "columns",
                  "input": false,
                  "tableView": false
                },
                {
                  "label": "Columns",
                  "columns": [
                    {
                      "components": [
                        {
                          "label": "Bobbin Manufacturer(s)",
                          "disabled": true,
                          "tableView": true,
                          "key": "bobbinManufacturers",
                          "type": "textfield",
                          "input": true,
                          "defaultValue": layerInfo.winding_bobbinManufacturers
                        }
                      ],
                      "width": 3,
                      "offset": 0,
                      "push": 0,
                      "pull": 0,
                      "size": "sm",
                      "currentWidth": 3
                    },
                    {
                      "components": [
                        {
                          "label": "# Tension Alarms",
                          "mask": false,
                          "disabled": true,
                          "tableView": false,
                          "delimiter": false,
                          "requireDecimal": false,
                          "inputFormat": "plain",
                          "key": "tensionAlarms",
                          "type": "number",
                          "input": true,
                          "defaultValue": layerInfo.winding_numberOfTensionAlarms
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
                          "label": "# Reworked Solders",
                          "mask": false,
                          "disabled": true,
                          "tableView": false,
                          "delimiter": false,
                          "requireDecimal": false,
                          "inputFormat": "plain",
                          "key": "reworkedSolders",
                          "type": "number",
                          "input": true,
                          "defaultValue": layerInfo.soldering_numberOfReworkedSolders
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
                          "label": "Tension Measurement Location",
                          "disabled": true,
                          "tableView": true,
                          "key": "tensionMeasurementLocation",
                          "type": "textfield",
                          "input": true,
                          "defaultValue": layerInfo.tensions_location
                        }
                      ],
                      "size": "sm",
                      "width": 3,
                      "offset": 0,
                      "push": 0,
                      "pull": 0,
                      "currentWidth": 3
                    },
                    {
                      "components": [
                        {
                          "label": "Measurement System",
                          "disabled": true,
                          "tableView": true,
                          "key": "tensionMeasurementSystem",
                          "type": "textfield",
                          "input": true,
                          "defaultValue": layerInfo.tensions_system
                        }
                      ],
                      "size": "sm",
                      "width": 2,
                      "offset": 0,
                      "push": 0,
                      "pull": 0,
                      "currentWidth": 2
                    }
                  ],
                  "key": "columns2",
                  "type": "columns",
                  "input": false,
                  "tableView": false
                },
                {
                  "label": "Tension Measurements (Side A)",
                  "disabled": true,
                  "tableView": true,
                  "units": "Tension [N]",
                  "key": "tensionMeasurements_A",
                  "type": "TensionPlots",
                  "axis_limitLower": 3.5,
                  "axis_limitUpper": 9,
                  "specification_nominal": 6.25,
                  "specification_toleranceInner": 2.25,
                  "input": true,
                  "defaultValue": layerInfo.tensions_A
                },
                {
                  "label": "Tension Measurements (Side B)",
                  "disabled": true,
                  "tableView": true,
                  "units": "Tension [N]",
                  "key": "tensionMeasurements_B",
                  "type": "TensionPlots",
                  "axis_limitLower": 3.5,
                  "axis_limitUpper": 9,
                  "specification_nominal": 6.25,
                  "specification_toleranceInner": 2.25,
                  "input": true,
                  "defaultValue": layerInfo.tensions_B
                }
              ]
            }
          ]
        ]
      }
    ]
  }

  return schema_wireLayer;
}

// Set up the schema for a single NCR section header
function SetHeader_ncrsWithDisposition(disposition, count) {
  const plural = (count === 1) ? '' : 's';

  const schema_ncrs_header = {
    "components": [
      {
        "html": `<h4><strong>${count} Non-Conformance${plural} with Disposition: ${disposition}</strong></h4>`,
        "label": "Content",
        "refreshOnChange": false,
        "key": "content",
        "type": "content",
        "input": false,
        "tableView": false
      }
    ]
  }

  return schema_ncrs_header;
}

// Set up the schema for a single NCR entry (excluding any wire information)
function SetEntry_NCR(ncrInfo) {
  const schema_ncr = {
    "components": [
      {
        "label": "Non-Conformance Report Summary",
        "cellAlignment": "left",
        "bordered": true,
        "key": "nonConformanceReportSummary_table",
        "type": "table",
        "numRows": 1,
        "numCols": 1,
        "input": false,
        "tableView": false,
        "rows": [
          [
            {
              "components": [
                {
                  "label": "Columns",
                  "columns": [
                    {
                      "components": [
                        {
                          "label": "NCR Title",
                          "disabled": true,
                          "tableView": true,
                          "key": "ncrTitle",
                          "type": "textfield",
                          "input": true,
                          "defaultValue": ncrInfo.title
                        }
                      ],
                      "width": 5,
                      "offset": 0,
                      "push": 0,
                      "pull": 0,
                      "size": "sm",
                      "currentWidth": 5
                    },
                    {
                      "components": [
                        {
                          "label": "NCR Type(s)",
                          "disabled": true,
                          "tableView": true,
                          "key": "ncrTypeS",
                          "type": "textfield",
                          "input": true,
                          "defaultValue": ncrInfo.types
                        }
                      ],
                      "width": 4,
                      "offset": 0,
                      "push": 0,
                      "pull": 0,
                      "size": "sm",
                      "currentWidth": 4
                    },
                    {
                      "components": [
                        {
                          "label": "APA Construction Database Action ID",
                          "disabled": true,
                          "tableView": true,
                          "key": "apaConstructionDbActionId",
                          "type": "textfield",
                          "input": true,
                          "defaultValue": ncrInfo.actionId
                        }
                      ],
                      "size": "sm",
                      "width": 3,
                      "offset": 0,
                      "push": 0,
                      "pull": 0,
                      "currentWidth": 3
                    }
                  ],
                  "key": "columns1",
                  "type": "columns",
                  "input": false,
                  "tableView": false
                },
                {
                  "label": "Description",
                  "autoExpand": false,
                  "disabled": true,
                  "tableView": true,
                  "key": "description",
                  "type": "textarea",
                  "input": true,
                  "defaultValue": ncrInfo.description
                }
              ]
            }
          ]
        ]
      }
    ]
  }

  return schema_ncr;
}

// Set up the schema for a single missing or shorted wire / wire segment entry
function SetEntry_NCRWire(wireInfo) {
  const schema_wire = {
    "components": [
      {
        "label": "Missing or Shorted Wire / Wire Segment",
        "cellAlignment": "left",
        "bordered": true,
        "hideLabel": true,
        "key": "wires_table",
        "type": "table",
        "numRows": 1,
        "numCols": 1,
        "input": false,
        "tableView": false,
        "rows": [
          [
            {
              "components": [
                {
                  "label": "Columns",
                  "columns": [
                    {
                      "components": [
                        {
                          "label": "Type",
                          "disabled": true,
                          "tableView": true,
                          "key": "missingWire_type",
                          "type": "textfield",
                          "input": true,
                          "defaultValue": wireInfo.wireType
                        }
                      ],
                      "size": "sm",
                      "offset": 0,
                      "push": 0,
                      "pull": 0,
                      "width": 2,
                      "currentWidth": 2
                    },
                    {
                      "components": [
                        {
                          "label": "Layer & Side",
                          "disabled": true,
                          "tableView": true,
                          "key": "missingWire_layerSide",
                          "type": "textfield",
                          "input": true,
                          "defaultValue": wireInfo.wireLayer
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
                          "label": "Head Board & Pad",
                          "disabled": true,
                          "tableView": true,
                          "key": "missingWire_headBoardPad",
                          "type": "textfield",
                          "input": true,
                          "defaultValue": wireInfo.headBoardAndPad
                        }
                      ],
                      "offset": 0,
                      "push": 0,
                      "pull": 0,
                      "size": "sm",
                      "currentWidth": 2,
                      "width": 2
                    },
                    {
                      "components": [
                        {
                          "label": "Endpoints",
                          "disabled": true,
                          "tableView": true,
                          "key": "missingWire_endpoints",
                          "type": "textfield",
                          "input": true,
                          "defaultValue": wireInfo.endPointsForMissingSegment
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
                          "label": "Offline Channel",
                          "disabled": true,
                          "tableView": true,
                          "key": "missingWire_offlineChannel",
                          "type": "textfield",
                          "input": true,
                          "defaultValue": wireInfo.offlineChannel
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
                          "label": "FEMB-ASIC-ASIC Channel",
                          "disabled": true,
                          "tableView": true,
                          "key": "missingWire_fembAsicAsicChannel",
                          "type": "textfield",
                          "input": true,
                          "defaultValue": wireInfo.coldElectronicsChannel
                        }
                      ],
                      "size": "sm",
                      "offset": 0,
                      "push": 0,
                      "pull": 0,
                      "currentWidth": 2,
                      "width": 2
                    }
                  ],
                  "key": "columns2",
                  "type": "columns",
                  "input": false,
                  "tableView": false
                }
              ]
            }
          ]
        ]
      }
    ]
  }

  return schema_wire;
}


// Run a specific function when the page is loaded
window.addEventListener('load', populateExecutiveSummary);


// Function to run when the page is loaded
async function populateExecutiveSummary() {
  console.log(collatedInfo);

  // Render the form for the QC signoffs
  $('div.entry_qcSignoffs').each(function () {
    const form_entry_qcSignoffs = $('.form_entry_qcSignoffs', this);
    const signoffInfo = form_entry_qcSignoffs.data('record');
    const schema_entry_qcSignoffs = SetEntry_qcSignoffs(signoffInfo[0], signoffInfo[1], signoffInfo[2], signoffInfo[3], signoffInfo[4], signoffInfo[5], signoffInfo[6], signoffInfo[7], signoffInfo[8]);

    Formio.createForm(form_entry_qcSignoffs[0], schema_entry_qcSignoffs, { readOnly: true, });
  })

  // Render the form for a single wire layer entry
  $('div.entry_wireLayer').each(function () {
    const form_entry_wireLayer = $('.form_entry_wireLayer', this);
    const layerInfo = form_entry_wireLayer.data('record');
    const schema_entry_wireLayer = SetEntry_wireLayer(layerInfo[0], layerInfo[1]);

    Formio.createForm(form_entry_wireLayer[0], schema_entry_wireLayer, { readOnly: true, });
  })

  // Render the form for a single NCR section header
  $('div.header_ncr').each(function () {
    const form_header_ncr = $('.form_header_ncr', this);
    const disposition = form_header_ncr.data('record');
    const schema_header_ncr = SetHeader_ncrsWithDisposition(disposition[0], disposition[1]);

    Formio.createForm(form_header_ncr[0], schema_header_ncr, { readOnly: true, });
  })

  // Render the form for a single NCR entry (excluding any wire information)
  $('div.entry_ncr').each(function () {
    const form_entry_ncr = $('.form_entry_ncr', this);
    const ncrInfo = form_entry_ncr.data('record');
    const schema_entry_ncr = SetEntry_NCR(ncrInfo);

    Formio.createForm(form_entry_ncr[0], schema_entry_ncr, { readOnly: true, });
  })

  // Render the form for a single missing or shorted wire / wire segment entry
  $('div.entry_ncrWire').each(function () {
    const form_entry_ncrWire = $('.form_entry_ncrWire', this);
    const wireInfo = form_entry_ncrWire.data('record');
    const schema_entry_ncrWire = SetEntry_NCRWire(wireInfo);

    Formio.createForm(form_entry_ncrWire[0], schema_entry_ncrWire, { readOnly: true, });
  })
}
