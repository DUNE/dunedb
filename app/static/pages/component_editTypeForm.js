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
        type: 'checkbox',
        label: 'This is a Batch of Components',
        key: 'isBatch',
        input: true,
        defaultValue: false,
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
        tooltip: 'Tags that can be applied to this component type. Use the \'Trash\' tag to remove this type from use.',
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
    components: [],
    width: 12,
    size: 'md',
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
