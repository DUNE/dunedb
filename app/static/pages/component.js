// Run a specific function when the page is loaded
window.addEventListener('load', populateTypeForm);


// Function to run when the page is loaded
async function populateTypeForm() {
  if (component.formId !== 'ReturnedGeometryBoardBatch') {
    // Render the component type form in the page element called 'typeform'
    let typeForm = await Formio.createForm(document.getElementById('typeform'), componentTypeForm.schema, { readOnly: true, });

    // Populate the type form with data from the component record and disable the submission functionality (since the form is only to be displayed, not used)
    typeForm.submission = component;
    typeForm.nosubmit = true;
  } else {
    {
      const reducedComponentTypeForm_schema = {
        "components": [
          {
            "label": "Columns",
            "key": "columns1",
            "type": "columns",
            "input": false,
            "columns": [
              {
                "components": [
                  {
                    "label": " Type of Component",
                    "key": "subComponent_formId",
                    "type": "textfield",
                    "input": false
                  },
                  {
                    "label": "Part String",
                    "key": "subComponent_partString",
                    "type": "textfield",
                    "input": false
                  },
                  {
                    "label": "Name",
                    "key": "name",
                    "type": "textfield",
                    "input": false
                  }
                ],
                "size": "md",
                "currentWidth": 4,
                "width": 4
              },
              {
                "components": [
                  {
                    "label": "Part Number",
                    "key": "subComponent_partNumber",
                    "type": "textfield",
                    "input": false
                  },
                  {
                    "label": "Arrival Date of Batch",
                    "key": "arrivalDateOfBatch",
                    "type": "datetime",
                    "input": false,
                    "format": "yyyy-MM-dd",
                    "widget": {
                      "type": "calendar",
                      "displayInTimezone": "viewer",
                      "locale": "en",
                      "useLocaleSettings": false,
                      "allowInput": true,
                      "mode": "single",
                      "enableTime": false,
                      "noCalendar": false,
                      "format": "yyyy-MM-dd",
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
                "size": "md",
                "currentWidth": 4,
                "width": 4
              },
              {
                "components": [
                  {
                    "label": "Manufacturer",
                    "key": "manufacturer",
                    "type": "select",
                    "input": false,
                    "widget": "choicesjs",
                    "data": {
                      "values": [
                        {
                          "label": "Merlin",
                          "value": "Merlin"
                        }
                      ]
                    },
                    "selectThreshold": 0.3
                  },
                  {
                    "label": "Order Number",
                    "key": "orderNumber",
                    "type": "textfield",
                    "input": false
                  }
                ],
                "size": "md",
                "currentWidth": 4,
                "width": 4
              }
            ]
          }
        ]
      }

      // Render the reduced component type form in the page element called 'typeform'
      let typeForm = await Formio.createForm(document.getElementById('typeform'), reducedComponentTypeForm_schema, { readOnly: true, });

      // Populate the reduced type form with data from the component record and disable the submission functionality (since the form is only to be displayed, not used)
      typeForm.submission = component;
      typeForm.nosubmit = true;
    }
  }
};


// When the 'Copy UUID' button is pressed, copy the UUID to the device's clipboard, and change the button's appearance to confirm success
function CopyUUID(componentUUID) {
  navigator.clipboard.writeText(componentUUID).then(function () {
    document.getElementById('copy_uuid').innerHTML = 'Copied';
    document.getElementById('copy_uuid').style.backgroundColor = 'green';
  }, function (err) {
    document.getElementById('copy_uuid').innerHTML = 'ERROR';
    document.getElementById('copy_uuid').style.backgroundColor = 'red';

    console.error('Error - could not copy component UUID', err);
  })
};


// When the 'Download List of Links' button is pressed, write a list of QR code URLs to a file and then download the file
function DownloadLinks(shortUuids) {
  let links_text = '';

  for (const shortUuid of shortUuids) {
    const link = `${base_url}/c/${shortUuid}\n`;
    links_text = links_text.concat(link);
  }

  const links_obj = window.URL.createObjectURL(new Blob([links_text], { type: 'text/plain' }));

  $('#download_links').attr('href', links_obj);
};
