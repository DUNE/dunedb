var TextFieldComponent = Formio.Components.components.textfield;
var gNumberArrayNoPlotsComponent = null;
var gNumberArrayNoPlotsComponentId = 0;


/// This class describes a custom Formio component for inputting an array of values
/// It extends the built-in 'text field' Formio component
class NumberArray_NoPlots extends TextFieldComponent {

  // Base schema for the component (the built-in 'text field' Formio component)
  static schema(...extend) {
    return TextFieldComponent.schema({
      label: 'Number Array (No Plots)',
      placeholder: 'Enter comma-delimited values here',
      customClass: 'component-numbarraynoplots-formio',
      errorLabel: 'Values cannot be parsed!',
      key: 'number_array_no_plots',
      type: 'NumberArray_NoPlots',
      input: true,
      defaultValue: [],
    }, ...extend);
  }

  // Getter functions
  static get builderInfo() {
    return {
      title: 'Number Array (No Plots)',
      group: 'custom',
      icon: 'bar-chart',
      weight: 72,
      documentation: '#',
      schema: NumberArray_NoPlots.schema()
    };
  }

  get defaultSchema() {
    return NumberArray_NoPlots.schema();
  }

  get emptyValue() {
    return [];
  }

  // Render the component as an element on the page
  renderElement(value, index) {
    if (!value) value = this.parseText('');
    if (value.data) value = value.data;

    const textvalue = value.join(',');
    gNumberArrayNoPlotsComponentId++;

    let tpl = super.renderElement(textvalue, index);

    return tpl;
  }

  // Parse the comma-delimited input values into an array of individual data values
  parseText(text) {
    text = text || '';
    const arr = text.split(',');

    return arr;
  }

  // Update the various sub-parts of this component
  updateExtras(value) {
    gNumberArrayNoPlotsComponent = this;

    let arr = value || [];

    for (let i = 0; i < arr.length; i++) {
      const x = parseFloat(arr[i]);

      if (!isNaN(x)) { arr[i] = x; }
    }
  }

  // After rendering the Formio component, attach it to an element of the page
  attach(element) {
    this.loadRefs(element, { readonly_display: 'single' });
    super.attach(element);

    if (this.arrayValue) this.updateExtras(this.arrayValue);
  }

  // Set the input field to a provided value, and update the various sub-parts of the component
  setValue(value, flags) {
    let arr = value || [];

    if (!Array.isArray(arr)) arr = [value];

    this.arrayValue = arr;
    this.textValue = arr.join(',');
    this.updateExtras(this.arrayValue);

    const input = this.performInputMapping(this.refs.input[0]);
    input.value = this.textValue;

    return super.setValue(this.textValue, flags);
  }

  getValueAt(index) {
    const textvalue = this.refs.input[index].value;
    const value = this.parseText(textvalue);
    this.updateExtras(value);

    return value;
  }
}


/// Function for updating the selection of available Formio components to include this one (on any 'Edit Type Form' page)
NumberArray_NoPlots.editForm = function (a, b, c) {
  const form = TextFieldComponent.editForm(a, b, c);
  const tabs = form.components.find(obj => { return obj.type === 'tabs' });
  let datatab = tabs.components.find(obj => { return obj.key == 'data' });

  datatab.components.splice(datatab.components.findIndex(obj => { return obj.key = 'multiple' }), 1);

  return form;
}


/// Register this custom Formio component with the overall list of components that are available to use in Formio forms
Formio.Components.addComponent('NumberArray_NoPlots', NumberArray_NoPlots);
