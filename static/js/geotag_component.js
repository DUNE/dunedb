function setCoords(position)
{
    // Require the position be less than 10 minutes old.
    if(Date.now() - position.timestamp < (10*60*1000)) {
        console.log('updating frame',$('iframe.googlemap-currentpos'));
        $('iframe.googlemap-currentpos').attr('src',"https://www.google.com/maps/embed/v1/place?q="+position.coords.latitude+"%2C"+position.coords.longitude+"&key=AIzaSyDeEyg3PmVpBIVCRyak53KViUWg2-qiOpM")

        var form = $('form.geotag');
        // Set if on this page.
        $("input.latitude",form).val(  position.coords.latitude);
        $("input.longitude",form).val( position.coords.longitude);
        $("input.altitude",form).val(  position.coords.altitude);
        $("input.accuracy",form).val(  position.coords.accuracy);
        $("input.timestamp",form).val(position.timestamp);
        $('input[type=submit]',form).removeAttr('disabled');
    }
}



const oldCoords = localStorage.getItem('cached-geolocation');
if(oldCoords) {
    console.log("found cached geolocation",oldCoords);
    setCoords(JSON.parse(oldCoords));
}



$(function() {
    $('form.geotag input[type=submit]').attr('disabled', 'disabled');
    if (navigator.geolocation) 
            navigator.geolocation.getCurrentPosition(pos => {
                  console.log("found current geolocation",pos);
                  const cacheValue = {timestamp:pos.timestamp, coords:$.extend({},pos.coords)};
                  localStorage.setItem('cached-geolocation', JSON.stringify(cacheValue));
                  console.log("cached",localStorage.getItem('cached-geolocation'));
                  setCoords(pos);
                });
});

if(typeof(Formio)!="undefined") {
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
    type: 'CustomGeoTag',
    label: "Geo Tag",
    numRows: 3,
    numCols: 3
  });
};

/**
 * Register this component to the Form Builder by providing the "builderInfo" object.
 * 
 * @type {{title: string, group: string, icon: string, weight: number, documentation: string, schema: *}}
 */
CustomGeoTagComponent.builderInfo = {
  title: 'Check Matrix',
  group: 'basic',
  icon: 'fa fa-table',
  weight: 70,
  documentation: 'http://help.form.io/userguide/#table',
  schema: CustomGeoTagComponent.schema()
};

/**
 *  Tell the renderer how to render this component.
 */
CustomGeoTagComponent.prototype.render = function(element) {
  var tpl = '<div class="table-responsive">';
  tpl += this.renderTemplate('label', {
    label: this.labelInfo,
    component: this.component,
    element: element,
    tooltip: this.interpolate(this.component.tooltip || '').replace(/(?:\r\n|\r|\n)/g, '<br />'),
  });
  tpl += '<table class="table">';
  tpl += '<tbody><tr><th>Hi</th></tr>';
  tpl += '</tbody>';
  tpl += '</table>';
  tpl += '</div>';
  return tpl;
};

/**
 * Provide the input element information. Because we are using checkboxes, the change event needs to be 
 * 'click' instead of the default 'change' from the InputComponent.
 * 
 * @return {{type, component, changeEvent, attr}}
 */
CustomGeoTagComponent.prototype.elementInfo = function() {
  const info = InputComponent.prototype.elementInfo.call(this);
  info.changeEvent = 'click';
  return info;
};

/**
 * Tell the renderer how to "get" a value from this component.
 * 
 * @return {Array}
 */
CustomGeoTagComponent.prototype.getValue = function() {
  var value = [];
  if (!this.refs.input || !this.refs.input.length) {
    return value;
  }
  for (let i = 0; i < this.component.numRows; i++) {
    value[i] = [];
    for (let j = 0; j < this.component.numCols; j++) {
      var index = (i * this.component.numCols) + j;
      if (this.refs.input[index]) {
        value[i][j] = !!this.refs.input[index].checked;
      }
    }
  }
  return value;
};

/**
 * Tell the renderer how to "set" the value of this component.
 * 
 * @param value
 * @return {boolean}
 */
CustomGeoTagComponent.prototype.setValue = function(value) {
  var changed = InputComponent.prototype.updateValue.call(this, value);
  if (!value) {
    return changed;
  }
  for (let i = 0; i < this.component.numRows; i++) {
    if (!value[i]) {
      break;
    }
    for (let j = 0; j < this.component.numCols; j++) {
      if (!value[i][j]) {
        return false;
      }
      let checked = value[i][j] ? 1 : 0;
      var index = (i * this.component.numCols) + j;
      this.refs.input[index].value = checked;
      this.refs.input[index].checked = checked;
    }
  }
  return changed;
};

// Use the table component edit form.
CustomGeoTagComponent.editForm = Formio.Components.components.table.editForm;

// Register the component to the Formio.Components registry.
Formio.Components.addComponent('CustomGeoTag', CustomGeoTagComponent);


/// New defaults for the File schema.
Formio.Components.components.file.schema = function(...extend) {
    return {
      type: 'file',
      label: 'Upload',
      key: 'file',
      image: false,
      privateDownload: false,
      imageSize: '200',
      filePattern: '*',
      fileMinSize: '0KB',
      fileMaxSize: '1GB',
      uploadOnly: false,
      storage:"url",
      url:"/savefile",

    };
  };


// Formio.Components.components.file.builderInfo.schema=Formio.Components.components.file.schema();

}
