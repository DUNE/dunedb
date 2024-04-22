// Set up the schema for the QC signoffs
function SetSection_qcSignoffs(apaQC, frameQC, meshPanelQC, cableConduitQC, pdCableTempSensorQC) {
  const apaQC_link = (apaQC.actionId !== '' ? `<a href = '/action/${apaQC.actionId}' > APA QC Review Details </a>` : `[missing APA QC Review]`);
  const frameQC_link = (frameQC.qcActionId !== '' ? `<a href = '/action/${frameQC.qcActionId}' > Frame QC Review Details </a>` : `[missing Frame QC Review]`);
  const frameSurveys_link = (frameQC.surveysActionId !== '' ? `<a href = '/action/${frameQC.surveysActionId}' > Frame Survey Details </a>` : `[missing Frame Survey]`);
  const meshPanelQC_link = (meshPanelQC.actionId !== '' ? `<a href = '/action/${meshPanelQC.actionId}' > Mesh Panel Installation QC Details </a>` : `[missing Mesh Panel Installation QC]`);
  const cableConduitQC_link = (cableConduitQC.actionId !== '' ? `<a href = '/action/${cableConduitQC.actionId}' > Cable Conduit Insertion QC Details </a>` : `[missing Cable Conduit Insertion QC]`);
  const pdCableTempSensorQC_link = (pdCableTempSensorQC.actionId !== '' ? `<a href = '/action/${pdCableTempSensorQC.actionId}' > PD and RTD Installation Details </a>` : `[missing PD and RTD Installation]`);

  const schema_qcSignoffs = {
    components: [{
      label: 'QC Signoffs',
      key: 'qcSignoffs',
      type: 'textfield',
      input: false,
      hideLabel: true,
      defaultValue: 'QC Signoffs',
    },
    {
      label: 'Columns',
      key: 'columns',
      type: 'columns',
      input: false,
      columns: [{
        components: [{
          label: 'Completed APA QC Review by:',
          key: 'apaQC_signoff',
          type: 'textfield',
          input: true,
          defaultValue: apaQC.signoff,
        }],
        width: 3,
        size: 'sm',
      },
      {
        components: [{
          key: 'apaQC_actionId',
          type: 'htmlelement',
          input: false,
          content: `<p><br> ${apaQC_link} </br></p>`,
        }],
        width: 3,
        size: 'sm',
      },
      {
        components: [{
          label: 'Completed Frame QC Review by:',
          key: 'frameQC_signoff',
          type: 'textfield',
          input: true,
          defaultValue: frameQC.signoff,
        }],
        width: 3,
        size: 'sm',
      },
      {
        components: [{
          key: 'frameQC_actionId',
          type: 'htmlelement',
          input: false,
          content: `<p><br> ${frameQC_link} </br></p>`,
        }],
        width: 1,
        size: 'sm',
      },
      {
        components: [{
          key: 'frameQC_surveysActionId',
          type: 'htmlelement',
          input: false,
          content: `<p><br> ${frameSurveys_link} </br></p>`,
        }],
        width: 2,
        size: 'sm',
      }],
    },
    {
      label: 'Columns',
      key: 'columns1',
      type: 'columns',
      input: false,
      columns: [{
        components: [{
          label: 'Mesh Panel Installation QC by:',
          key: 'meshPanelQC_signoff',
          type: 'textfield',
          input: true,
          defaultValue: meshPanelQC.signoff,
        }],
        width: 3,
        size: 'sm',
      },
      {
        components: [{
          key: 'meshPanelQC_actionId',
          type: 'htmlelement',
          input: false,
          content: `<p><br> ${meshPanelQC_link} </br></p>`,
        }],
        width: 3,
        size: 'sm',
      },
      {
        components: [{
          label: 'Conduit Insertion QC by:',
          key: 'cableConduitQC_signoff',
          type: 'textfield',
          input: true,
          defaultValue: cableConduitQC.signoff,
        }],
        width: 3,
        size: 'sm',
      },
      {
        components: [{
          key: 'cableConduitQC_actionId',
          type: 'htmlelement',
          input: false,
          content: `<p><br> ${cableConduitQC_link} </br></p>`,
        }],
        width: 3,
        size: 'sm',
      }],
    },
    {
      label: 'Columns',
      key: 'columns11',
      type: 'columns',
      input: false,
      columns: [{
        components: [{
          label: 'PD Cable Installation checked by:',
          key: 'photonDetectorSignoff',
          type: 'textfield',
          input: true,
          defaultValue: pdCableTempSensorQC.photonDetectorSignoff,
        }],
        width: 3,
        size: 'sm',
      },
      {
        components: [{
          label: 'RTDs and Cable Installation checked by:',
          key: 'rdInstallationSignoff',
          type: 'textfield',
          'input': true,
          defaultValue: pdCableTempSensorQC.rdInstallationSignoff,
        }],
        width: 3,
        size: 'sm',
      },
      {
        components: [{
          key: 'pdCableTempSensorQC_actionId',
          type: 'htmlelement',
          input: false,
          content: `<p><br> ${pdCableTempSensorQC_link} </br></p>`,
        }],
        width: 3,
        size: 'sm',
      },
      {
        components: [],
        width: 3,
        size: 'sm',
      }]
    }]
  }

  return schema_qcSignoffs;
}

