///
/// Custom component for lists of numbers.
///
/// Basically sets some good defaults for what a UUID should look like
///
/// To do: add default validation technique.
///


// Formio.Components.components.file.builderInfo.schema=Formio.Components.components.file.schema();
var TextFieldComponent = Formio.Components.components.textfield;

var gArrayComp;

class ArrayComponent extends TextFieldComponent{
  static schema(...extend) {
    return TextFieldComponent.schema({
      "label": "Array Data",
      "placeholder": "paste comma-delimted values here",
      "customClass": "component-array-sietch",
      "errorLabel": "Does not parse",
      "key": "array",
      "type": "ArrayComponent",
      "input": true  ,
      "defaultValue": [],
      "specification_minimum": 3,
      "specification_maximum": 12,
      "units": "Value"
    }, ...extend);
  }

  static get builderInfo() {
    return {
      title: 'Array of numbers',
      group: 'custom',
      icon: 'bar-chart',
      weight: 72,
      documentation: '#', 
      schema: ArrayComponent.schema()
     };
  }

  get emptyValue() {
    return [];
  }
  
  renderElement(value, index) {
    if (!value) value = this.parseText('');
    if (value.data) value = value.data; // Backward comp
    var textvalue = value.join(',');
    gArrayComponentId++;
    
    var tpl = super.renderElement(textvalue, index);
    var bounds = this.getBounds();
      
    tpl += `
      <div class="d-flex justify-content-around border">
        <div class="align-self-center p-2">
          <div>Number of Wires: <span class='arrayComponentLength'></span></div>
          <div>Min. Tension (N): <span class='arrayComponentMin'></span></div>
          <div>Max. Tension (N): <span class='arrayComponentMax'></span></div>
          <div>Mean Tension (N): <span class='arrayComponentMean'></span></div>
          <div>RMS Tension (N): <span class='arrayComponentRMS'></span></div>
          ${isNaN(bounds.hi) ? "" : "<div>Out-of-Spec High: <span class='arrayComponentOobHi'>n/a</span></div>"};
          ${isNaN(bounds.lo) ? "" : "<div>Out-of-Spec Low: <span class='arrayComponentOobLo'>n/a</span></div>"};
        </div>
        <div class='flex-grow-1 p-4 arrayComponentGraph' style='height: 200px; width: 240px;'></div>
        <div class='flex-grow-1 p-4 arrayComponentHistogram' style='height: 200px; width: 240px;'></div>
      </div>`;

    return tpl;
  }

  parseText(text) {
    text = text || "";
    var arr = text.split(',');
    return arr;
  }

  getBounds() {
    var bounds = { lo:NaN, hi:NaN };
    if (('specification_nominal' in this.component) && ('specification_tolerance' in this.component)) {
      bounds.lo = this.component.specification_nominal - this.component.specification_tolerance;
      bounds.hi = this.component.specification_nominal + this.component.specification_tolerance;
    }
    if ('specification_minimum' in this.component) bounds.lo = this.component.specification_minimum;
    if ('specification_maximum' in this.component) bounds.hi = this.component.specification_maximum;
    return bounds;
  }

  updateExtras(value) {
    gArrayComp = this;
    // Normalize the input value.
    var arr = value || [];
    var min = 1e99; // Number.MAX_VALUE;
    var max = -1e99; // Number.MIN_VALUE;
    var non_numeric = 0;
    if(arr.length<1) { min=0; max=0; }

    // Out of bounds limits:
    var bounds = this.getBounds();
    var oobHi = 0;
    var oobLo = 0;
    for (var i=0; i < arr.length; i++) {
      var x = parseFloat(arr[i]);
      if (isNaN(x)) non_numeric++;
      else {        
        min = Math.min(min,x);
        max = Math.max(max,x);
        if (x > bounds.hi) oobHi++; // If bounds are NaN, tests always return false.
        if (x < bounds.lo) oobLo++;
        arr[i] = x;        
      }
    }
    var len = arr.length;

    $("span.arrayComponentLength", this.element).text(len);
    $("span.arrayComponentMin", this.element).text(min.toFixed(2));
    $("span.arrayComponentMax", this.element).text(max.toFixed(2));
    $("span.arrayComponentOobHi", this.element).text(oobHi.toFixed(2));
    $("span.arrayComponentOobLo", this.element).text(oobLo.toFixed(2));

    // Graph.
    var graph = new Histogram(len, 0, len);
    graph.data = arr;
    graph.min_content = min;
    graph.max_content = max;
    var blackscale = new ColorScaleRGB(50, 50, 100); 

    this.LizardGraph.SetHist(graph, blackscale);
    this.LizardGraph.ResetDefaultRange();
    this.LizardGraph.Draw();

    // histogram
    var hist = new Histogram(Math.round(len / 10) + 10, min, max);
    for (var x of arr) { hist.Fill(x); }
    var colorscale = new ColorScaleRGB(50, 50, 50);
    colorscale.min = min;
    colorscale.max = max;
    this.LizardHistogram.SetHist(hist, colorscale);
    this.LizardHistogram.SetMarkers([bounds.lo, bounds.hi]);
    this.LizardHistogram.marker_color = "rgba(100,0,0,0.5)";

    this.LizardHistogram.Draw();

    // Stats
    $("span.arrayComponentMean", this.element).text(hist.GetMean().toFixed(2));
    $("span.arrayComponentRMS", this.element).text(hist.GetRMS().toFixed(2));
  } 

