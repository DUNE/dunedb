
if (navigator.geolocation) 
        navigator.geolocation.getCurrentPosition(pos => {
              console.log("found current geolocation",pos);
              const newValue = {timestamp:pos.timestamp, coords:$.extend({},pos.coords)};
              localStorage.setItem('cached-geolocation', JSON.stringify(newValue));
              $(document).trigger('geolocation-update');
        });




///
/**
 * Get the input component class by referencing Formio.Components.components map.
 */
var InputComponent = Formio.Components.components.input;

/**
 * Create a new CustomGeoTagComponent "class" using ES5 class inheritance notation. 
 * https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/Inheritance
 * 
 * Here we will derive from the base component which all Form.io form components derive from.
 *
 * @param component
 * @param options
 * @param data
 * @constructor
 */
function CustomGeoTagComponent(component, options, data) {
  InputComponent.prototype.constructor.call(this, component, options, data);
}

// Perform typical ES5 inheritance
CustomGeoTagComponent.prototype = Object.create(InputComponent.prototype);
CustomGeoTagComponent.prototype.constructor = CustomGeoTagComponent;

/**
 * Define what the default JSON schema for this component is. We will derive from the InputComponent
 * schema and provide our overrides to that.
 * @return {*}
 */
CustomGeoTagComponent.schema = function() {
  return InputComponent.schema({
    type: 'CustomGeoTagComponent',
    label: "GeoTag",
  });
};

/**
 * Register this component to the Form Builder by providing the "builderInfo" object.
 * 
 * @type {{title: string, group: string, icon: string, weight: number, documentation: string, schema: *}}
 */
CustomGeoTagComponent.builderInfo = {
  title: 'Geo Tag',
  group: 'custom',
  icon: 'globe',
  weight: 70,
  documentation: '#', 
  schema: CustomGeoTagComponent.schema()
};

/**
 *  Tell the renderer how to render this component.
 */
CustomGeoTagComponent.prototype.render = function(element) {
  console.log("rendering",this,element);
  var tpl = '';
  tpl += this.renderTemplate('label', {
    label: this.labelInfo,
    component: this.component,
    element: element,
    tooltip: this.interpolate(this.component.tooltip || '').replace(/(?:\r\n|\r|\n)/g, '<br />'),
  });
  tpl+="<fieldset>";
  if(!this.options.readOnly)
    tpl += this.renderTemplate('button', {
        label: 'mybuttonlabel',

        input: {
          type: 'button',
          content: "Set to current location (cached...)",
          attr: {
            class: "geotag-set-button btn btn-primary",
            type: "button"
          }
        }
    });

  tpl += this.renderTemplate('html',{
    tag: 'div',
    attrs: [],
    type: 'html'
  });
  // tpl += "</div>";
  tpl += "<div class='google-map-div' style='height:100px'></div>";
  tpl += "<div class='GeoTagTxt'>";
  tpl += "</div>";
  tpl += "</fieldset>";
  console.log("template is",tpl);
  return Formio.Components.components.component.prototype.render.call(this,tpl);

};

CustomGeoTagComponent.prototype.attach = function(element) 
{
  /// Called after rendering, just as the component is being inserted into the DOM.
  /// .. just like a text area...
  InputComponent.prototype.attach.call(this,element);
  // console.log('my attach',this,this.refs.input,element)
 
  // Attach my handlers.
  var self = this;
  $('button',element).on('click',this.setToCurrentLocation.bind(this));
  $(document).on('geolocation-update',function(){
    console.log("geolocation-update")
    $('button',self.element).text("Set to current location (ready)")
  });

  // Except that after inserting into the DOM, we want to instantiate the autocomplete object.
  console.log('attach',this,element);
}

CustomGeoTagComponent.prototype.setToCurrentLocation = function()
{
  this.geotag = JSON.parse(localStorage.getItem('cached-geolocation'));
  console.log("Do eeeeeet!",this.geotag );
  // InputComponent.prototype.updateValue.call(this, this.geotag);
  this.setValue(this.geotag);
  InputComponent.prototype.updateValue.call(this, this.geotag);
}


/**
 * Provide the input element information. Because we are using checkboxes, the change event needs to be 
 * 'click' instead of the default 'change' from the InputComponent.
 * 
 * @return {{type, component, changeEvent, attr}}
 */


/**
 * Tell the renderer how to "get" a value from this component.
 *  That is, retrieve the current value from the rendered dom.
 * @return {Array}
 */
CustomGeoTagComponent.prototype.getValue = function() {
  console.log("getValue",this);
  return this.geotag;
};

/**
 * Push the value to the screen
 * 
 * @param value
 * @return {boolean}
 */
CustomGeoTagComponent.prototype.setValue = function(value) {
  this.geotag = value;
  var iframe = $("iframe",this.element);
  if(iframe.length==0) {
    var div = $('div.google-map-div');
    iframe=$("<iframe class='googlemap-iframe' />");
    iframe.attr('height',div.height());
    div.append(iframe);
  }
  iframe.attr('src',
    "https://www.google.com/maps/embed/v1/place?q="+value.coords.latitude+"%2C"+value.coords.longitude+"&key=AIzaSyDeEyg3PmVpBIVCRyak53KViUWg2-qiOpM"
    );
  $('div.GeoTagTxt').text(new Date((value.timestamp)).toString());

};

// Use the table component edit form.
CustomGeoTagComponent.editForm = Formio.Components.components.hidden.editForm;

// Register the component to the Formio.Components registry.
Formio.Components.addComponent('CustomGeoTagComponent', CustomGeoTagComponent);



