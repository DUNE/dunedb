var builder_wizard = false;

var metaschema = 
{
  "components": [
  {
    "label": "Columns",
    "columns": [
    {
      "components": [
      {
        "label": "Form Name:",
        "spellcheck": true,
        "tableView": true,
        "validate": {"unique": false,
                     "required": true,
                     "multiple": false},
        "key": "formName",
        "type": "textfield",
        "input": true
      }],
      
      "width": 6,
      "offset": 0,
      "push": 0,
      "pull": 0,
      "size": "md"
    },
    
    {
      "components": [
      {
        "label": "Form ID:",
        "disabled": true,
        "tableView": false,
        "validate": {"unique": false,
                     "multiple": false},
        "key": "formId",
        "type": "textfield",
        "input": true
      }],
      
      "width": 6,
      "offset": 0,
      "push": 0,
      "pull": 0,
      "size": "md"
    },
    
    {
      "components": [
      {
        "label": "Last Revised On:",
        "disabled": true,
        "tableView": false,
        "enableMinDateInput": false,
        "datePicker": {"disableWeekends": false,
                       "disableWeekdays": false},
        "enableMaxDateInput": false,
        "key": "insertion.insertDate",
        "type": "datetime",
        "input": true,
        "widget": {"type": "calendar",
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
                   "maxDate": null},
        "hideOnChildrenHidden": false
      }],
      
      "width": 6,
      "offset": 0,
      "push": 0,
      "pull": 0,
      "size": "md"
    },
    
    {
      "components": [
      {
        "label": "Version:",
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
      }],
      
      "width": 6,
      "offset": 0,
      "push": 0,
      "pull": 0,
      "size": "md"
    },
    
    {
      "components": [
      {
        "label": "Last Revised By:",
        "disabled": true,
        "tableView": true,
        "key": "insertion.user.displayName",
       "type": "textfield",
        "input": true,
        "hideOnChildrenHidden": false
      }],
      
      "width": 6,
      "offset": 0,
      "push": 0,
      "pull": 0,
      "size": "md"
    },
    
    {
      "components": [
      {
        "label": "These changes take effect on:",
        "tableView": false,
        "enableMinDateInput": false,
        "datePicker": {"disableWeekends": false,
                       "disableWeekdays": false},
        "enableMaxDateInput": false,
        "key": "validity.startDate",
        "type": "datetime",
        "input": true,
        "widget": {"type": "calendar",
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
                   "maxDate": null},
        "hideOnChildrenHidden": false
      }],
      
      "width": 6,
      "offset": 0,
      "push": 0,
      "pull": 0,
      "size": "md"
    },
    
    {
      "components": [],
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
        "tooltip": "Test or job types that this component relates to. Use the 'Trash' tag to remove this component type from public view.",
        "tableView": false,
        "storeas": "array",
        "key": "tags",
        "type": "tags",
        "input": true
      }],
      
      "width": 6,
      "offset": 0,
      "push": 0,
      "pull": 0,
      "size": "md"
    }],
    
    "tableView": false,
    "key": "columns",
    "type": "columns",
    "input": false
  },
  
  {
    "label": "formbuilder",
    "tag": "div",
    "className": "formbuilder_area",
    "attrs": [{"attr": "",
               "value": ""}],
    "refreshOnChange": false,
    "tableView": false,
    "key": "formbuilder",
    "type": "htmlelement",
    "input": false,
    "validate": {"unique": false,
                 "multiple": false}
  },
  
  {
    "label": "schema",
    "key": "schema",
    "type": "hidden",
    "input": true,
    "tableView": false,
    "validate": {"unique": false,
                 "multiple": false}
  },
  
  {
    "components": [],
    "width": 12,
    "offset": 0,
    "push": 0,
    "pull": 0,
    "size": "md"
  },
  
  {
    "label": "Submit Changes",
    "showValidations": false,
    "theme": "info",
    "disableOnInvalid": true,
    "tableView": false,
    "key": "submit",
    "type": "button",
    "input": true,
    "validate": {"unique": false,
                 "multiple": false}
  }]
};