// Set up the schema for a single wire layer entry
function SetEntry_wireLayer(layer, layerInfo) {
  const winding_link = (layerInfo.winding_actionId !== '' ? `<a href = '/action/${layerInfo.winding_actionId}' > Winding Details </a>` : `[missing Winding Details]`);
  const soldering_link = (layerInfo.soldering_actionId !== '' ? `<a href = '/action/${layerInfo.soldering_actionId}' > Soldering Details </a>` : `[missing Soldering Details]`);
  const tensions_link = (layerInfo.tensions_actionId !== '' ? `<a href = '/action/${layerInfo.tensions_actionId}' > Tension Measurements </a>` : `[missing Tension Measurements]`);

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
        width: 2,
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
        width: 2,
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
        width: 4,
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
        width: 4,
        size: 'sm',
      }],
    },
    {
      label: 'Columns',
      key: 'columns2',
      type: 'columns',
      input: false,
      columns: [{
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
        components: [],
        width: 2,
        size: 'sm',
      },
      {
        components: [{
          key: 'wireLayer_winding_actionId',
          type: 'htmlelement',
          input: false,
          content: `<p><br> ${winding_link} </br></p>`,
        }],
        width: 2,
        size: 'sm',
      },
      {
        components: [{
          key: 'wireLayer_soldering_actionId',
          type: 'htmlelement',
          input: false,
          content: `<p><br> ${soldering_link} </br></p>`,
        }],
        width: 2,
        size: 'sm',
      }],
    },
    {
      label: 'Columns',
      key: 'columns3',
      type: 'columns',
      input: false,
      columns: [{
        components: [{
          label: 'Wire Bobbin Manufacturer(s)',
          key: 'bobbinManufacturer',
          type: 'textfield',
          input: true,
          defaultValue: layerInfo.bobbinManufacturers,
        }],
        width: 4,
        size: 'sm',
      },
      {
        components: [{
          label: 'Tension Measurements System',
          key: 'tensions_system',
          type: 'textfield',
          input: true,
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
          input: true,
          defaultValue: layerInfo.tensions_location,
        }],
        width: 2,
        size: 'sm',
      },
      {
        components: [{
          key: 'tensions_actionId',
          type: 'htmlelement',
          input: false,
          content: `<p><br> ${tensions_link} </br></p>`,
        }],
        width: 2,
        size: 'sm',
      },
      {
        components: [],
        width: 2,
        size: 'sm',
      }],
    },
    {
      components: [{
        label: 'Tension Measurements (Side A)',
        key: 'tensionMeasurements_A',
        type: 'NumberArray',
        input: false,
        units: 'Tension [N]',
        specification_nominal: 6.25,
        specification_toleranceInner: 2.25,
        defaultValue: layerInfo.tensions_A
      }]
    },
    {
      components: [{
        label: 'Tension Measurements (Side B)',
        key: 'tensionMeasurements_B',
        type: 'NumberArray',
        input: false,
        units: 'Tension [N]',
        specification_nominal: 6.25,
        specification_toleranceInner: 2.25,
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
          label: 'Cold Channel:',
          key: 'apaNCRs_wires_coldChannel',
          type: 'textfield',
          input: false,
          defaultValue: ncrInfo.coldChannel,
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
    const schema_qcSignoffs = SetSection_qcSignoffs(signoffInfo[0], signoffInfo[1], signoffInfo[2], signoffInfo[3], signoffInfo[4])

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
