var TextFieldComponent = Formio.Components.components.textfield;
var gNumberArrayComponent = null;
var gNumberArrayComponentId = 0;


/// This class describes a custom Formio component for inputting an array of numbers, and displaying the numbers as scatter and bar plots
/// It extends the built-in 'text field' Formio component
class NumberArray extends TextFieldComponent {

  // Base schema for the component (the built-in 'text field' Formio component)
  static schema(...extend) {
    return TextFieldComponent.schema({
      label: 'Number Array',
      placeholder: 'Enter comma-delimited values here',
      customClass: 'component-numbarray-formio',
      errorLabel: 'Values cannot be parsed!',
      key: 'number_array',
      type: 'NumberArray',
      input: true,
      defaultValue: [],
    }, ...extend);
  }

  // Getter functions
  static get builderInfo() {
    return {
      title: 'Number Array',
      group: 'custom',
      icon: 'bar-chart',
      weight: 72,
      documentation: '#',
      schema: NumberArray.schema()
    };
  }

  get defaultSchema() {
    return NumberArray.schema();
  }

  get emptyValue() {
    return [];
  }

  // Render the component as an element on the page
  renderElement(value, index) {
    if (!value) value = this.parseText('');
    if (value.data) value = value.data;

    const textvalue = value.join(',');
    gNumberArrayComponentId++;

    let tpl = super.renderElement(textvalue, index);

    tpl += `
      <div class = 'd-flex justify-content-around border'>
        <div class = 'flex-grow-1 p-4 numberArrayGraph' style = 'height: 200px; width: 240px;'></div>
        <div class = 'flex-grow-1 p-4 numberArrayHistogram' style = 'height: 200px; width: 240px;'></div>
      </div>`;

    return tpl;
  }

  // Parse the comma-delimited input values into an array of individual data values
  parseText(text) {
    text = text || '';
    const arr = text.split(',');

    return arr;
  }

  // Get the upper and lower limits of data to use based on specified nominal, inner tolerance and outer tolerance values
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
    gNumberArrayComponent = this;

    // Normalize the input values
    let arr = value || [];
    let min = 1e99;
    let max = -1e99;

    if (arr.length < 1) {
      min = 0
      max = 0;
    }

    // Calculate the minimum and maximum entry values
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

    // Draw the scatter plot
    let colorscale = new ColorScaleRGB(50, 50, 100);
    colorscale.min = min;
    colorscale.max = max;

    let firstWireNumber = 0;
    let scatterPlotXLabel = 'Measurement Index';

    if (numberOfEntries < 800) {    // X and G wire layers have 480 and 481 entries respectively
      firstWireNumber = 1;
      scatterPlotXLabel = 'Wire #';
    } else {                        // V and U wire layers have 1139 and 1141 entries respectively
      firstWireNumber = 8;
      scatterPlotXLabel = 'Segment #';
    }

    let graph = new Histogram(numberOfEntries, firstWireNumber, numberOfEntries + firstWireNumber);

    graph.data = arr;
    graph.min_content = min;
    graph.max_content = max;

    this.LizardGraph.SetHist(graph, colorscale);
    this.LizardGraph.SetMarkers([bounds[0].lo, bounds[0].hi, bounds[1].lo, bounds[1].hi]);
    this.LizardGraph.marker_color = 'rgba(100, 0,0, 0.5)';
    this.LizardGraph.xlabel = scatterPlotXLabel;
    this.LizardGraph.ylabel = this.component.units;
    this.LizardGraph.Draw();

    // Draw the bar plot
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

    this.LizardGraph = new HistCanvas($('div.numberArrayGraph', this.element));
    this.LizardGraph.default_options.doDots = true;
    this.LizardGraph.default_options.doFill = false;

    this.LizardHistogram = new HistCanvas($('div.numberArrayHistogram', this.element));

    let readOnlyDisplay = this.refs.readonly_display;

    this.LizardGraph.DoMouseClick = function (ev, u, v) {
      const index = parseInt(u);
      let elem = readOnlyDisplay.children[index];

      if (elem) {
        readOnlyDisplay.scrollLeft = elem.offsetLeft - 100;
        $(elem).stop().fadeOut(250).fadeIn(250);
      }
    }

    if (this.arrayValue) this.updateExtras(this.arrayValue);

    let self = this;

    $('.collapse', this.element).on('shown.bs.collapse', function () {
      self.LizardGraph.Resize();
      self.LizardGraph.Draw();
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
NumberArray.editForm = function (a, b, c) {
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
      tooltip: 'This is used as the scatter plot\'s vertical axis label, and the bar plot\'s horizontal axis label',
      input: true,
    },
  );

  return form;
}


/// Register this custom Formio component with the overall list of components that are available to use in Formio forms
Formio.Components.addComponent('NumberArray', NumberArray);
