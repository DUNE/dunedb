// Set up the schema for Section A
const schema_sectionA = {
  components: [{
    label: 'Section A - Properties',
    key: 'sectionA',
    type: 'textfield',
    input: true,
    hideLabel: true,
    defaultValue: 'Section A - Properties',
  },

  {
    label: 'Columns',
    key: 'columns',
    type: 'columns',
    input: false,
    columns: [{
      components: [{
        label: 'DUNE PID:',
        labelPosition: 'left-left',
        key: 'dunePID',
        type: 'textfield',
        labelWidth: 19,
        labelMargin: 1,
        input: true,
        defaultValue: collatedInformation.dunePID,
      }],
      width: 5,
      size: 'sm',
    },
    {
      components: [{
        label: 'Top or Bottom:',
        labelPosition: 'left-left',
        key: 'topOrBottom',
        type: 'textfield',
        labelWidth: 42,
        labelMargin: 1,
        input: true,
        defaultValue: collatedInformation.topOrBottom,
      }],
      width: 3,
      size: 'sm',
    },
    {
      components: [{
        label: 'Production Site:',
        labelPosition: 'left-left',
        key: 'productionSite',
        type: 'textfield',
        labelWidth: 33,
        labelMargin: 1,
        input: true,
        defaultValue: collatedInformation.productionSite,
      }],
      width: 4,
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
        label: 'Temp. Sensors Configuration:',
        labelPosition: 'left-left',
        key: 'tempSensors_config',
        type: 'textfield',
        labelWidth: 60,
        labelMargin: 1,
        input: true,
        defaultValue: collatedInformation.tempSensors_config
      }],
      width: 4,
      size: 'sm',
    },
    {
      components: [],
      width: 8,
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
        label: 'Temp. Sensor #1 SN:',
        labelPosition: 'left-left',
        key: 'tempSensors_serials1',
        type: 'textfield',
        labelWidth: 61,
        labelMargin: 1,
        input: true,
        defaultValue: collatedInformation.tempSensors_serials[0]
      }],
      width: 3,
      size: 'sm',
    },
    {
      components: [{
        label: 'Temp. Sensor #2 SN:',
        labelPosition: 'left-left',
        key: 'tempSensors_serials2',
        type: 'textfield',
        labelWidth: 61,
        labelMargin: 1,
        input: true,
        defaultValue: collatedInformation.tempSensors_serials[1]
      }],
      width: 3,
      size: 'sm',
    },
    {
      components: [{
        label: 'Temp. Sensor #3 SN:',
        labelPosition: 'left-left',
        key: 'tempSensors_serials3',
        type: 'textfield',
        labelWidth: 61,
        labelMargin: 1,
        input: true,
        defaultValue: collatedInformation.tempSensors_serials[2]
      }],
      width: 3,
      size: 'sm',
    },
    {
      components: [{
        label: 'Temp. Sensor #4 SN:',
        labelPosition: 'left-left',
        key: 'tempSensors_serials4',
        type: 'textfield',
        labelWidth: 61,
        labelMargin: 1,
        input: true,
        defaultValue: collatedInformation.tempSensors_serials[3]
      }],
      width: 3,
      size: 'sm',
    }],
  }]
}

