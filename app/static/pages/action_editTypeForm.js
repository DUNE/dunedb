// Set the flag for whether to use the built-in Formio form builder or not
const builder_wizard = false;

// Set up the 'metaschema' block using Formio form components
// This block will appear at the top of the 'Edit Action Type Form' page
const metaschema = {
  components: [{
    type: 'columns',
    label: 'Columns',
    key: 'columns',
    input: false,
    columns: [{
      width: 6,
      size: 'md',
      components: [{
        type: 'textfield',
        label: 'Type Form Name:',
        key: 'formName',
        validate: {
          required: true,
          unique: false,
          multiple: false,
        },
        input: true,
      }],
    },

    {
      width: 6,
      size: 'md',
      components: [{
        type: 'textfield',
        label: 'Type Form ID:',
        key: 'formId',
        validate: {
          required: true,
          unique: false,
          multiple: false,
        },
        input: true,
        disabled: true,
      }],
    },

    {
      width: 6,
      size: 'md',
      components: [{
        type: 'datetime',
        label: 'Last Revised On:',
        key: 'insertion.insertDate',
        input: true,
        disabled: true,
        enableMinDateInput: false,
        enableMaxDateInput: false,
        datePicker: {
          disableWeekends: false,
          disableWeekdays: false,
        },
        widget: {
          type: 'calendar',
          displayInTimezone: 'viewer',
          language: 'en',
          useLocaleSettings: false,
          allowInput: true,
          mode: 'single',
          enableTime: true,
          noCalendar: false,
          format: 'yyyy-MM-dd hh:mm a',
          hourIncrement: 1,
          minuteIncrement: 1,
          time_24hr: false,
          minDate: null,
          disableWeekends: false,
          disableWeekdays: false,
          maxDate: null,
        },
      }],
    },

    {
      width: 6,
      size: 'md',
      components: [{
        type: 'number',
        label: 'New Version Number:',
        key: 'validity.version',
        input: true,
        disabled: true,
        inputFormat: 'plain',
      }],
    },

    {
      width: 6,
      size: 'md',
      components: [{
        type: 'textfield',
        label: 'Last Revised By:',
        key: 'insertion.user.displayName',
        input: true,
        disabled: true,
      }],
    },

    {
      width: 6,
      size: 'md',
      components: [{
        type: 'datetime',
        label: 'New Version Valid:',
        key: 'validity.startDate',
        input: true,
        enableMinDateInput: false,
        enableMaxDateInput: false,
        datePicker: {
          disableWeekends: false,
          disableWeekdays: false,
        },
        widget: {
          type: 'calendar',
          displayInTimezone: 'viewer',
          language: 'en',
          useLocaleSettings: false,
          allowInput: true,
          mode: 'single',
          enableTime: true,
          noCalendar: false,
          format: 'yyyy-MM-dd hh:mm a',
          hourIncrement: 1,
          minuteIncrement: 1,
          time_24hr: false,
          minDate: null,
          disableWeekends: false,
          disableWeekdays: false,
          maxDate: null,
        },
      }],
    },

    {
      width: 6,
      size: 'md',
      components: [{
        type: 'select',
        label: 'Recommended Component Types (click to add):',
        key: 'componentTypes',
        validate: { multiple: true, },
        widget: 'choicesjs',
        tooltip: 'Component types that this action type is recommended to be performed on. May be left empty if no specific component types are recommended.',
        multiple: true,
        dataSrc: 'url',
        data: {
          values: [{
            label: '',
            value: '',
          }],
          url: '/json/componentForms/list',
          headers: [{
            key: '',
            value: '',
          }],
        },
        valueProperty: 'formName',
        selectThreshold: 0.3,
        template: '<span>{{ item.formName }}</span>',
        indexeddb: { 'filter': {} },
      }],
    },

    {
      width: 6,
      size: 'md',
      components: [{
        type: 'tags',
        label: 'Tags (type to add):',
        key: 'tags',
        input: true,
        tooltip: 'Tags that can be applied to this action type. Use the \'Trash\' tag to remove this type from use.',
        storeas: 'array',
      }],
    }],
  },

  {
    type: 'htmlelement',
    label: 'formbuilder',
    key: 'formbuilder',
    validate: {
      unique: false,
      multiple: false,
    },
    input: false,
    className: 'formbuilder_area',
    tag: 'div',
    attrs: [{
      attr: '',
      value: ''
    }],
    refreshOnChange: false,
  },

  {
    type: 'hidden',
    label: 'schema',
    key: 'schema',
    validate: {
      unique: false,
      multiple: false,
    },
    input: true,
  },

  {
    width: 12,
    size: 'md',
    components: [],
  },

  {
    type: 'button',
    label: 'Submit Changes',
    key: 'submit',
    validate: {
      unique: false,
      multiple: false,
    },
    input: true,
    theme: 'btn btn-success',
    showValidations: false,
    disableOnInvalid: true,
  }],
};
