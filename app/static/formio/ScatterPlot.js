var TextFieldComponent = Formio.Components.components.textfield;
var gScatterPlotComponent = null;
var gScatterPlotComponentId = 0;


/// This class describes a custom Formio component for inputting an array of numbers, and displaying the numbers as a scatter plot
/// It extends the built-in 'text field' Formio component
class ScatterPlot extends TextFieldComponent {

  // Base schema for the component (the built-in 'text field' Formio component)
  static schema(...extend) {
    return TextFieldComponent.schema({
      label: 'Scatter Plot',
      placeholder: 'Enter comma-delimited values here',
      customClass: 'component-scatterplot-formio',
      errorLabel: 'Values cannot be parsed!',
      key: 'scatter_plot',
      type: 'ScatterPlot',
      input: true,
      defaultValue: [],
    }, ...extend);
  }

  // Getter functions
  static get builderInfo() {
    return {
      title: 'Scatter Plot',
      group: 'custom',
      icon: 'bar-chart',
      weight: 72,
      documentation: '#',
      schema: ScatterPlot.schema()
    };
  }

  get defaultSchema() {
    return ScatterPlot.schema();
  }

  get emptyValue() {
    return [];
  }

  // Render the component as an element on the page
  renderElement(value, index) {
    if (!value) value = this.parseText('');
    if (value.data) value = value.data;

    const textvalue = value.join(',');
    gScatterPlotComponentId++;

    let tpl = super.renderElement(textvalue, index);
    const bounds = this.getBounds();

    tpl += `
      <div class = 'd-flex justify-content-around border'>
        <div class = 'align-self-center p-2'>
          <div>Entries: <span class = 'scatterPlotLength'></span></div>
          <div>Min.: <span class = 'scatterPlotMin'></span></div>
          <div>Max.: <span class = 'scatterPlotMax'></span></div>
          ${isNaN(bounds[0].lo) ? '' : '<div>OoB (IL): <span class = "scatterPlotOoBILo">n/a</span></div>'}
          ${isNaN(bounds[0].hi) ? '' : '<div>OoB (IH): <span class = "scatterPlotOoBIHi">n/a</span></div>'}
          ${isNaN(bounds[1].lo) ? '' : '<div>OoB (OL): <span class = "scatterPlotOoBOLo">n/a</span></div>'}
          ${isNaN(bounds[1].hi) ? '' : '<div>OoB (OH): <span class = "scatterPlotOoBOHi">n/a</span></div>'}
          <div>NaNs: <span class = 'scatterPlotNaNCount'></span></div>
        </div>
        <div class = 'flex-grow-1 p-4 scatterPlotGraph' style = 'height: 200px; width: 480px;'></div>
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
    gScatterPlotComponent = this;

    // Normalize the input values
    let arr = value || [];
    let min = 1e99;
    let max = -1e99;
    let count_nans = 0;

    if (arr.length < 1) {
      min = 0
      max = 0;
    }

    // Count the number of entries outside the out-of-bounds limits, and calculate the minimum and maximum entry values
    const bounds = this.getBounds();
    let oobIHi = 0;
    let oobILo = 0;
    let oobOHi = 0;
    let oobOLo = 0;

    for (let i = 0; i < arr.length; i++) {
      const x = parseFloat(arr[i]);

      if (isNaN(x)) { count_nans++; }
      else {
        min = Math.min(min, x);
        max = Math.max(max, x);

        if (x > bounds[0].hi) oobIHi++;
        if (x < bounds[0].lo) oobILo++;

        if (x > bounds[1].hi) oobOHi++;
        if (x < bounds[1].lo) oobOLo++;

        arr[i] = x;
      }
    }

    const numberOfEntries = arr.length;

    // Set the displayed text information
    $('span.scatterPlotLength', this.element).text(numberOfEntries);
    $('span.scatterPlotMin', this.element).text(min.toFixed(2));
    $('span.scatterPlotMax', this.element).text(max.toFixed(2));
    $('span.scatterPlotOoBIHi', this.element).text(oobIHi);
    $('span.scatterPlotOoBILo', this.element).text(oobILo);
    $('span.scatterPlotOoBOHi', this.element).text(oobOHi);
    $('span.scatterPlotOoBOLo', this.element).text(oobOLo);
    $('span.scatterPlotNaNCount', this.element).text(count_nans);

    // Draw the scatter plot
    let colorscale = new ColorScaleRGB(50, 50, 100);
    colorscale.min = min;
    colorscale.max = max;

    let graph = new Histogram(numberOfEntries, 0, numberOfEntries);

    graph.data = arr;
    graph.min_content = min;
    graph.max_content = max;

    this.LizardGraph.SetHist(graph, colorscale);
    this.LizardGraph.SetMarkers([bounds[0].lo, bounds[0].hi, bounds[1].lo, bounds[1].hi]);
    this.LizardGraph.marker_color = 'rgba(100, 0,0, 0.5)';
    this.LizardGraph.Draw();
  }

  // After rendering the Formio component, attach it to an element of the page
  attach(element) {
    this.loadRefs(element, { readonly_display: 'single' });
    super.attach(element);

    this.LizardGraph = new HistCanvas($('div.scatterPlotGraph', this.element));
    this.LizardGraph.default_options.doDots = true;
    this.LizardGraph.default_options.doFill = false;
    this.LizardGraph.xlabel = this.component.xtitle;
    this.LizardGraph.ylabel = this.component.units;

    if (this.arrayValue) this.updateExtras(this.arrayValue);

    let self = this;

    $('.collapse', this.element).on('shown.bs.collapse', function () {
      self.LizardGraph.Resize();
      self.LizardGraph.Draw();
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
ScatterPlot.editForm = function (a, b, c) {
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
      tooltip: 'Any values outside the expected inner range = [nominal +/- inner tolerance] will be counted and indicated',
      input: true,
    },
    {
      type: 'number',
      key: 'specification_toleranceOuter',
      label: 'Outer Tolerance',
      tooltip: 'Any values outside the expected outer range = [nominal +/- outer tolerance] will be counted and indicated',
      input: true,
    },
    {
      type: 'textfield',
      key: 'xtitle',
      label: 'X Axis Label',
      tooltip: 'This is used as the scatter plot\'s horizontal axis label',
      input: true,
    },
    {
      type: 'textfield',
      key: 'units',
      label: 'Units',
      tooltip: 'This is used as the scatter plot\'s vertical axis label',
      input: true,
    },
  );

  return form;
}


/// Register this custom Formio component with the overall list of components that are available to use in Formio forms
Formio.Components.addComponent('ScatterPlot', ScatterPlot);