// Set up the schema for a single wire-related non-conformance entry in Section B
function SetEntry_SectionB(wireInfo, hideHeader) {
  const schema_sectionB = {
    components: [{
      label: 'Section B - Wire Non-Conformances',
      key: 'sectionB',
      type: 'textfield',
      input: true,
      hideLabel: true,
      defaultValue: 'Section B - Wire Non-Conformances',
      hidden: hideHeader,
    },
    {
      label: 'Columns',
      key: 'columns',
      type: 'columns',
      input: false,
      columns: [{
        components: [{
          label: 'Layer & Side:',
          labelPosition: 'left-left',
          key: 'layerSide',
          type: 'textfield',
          labelWidth: 62,
          labelMargin: 1,
          input: true,
          defaultValue: wireInfo.layerSide,
        }],
        width: 2,
        size: 'sm',
      },
      {
        components: [{
          label: 'Head Board & Pad:',
          labelPosition: 'left-left',
          key: 'boardPad',
          type: 'textfield',
          labelWidth: 55,
          labelMargin: 1,
          input: true,
          defaultValue: wireInfo.boardPad,
        }],
        width: 3,
        size: 'sm',
      },
      {
        components: [{
          label: 'Cold Elec. Channel:',
          labelPosition: 'left-left',
          key: 'channel',
          type: 'textfield',
          labelWidth: 57,
          labelMargin: 1,
          input: true,
          defaultValue: wireInfo.channel,
        }],
        width: 3,
        size: 'sm',
      },
      {
        components: [{
          label: 'DB ID:',
          labelPosition: 'left-left',
          key: 'actionId_B',
          type: 'textfield',
          labelWidth: 15,
          labelMargin: 1,
          input: true,
          defaultValue: wireInfo.actionId,
        }],
        width: 4,
        size: 'sm',
      }],
    }]
  }

  return schema_sectionB;
}

// Set up the schema for a single non-wire non-conformance entry in Section C
function SetEntry_SectionC(nonConformanceInfo, hideHeader) {
  const schema_sectionC = {
    components: [{
      label: 'Section C - Other Non-Conformances',
      key: 'sectionC',
      type: 'textfield',
      input: true,
      hideLabel: true,
      defaultValue: 'Section C - Other Non-Conformances',
      hidden: hideHeader,
    },
    {
      label: 'Columns',
      key: 'columns',
      type: 'columns',
      input: false,
      columns: [{
        components: [{
          label: 'Type:',
          labelPosition: 'left-left',
          key: 'type',
          type: 'textfield',
          labelWidth: 15,
          labelMargin: 1,
          input: true,
          defaultValue: nonConformanceInfo.type,
        },
        {
          label: 'DB ID:',
          labelPosition: 'left-left',
          key: 'actionId_C',
          type: "textfield",
          labelWidth: 15,
          labelMargin: 1,
          input: true,
          defaultValue: nonConformanceInfo.actionId,
        }],
        width: 4,
        size: 'sm',
      },
      {
        components: [{
          label: 'Description:',
          labelPosition: 'left-left',
          autoExpand: true,
          key: 'description',
          type: 'textarea',
          labelWidth: 12,
          labelMargin: 1,
          input: true,
          defaultValue: nonConformanceInfo.description,
        }],
        width: 8,
        size: 'sm',
      }],
    }]
  }

  return schema_sectionC;
}

// Run a specific function when the page is loaded
window.addEventListener('load', populateExecutiveSummary);


// Function to run when the page is loaded
async function populateExecutiveSummary() {
  // Render the 'Section A' form in the corresponding page element
  Formio.createForm(document.getElementById('form_sectionA'), schema_sectionA, { readOnly: true, });

  // Render the 'Section B' forms, one for each wire-related non-conformance and displayed in its own individual entry
  $('div.wireEntry').each(function () {
    const form_sectionB = $('.form_sectionB', this);
    const wireInfo = form_sectionB.data('record');
    const schema_sectionB = SetEntry_SectionB(wireInfo[0], wireInfo[1])

    Formio.createForm(form_sectionB[0], schema_sectionB, { readOnly: true, });
  })

  // Render the 'Section C' forms, one for each non-wire non-conformance and displayed in its own individual entry
  // The 'Section C' header will be rendered once, above the first non-conformance entry
  $('div.nonConformanceEntry').each(function () {
    const form_sectionC = $('.form_sectionC', this);
    const nonConformanceInfo = form_sectionC.data('record');
    const schema_sectionC = SetEntry_SectionC(nonConformanceInfo[0], nonConformanceInfo[1])

    Formio.createForm(form_sectionC[0], schema_sectionC, { readOnly: true, });
  })
}