  attach(element)  {
    /// Called after rendering, just as the component is being inserted into the DOM.
    /// .. just like a text area...
    this.loadRefs(element, {readonly_display: 'single'});
    super.attach(element);

    this.LizardGraph = new HistCanvas($("div.arrayComponentGraph", this.element));
    this.LizardGraph.default_options.doDots = true;
    this.LizardGraph.default_options.doFill = false;
    this.LizardGraph.ylabel = this.component.units || "Tension (N)";
    this.LizardGraph.xlabel = "Wire Number";

    this.LizardHistogram = new HistCanvas($("div.arrayComponentHistogram", this.element));
    this.LizardHistogram.xlabel = this.component.units || "Tension (N)";
    this.LizardHistogram.ylabel = "Wire Count";
    
    var rodisp = this.refs.readonly_display;
    this.LizardGraph.DoMouseClick = function(ev, u, v) {
      var index = parseInt(u);
      var elem = rodisp.children[index];
      if (elem) {
        // $(rodisp).scrollTo($(elem));
        var s = elem.offsetLeft - 100;
        rodisp.scrollLeft = s;
        $(elem).stop().fadeOut(250).fadeIn(250);
      }
    }

    if (this.arrayValue) this.updateExtras(this.arrayValue);

    if (this.disabled && this.arrayValue) {
      $(this.refs.input[0]).hide();
      var d = $(this.refs.readonly_display);
      d.html(this.arrayValue.map(x => `<span>${x}</span>`).join(','));
    }

    var self= this;
    $('.collapse',this.element).on('shown.bs.collapse', function () {
      // unhiding
      self.LizardGraph.Resize();
      self.LizardGraph.Draw();
      self.LizardHistogram.Resize();
      self.LizardHistogram.Draw();
    });
  }

  setValue(value, flags) {
    var arr = value || [];
    if (!Array.isArray(arr)) arr = [value];
    this.arrayValue = arr;
    this.textValue = arr.join(',');
    this.updateExtras(this.arrayValue);

    const input = this.performInputMapping(this.refs.input[0]);
    input.value = this.textValue;

    return super.setValue(value, flags);
  }

  /** TODO(micchickenburger): investigate and remove if unused */
  setValueAt(index,value,flags) {
    // Don't do anything; it's called by Component.setValue, and we don't need it.
    console.log('setValueAt',this,index,value,flags);
    console.log("this.value",this.value);
    // debugger;
  }

  getValueAt(index) {
    var textvalue =  this.refs.input[0].value;
    var value = this.parseText(textvalue);
    this.updateExtras(value);
    return value;
  }
}

var gArrayComponentId=0;

ArrayComponent.editForm = function(a, b, c) {
    var form = TextFieldComponent.editForm(a, b, c);
    var tabs = form.components.find(obj => { return obj.type === "tabs" });
    var datatab = tabs.components.find(obj => { return obj.key == 'data' });

    // Remove 'multiple components'. I could probably make it work.. but nah
    datatab.components.splice(datatab.components.findIndex(obj => { return obj.key = "multiple" }), 1); // this code is problematic
    var displaytab = tabs.components.find(obj => {return obj.key == 'display' });

    datatab.components.splice(1, 0, {
      "input": true,
      "key": "specification_nominal",
      "label": "Nominal Value",
      "placeholder": "Nominal value ",
      "tooltip": "This is the nominal value each value should be close to",
      "type": "number",
    }, {
      "input": true,
      "key": "specification_tolerance",
      "label": "Tolerance",
      "tooltip": "This is the tolerance, plus or minus, around the nominal value. If outside this range, a warning will show.",
      "type": "number",
    }, {
      "input": true,
      "key": "specification_minimum",
      "label": "Minimum Specification",
      "tooltip": "If less than this value, a warning will show.",
      "type": "number",
    }, {
      "input": true,
      "key": "specification_maximum",
      "label": "Maximum Specification",
      "tooltip": "If greater than than this value, a warning will show.",
      "type": "number",
    }, {
      "input": true,
      "key": "units",
      "label": "Units",
      "tooltip": "Units or description of value (put on vertical scale)",
      "type": "textfield",
    });

    return form;
}

Formio.Components.addComponent('ArrayComponent', ArrayComponent);
