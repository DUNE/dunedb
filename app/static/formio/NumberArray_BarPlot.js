var TextFieldComponent = Formio.Components.components.textfield;
var gNumberArrayBarPlotComponent = null;
var gNumberArrayBarPlotComponentId = 0;


/// This class describes a custom Formio component for inputting an array of values, and displaying them using a bar plot
/// It extends the built-in 'text field' Formio component
class NumberArray_BarPlot extends TextFieldComponent {

  // Base schema for the component (the built-in 'text field' Formio component)
  static schema(...extend) {
    return TextFieldComponent.schema({
      label: 'Number Array (Bar Plot)',
      placeholder: 'Enter comma-delimited values here',
      customClass: 'component-numberarraybarplot-formio',
      errorLabel: 'Values cannot be parsed!',
      key: 'number_array_bar_plot',
      type: 'NumberArray_BarPlot',
      input: true,
      defaultValue: [],
    }, ...extend);
  }

  // Getter functions
  static get builderInfo() {
    return {
      title: 'Number Array (Bar Plot)',
      group: 'custom',
      icon: 'bar-chart',
      weight: 72,
      documentation: '#',
      schema: NumberArray_BarPlot.schema()
    };
  }

  get defaultSchema() {
    return NumberArray_BarPlot.schema();
  }

  get emptyValue() {
    return [];
  }

  // Render the component as an element on the page
  renderElement(value, index) {
    if (!value) value = this.parseText('');
    if (value.data) value = value.data;

    const textvalue = value.join(',');
    gNumberArrayBarPlotComponentId++;

    let tpl = super.renderElement(textvalue, index);

    tpl += `
      <div class = 'd-flex justify-content-around border'>
        <div class = 'flex-grow-1 p-4 numberArrayBarPlotBar' style = 'height: 200px; width: 480px;'></div>
      </div>`;

    return tpl;
  }

  // Parse the comma-delimited input values into an array of individual data values
  parseText(text) {
    text = text || '';
    const arr = text.split(',');

    return arr;
  }

  // Determine the upper and lower bounds based on specified nominal, inner tolerance and outer tolerance values
  // Note that these bounds are only used for display purposes - the input values are NOT cut or removed if outside the bounds
  getBounds() {
    let boundsInner = {
      lo: NaN,
      hi: NaN,
    };

    if (('specification_nominal' in this.component) && ('specification_toleranceInner' in this.component)) {
      boundsInner.lo = this.component.specification_nominal - this.component.specification_toleranceInner;
      boundsInner.hi = this.component.specification_nominal + this.component.specification_toleranceInner;
    }

    let boundsOuter = {
      lo: NaN,
      hi: NaN,
    };

    if (('specification_nominal' in this.component) && ('specification_toleranceOuter' in this.component)) {
      boundsOuter.lo = this.component.specification_nominal - this.component.specification_toleranceOuter;
      boundsOuter.hi = this.component.specification_nominal + this.component.specification_toleranceOuter;
    }

    return [boundsInner, boundsOuter];
  }

  // Update the various sub-parts of this component
  updateExtras(value) {
    gNumberArrayBarPlotComponent = this;

    // Set the axis ranges (y-axis limits on the scatter plot, x-axis limits on the bar graph) and calculate the data bounds
    let arr = value || [];
    let min = 1e99;
    let max = -1e99;

    if (arr.length < 1) {
      min = 0
      max = 0;
    }

    const bounds = this.getBounds();

    for (let i = 0; i < arr.length; i++) {
      const x = parseFloat(arr[i]);

      if (!isNaN(x)) {
        min = Math.min(min, x);
        max = Math.max(max, x);

        arr[i] = x;
      }
    }

    const numberOfEntries = arr.length;

    // Draw the bar plot
    let colorscale = new ColorScaleRGB(50, 50, 100);
    colorscale.min = min;
    colorscale.max = max;

    let hist = new CreateGoodHistogram(Math.round((max - min) / 0.1) + 1, min, max);

    for (const x of arr) { hist.Fill(x); }

    this.LizardHistogram.SetHist(hist, colorscale);
    this.LizardHistogram.SetMarkers([bounds[0].lo, bounds[0].hi, bounds[1].lo, bounds[1].hi]);
    this.LizardHistogram.marker_color = 'rgba(100, 0,0, 0.5)';
    this.LizardHistogram.xlabel = this.component.units;
    this.LizardHistogram.ylabel = 'Entries';
    this.LizardHistogram.Draw();
  }

  // After rendering the Formio component, attach it to an element of the page
  attach(element) {
    this.loadRefs(element, { readonly_display: 'single' });
    super.attach(element);

    this.LizardHistogram = new HistCanvas($('div.numberArrayBarPlotBar', this.element));

    if (this.arrayValue) this.updateExtras(this.arrayValue);

    let self = this;

    $('.collapse', this.element).on('shown.bs.collapse', function () {
      self.LizardHistogram.Resize();
      self.LizardHistogram.Draw();
    });
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
NumberArray_BarPlot.editForm = function (a, b, c) {
  const form = TextFieldComponent.editForm(a, b, c);
  const tabs = form.components.find(obj => { return obj.type === 'tabs' });
  let datatab = tabs.components.find(obj => { return obj.key == 'data' });

  datatab.components.splice(datatab.components.findIndex(obj => { return obj.key = 'multiple' }), 1);

  datatab.components.splice(1, 0,
    {
      type: 'number',
      key: 'specification_nominal',
      label: 'Nominal Value',
      placeholder: 'Nominal Value',
      tooltip: 'Expected inner range = [nominal +/- inner tolerance], and/or expected outer range = [nominal +/- outer tolerance]',
      input: true,
    },
    {
      type: 'number',
      key: 'specification_toleranceInner',
      label: 'Inner Tolerance',
      tooltip: 'Expected inner range = [nominal +/- inner tolerance]',
      input: true,
    },
    {
      type: 'number',
      key: 'specification_toleranceOuter',
      label: 'Outer Tolerance',
      tooltip: 'Expected outer range = [nominal +/- outer tolerance]',
      input: true,
    },
    {
      type: 'textfield',
      key: 'units',
      label: 'Units',
      tooltip: 'This is used as the bar plot\'s horizontal axis label',
      input: true,
    },
  );

  return form;
}


/// Register this custom Formio component with the overall list of components that are available to use in Formio forms
Formio.Components.addComponent('NumberArray_BarPlot', NumberArray_BarPlot);
