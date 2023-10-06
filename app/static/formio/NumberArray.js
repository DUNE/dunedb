var TextFieldComponent = Formio.Components.components.textfield;
var gNumberArrayComponent = null;
var gNumberArrayComponentId = 0;


/// This class describes a custom Formio component for inputting an array of numbers
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
    const bounds = this.getBounds();

    tpl += `
      <div class = 'd-flex justify-content-around border'>
        <div class = 'align-self-center p-2'>
          <div>Entries: <span class = 'numberArrayLength'></span></div>
          <div>Min.: <span class = 'numberArrayMin'></span></div>
          <div>Max.: <span class = 'numberArrayMax'></span></div>
          ${isNaN(bounds[0].lo) ? '' : '<div>OoB (IL): <span class = "numberArrayOoBILo">n/a</span></div>'}
          ${isNaN(bounds[0].hi) ? '' : '<div>OoB (IH): <span class = "numberArrayOoBIHi">n/a</span></div>'}
          ${isNaN(bounds[1].lo) ? '' : '<div>OoB (OL): <span class = "numberArrayOoBOLo">n/a</span></div>'}
          ${isNaN(bounds[1].hi) ? '' : '<div>OoB (OH): <span class = "numberArrayOoBOHi">n/a</span></div>'}
          <div>NaNs: <span class = 'numberArrayNaNCount'></span></div>
        </div>
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

  // Get the upper and lower limits of data to use based on specified nominal, tolerance and minimum and maximum values
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
    $('span.numberArrayLength', this.element).text(numberOfEntries);
    $('span.numberArrayMin', this.element).text(min.toFixed(2));
    $('span.numberArrayMax', this.element).text(max.toFixed(2));
    $('span.numberArrayOoBIHi', this.element).text(oobIHi);
    $('span.numberArrayOoBILo', this.element).text(oobILo);
    $('span.numberArrayOoBOHi', this.element).text(oobOHi);
    $('span.numberArrayOoBOLo', this.element).text(oobOLo);
    $('span.numberArrayNaNCount', this.element).text(count_nans);

    // Draw the graph
    let graph = new Histogram(numberOfEntries, 0, numberOfEntries);
    graph.data = arr;
    graph.min_content = min;
    graph.max_content = max;

    let colorscale = new ColorScaleRGB(50, 50, 100);
    colorscale.min = min;
    colorscale.max = max;

    this.LizardGraph.SetHist(graph, colorscale);
    this.LizardGraph.SetMarkers([bounds[0].lo, bounds[0].hi, bounds[1].lo, bounds[1].hi]);
    this.LizardGraph.marker_color = 'rgba(100, 0,0, 0.5)';
    this.LizardGraph.Draw();

    // Draw the histogram
    let hist = new CreateGoodHistogram(Math.round((max - min) / 0.1) + 1, min, max);

    for (const x of arr) { hist.Fill(x); }

    this.LizardHistogram.SetHist(hist, colorscale);
    this.LizardHistogram.SetMarkers([bounds[0].lo, bounds[0].hi, bounds[1].lo, bounds[1].hi]);
    this.LizardHistogram.marker_color = 'rgba(100, 0,0, 0.5)';
    this.LizardHistogram.Draw();
  }

  // After rendering the Formio component, attach it to an element of the page
  attach(element) {
    this.loadRefs(element, { readonly_display: 'single' });
    super.attach(element);

    this.LizardGraph = new HistCanvas($('div.numberArrayGraph', this.element));
    this.LizardGraph.default_options.doDots = true;
    this.LizardGraph.default_options.doFill = false;
    this.LizardGraph.xlabel = 'Index of Wire or Wire Segment';
    this.LizardGraph.ylabel = this.component.units;

    this.LizardHistogram = new HistCanvas($('div.numberArrayHistogram', this.element));
    this.LizardHistogram.xlabel = this.component.units;
    this.LizardHistogram.ylabel = 'Entries';

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
      key: 'units',
      label: 'Units',
      tooltip: 'This is used as the scatter plot\'s vertical axis label, and the bar graph\'s horizontal axis label',
      input: true,
    },
  );

  return form;
}


/// Register this custom Formio component with the overall list of components that are available to use in Formio forms
Formio.Components.addComponent('NumberArray', NumberArray);
