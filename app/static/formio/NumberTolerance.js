var NumberComponent = Formio.Components.components.number;


/// This class describes a custom Formio component for inputting a number with a nominal value, tolerance range and minimum and maximum values
/// It extends the built-in 'number' Formio component
class NumberTolerance extends NumberComponent {

  // Base schema for the component (the built-in 'number' Formio component)
  static schema(...extend) {
    return NumberComponent.schema({
      label: 'Number with Tolerance',
      key: 'number_tolerance',
      type: 'NumberTolerance',
      input: true,
    }, ...extend);
  }

  // Getter functions
  static get builderInfo() {
    return {
      title: 'Number with Tolerance',
      group: 'custom',
      icon: 'arrows-h',
      weight: 72,
      documentation: '#',
      schema: NumberTolerance.schema()
    };
  }

  get defaultSchema() {
    return NumberTolerance.schema();
  }

  // Show the nominal input value and tolerance
  showNominal() {
    let nominal = '';

    if ('specification_nominal' in this.component) nominal = `Nominal: ${this.component.specification_nominal}`;
    if (('specification_nominal' in this.component) && ('specification_tolerance' in this.component)) nominal += ` &plusmn; ${this.component.specification_tolerance}`;
    if (this.component.units) nominal += ` ${this.component.units}`;
    if ('specification_minimum' in this.component) nominal += ` (Min.: ${this.component.specification_minimum})`;
    if ('specification_maximum' in this.component) nominal += ` (Max.: ${this.component.specification_maximum})`;

    this.specification_label.html(nominal).removeClass('warning');
  }

  // Check the inputted number against the nominal value and tolerance range
  checkValue(value) {
    this.showNominal();

    if (value === null) return;

    let warning = null;

    if (('specification_nominal' in this.component) && ('specification_tolerance' in this.component)) {
      if ((value - this.component.specification_nominal) > this.component.specification_tolerance) warning = 'Above tolerance!  ';
      if ((value - this.component.specification_nominal) < -this.component.specification_tolerance) warning = 'Below tolerance!  ';
    }

    if ('specification_minimum' in this.component) {
      if (value < this.component.specification_minimum) warning = 'Below minimum!  ';
    }

    if ('specification_maximum' in this.component) {
      if (value > this.component.specification_maximum) warning = 'Above maximum!  ';
    }

    if (warning) this.specification_label.prepend(`<span class = 'specification-warning'><em>${warning}</em></span>`);
  }

  // Render the component as an element on the page
  renderElement(value, index) {
    let tpl = `
      ${super.renderElement(value, index)}
      <div class = 'specification-label'></div>`;

    return tpl;
  }

  // After rendering the Formio component, attach it to an element of the page
  attach(element) {
    super.attach(element);
    this.specification_label = $('.specification-label', this.element);
    this.showNominal();
  }

  // Set the input field to a provided value, and check it against the specified nominal, tolerance, minimum and maximum values
  setValueAt(index, value, flags) {
    this.checkValue(value);

    return super.setValueAt(index, value, flags);
  }

  getValueAt(index) {
    const value = super.getValueAt(index);
    this.checkValue(value);

    return value;
  }
}


/// Function for updating the selection of available Formio components to include this one (on any 'Edit Type Form' page)
NumberTolerance.editForm = function (a, b, c) {
  const form = NumberComponent.editForm(a, b, c);
  const tabs = form.components.find(obj => { return obj.type === 'tabs' });
  let datatab = tabs.components.find(obj => { return obj.key == 'data' });

  datatab.components.splice(datatab.components.findIndex(obj => { return obj.key = 'multiple' }), 1);

  datatab.components.splice(1, 0,
    {
      type: 'number',
      key: 'specification_nominal',
      label: 'Nominal Value',
      placeholder: 'Nominal Value',
      tooltip: 'The nominal value that this number should take',
      input: true,
    },
    {
      type: 'number',
      key: 'specification_tolerance',
      label: 'Tolerance',
      tooltip: 'The allowed range (plus and minus) around the nominal value.  If the entered value is outside this range, a warning will be displayed',
      input: true,
    },
    {
      type: 'number',
      key: 'specification_minimum',
      label: 'Minimum Value',
      tooltip: 'If the entered value is less than this, a warning will be displayed',
      input: true,

    },
    {
      type: 'number',
      key: 'specification_maximum',
      label: 'Maximum Value',
      tooltip: 'If the entered value is greater than this, a warning will be displayed',
      input: true,
    },
    {
      type: 'textfield',
      key: 'units',
      label: 'Units',
      tooltip: 'Units of the entered value',
      input: true,
    },
  );

  return form;
}


/// Register this custom Formio component with the overall list of components that are available to use in Formio forms
Formio.Components.addComponent('NumberTolerance', NumberTolerance);
