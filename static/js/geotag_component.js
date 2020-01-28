function setCoords(position)
{
    // Require the position be less than 10 minutes old.
    if(Date.now() - position.timestamp < (10*60*1000)) {
        console.log('updating frame',$('iframe.googlemap-currentpos'));
        $('iframe.googlemap-currentpos').attr('src',"https://www.google.com/maps/embed/v1/place?q="+position.coords.latitude+"%2C"+position.coords.longitude+"&key=AIzaSyDeEyg3PmVpBIVCRyak53KViUWg2-qiOpM")
        $('iframe.googlemap-currentpos').data("geotag",{...position});
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





$(function() {
  const oldCoords = localStorage.getItem('cached-geolocation');
  if(oldCoords) {
    console.log("found cached geolocation",oldCoords);
    setCoords(JSON.parse(oldCoords));
  }

    $('form.geotag input[type=submit]').attr('disabled', 'disabled');
    if (navigator.geolocation) 
            navigator.geolocation.getCurrentPosition(pos => {
                  console.log("found current geolocation",pos);
                  const newValue = {timestamp:pos.timestamp, coords:$.extend({},pos.coords)};
                  localStorage.setItem('cached-geolocation', JSON.stringify(newValue));
                  console.log("cached",localStorage.getItem('cached-geolocation'));
                  setCoords(newValue);
                });
});



///
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


///
/// Custom component for UUIDs
///
/// Basically sets some good defaults for what a UUID should look like
///
/// To do: add default validation technique.
///


// Formio.Components.components.file.builderInfo.schema=Formio.Components.components.file.schema();
var TextFieldComponent = Formio.Components.components.textfield;

function ComponentUUID(component, options, data) {
  // This is a normal text field...
  TextFieldComponent.prototype.constructor.call(this, component, options, data);

  // Except that after inserting into the DOM, we want to instantiate the autocomplete object.
  // Note that options.hooks is completely undocumented, but messing with Element.js hook() let 
  // me figure out how this works.
  // options=options||{};
  // options.hooks = options.hooks || {};
  // options.hooks.attachComponentUUID = function(element,component) {
  // $('input',element).autoComplete({
  //   resolverSettings: {
  //     minLength: 3,
  //       url: '/autocomplete/uuid'
  //   }
  // }).on('autocomplete.select', function (evt, item) {
  //   // console.log("selected",item)
  //   component.setValue(item.val);
  // });
  // console.log("hooked!",element,component);
  // }

  // console.log("ctor",options);
}

// Perform typical ES5 inheritance
ComponentUUID.prototype = Object.create(TextFieldComponent.prototype);
ComponentUUID.prototype.constructor = ComponentUUID;

ComponentUUID.schema = function() {
  return TextFieldComponent.schema({
      "label": "Component UUID",
      "placeholder": "Example: 123e4567-e89b-12d3-a456-426655440000",
      "description": "Database UUID. Found on QR code.",
      "inputMask": "********-****-****-****-************",
      "validateOn": "blur",
      "validate": {
        "pattern": "^$|([0-9a-fA-F]{8}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{12})",
        "customMessage": "Needs to be hexadecimal in 8-4-4-4-12 layout",
        "unique": false,
        "multiple": false
      },
      "customClass": ".component-uuid-formio",
      "errorLabel": "Not a UUID",
      "key": "component_uuid",
      "type": "ComponentUUID",
      "input": true  
    });
};
ComponentUUID.builderInfo = {
  title: 'ComponentUUID',
  group: 'custom',
  icon: 'qrcode',
  weight: 71,
  documentation: '#', 
  schema: ComponentUUID.schema()
};

ComponentUUID.prototype.attach = function(element) 
{
  /// Called after rendering, just as the component is being inserted into the DOM.
  /// .. just like a text area...
  TextFieldComponent.prototype.attach.call(this,element);
  // console.log('my attach',this,this.refs.input,element)
 
 // Except that after inserting into the DOM, we want to instantiate the autocomplete object.
 
  var component = this; // for binding below
  $('input',element).autoComplete({
    resolverSettings: {
      minLength: 3,
        url: '/autocomplete/uuid'
    }
  }).on('autocomplete.select', function (evt, item) {
    // console.log("selected",item)
    component.setValue(item.val);
  });
}


ComponentUUID.editForm = TextFieldComponent.editForm;

Formio.Components.addComponent('ComponentUUID', ComponentUUID);








// if(typeof(Formio)!="undefined") {
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
  tpl += this.renderTemplate('button', {
      label: 'mybuttonlabel',

      input: {
        type: 'button',
        content: "Set to current location",
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
  // tpl += "<iiiframe class='googlemap-currentpos' style='height:100 px'></iiiframe>";
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


};

// Use the table component edit form.
CustomGeoTagComponent.editForm = Formio.Components.components.hidden.editForm;

// Register the component to the Formio.Components registry.
Formio.Components.addComponent('CustomGeoTagComponent', CustomGeoTagComponent);











function CheckMatrixComponent(component, options, data) {
  InputComponent.prototype.constructor.call(this, component, options, data);
}

// Perform typical ES5 inheritance
CheckMatrixComponent.prototype = Object.create(InputComponent.prototype);
CheckMatrixComponent.prototype.constructor = CheckMatrixComponent;

/**
 * Define what the default JSON schema for this component is. We will derive from the InputComponent
 * schema and provide our overrides to that.
 * @return {*}
 */
CheckMatrixComponent.schema = function() {
  return InputComponent.schema({
    type: 'checkmatrix',
    numRows: 3,
    numCols: 3
  });
};

/**
 * Register this component to the Form Builder by providing the "builderInfo" object.
 * 
 * @type {{title: string, group: string, icon: string, weight: number, documentation: string, schema: *}}
 */
CheckMatrixComponent.builderInfo = {
  title: 'Check Matrix',
  group: 'custom',
  icon: 'fa fa-table',
  weight: 70,
  documentation: 'http://help.form.io/userguide/#table',
  schema: CheckMatrixComponent.schema()
};

/**
 *  Tell the renderer how to render this component.
 */
CheckMatrixComponent.prototype.render = function(element) {
  console.log("rendering",this,element);
  var tpl = '<div class="table-responsive">';
  tpl += this.renderTemplate('label', {
    label: this.labelInfo,
    component: this.component,
    element: element,
    tooltip: this.interpolate(this.component.tooltip || '').replace(/(?:\r\n|\r|\n)/g, '<br />'),
  });
  tpl += '<table class="table">';
  tpl += '<tbody>';
  for (let i = 0; i < this.component.numRows; i++) {
    tpl += '<tr>';
    for (let j = 0; j < this.component.numCols; j++) {
      tpl += '<td>';        
      tpl += this.renderTemplate('input', {
        input: {
          type: 'input',
          attr: {
            type: 'checkbox'
          },
          id: 'check-' + i + '-' + j
        }
      });
      tpl += '</td>';
    }
    tpl += '</tr>';
  }
  tpl += '</tbody>';
  tpl += '</table>';
  tpl += '</div>';
  console.log('rendertemplate result:',this.renderTemplate('html', {
    component: this.component,
    tag: 'h1',
    attrs: this.component.attrs || [],
    content: 'hit there',
    singleTags: this.singleTags,
  }));
  console.log('wrapper render', InputComponent.prototype.render.call(this,tpl));
  return InputComponent.prototype.render.call(this,"blah");
};

/**
 * Provide the input element information. Because we are using checkboxes, the change event needs to be 
 * 'click' instead of the default 'change' from the InputComponent.
 * 
 * @return {{type, component, changeEvent, attr}}
 */
CheckMatrixComponent.prototype.elementInfo = function() {
  const info = InputComponent.prototype.elementInfo.call(this);
  info.changeEvent = 'click';
  return info;
};

/**
 * Tell the renderer how to "get" a value from this component.
 * 
 * @return {Array}
 */
CheckMatrixComponent.prototype.getValue = function() {
  console.log("checkmatrix getValue",this);
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
CheckMatrixComponent.prototype.setValue = function(value) {
    console.log("checkmatrix setValue",this);

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
// CheckMatrixComponent.editForm = function() {
//   return {
//       components: [
//         {
//           type: 'textfield',
//           key: 'label',
//           label: 'Label'
//         }
//       ]
//     };
//   };

CheckMatrixComponent.editForm = Formio.Components.components.table.editForm;

console.log('editform',CheckMatrixComponent.editForm);
// Register the component to the Formio.Components registry.
Formio.Components.addComponent('checkmatrix', CheckMatrixComponent);


// }
