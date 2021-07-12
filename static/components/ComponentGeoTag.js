
// This code asks for geolocation when the user logs in.
// The problem with this is that it's very demanding of geo location data all the time, which is 
// annoying as fuck
// if (navigator.geolocation) 
//         navigator.geolocation.getCurrentPosition(pos => {
//               console.log("found current geolocation",pos);
//               const newValue = {timestamp:pos.timestamp, coords:$.extend({},pos.coords)};
//               localStorage.setItem('cached-geolocation', JSON.stringify(newValue));
//               $(document).trigger('geolocation-update');
//         });




///
/**
 * Get the input component class by referencing Formio.Components.components map.
 */
var InputComponent = Formio.Components.components.input;


class CustomGeoTagComponent extends Formio.Components.components.input{

  static schema(...extend) {
    return super.schema({
              type: 'CustomGeoTagComponent',
              label: "GeoTag",
    }, ...extend);
  }

  static get builderInfo() {
    return {
      title: 'Geo Tag',
      group: 'custom',
      icon: 'globe',
      weight: 70,
      documentation: '#', 
      schema: this.schema()
    };
  };

  render(element) {
    // console.log("rendering",this,element);
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
            content: "Set to current location",
            attr: {
              class: "geotag-set-button btn btn-primary",
              type: "button"
            }
          }
      });

    tpl += "<div class='google-map-div' style='height:200px'></div>";
    tpl += "</fieldset>";
    return Formio.Components.components.component.prototype.render.call(this,tpl);
  };


  attach(element) 
  {
    /// Called after rendering, just as the component is being inserted into the DOM.
    /// .. just like a text area...
    super.attach(element);
    // console.log('my attach',this,this.refs.input,element)
   
    // Attach my handlers.
    var self = this;
    $('button',element).on('click',this.setToCurrentLocation.bind(this));

    // Except that after inserting into the DOM, we want to instantiate the autocomplete object.
    // console.log('attach',this,element);
  }

  setToCurrentLocation(event)
  {
    // On button click.
    // First, if there is a cached location (from the last time this function was used) insert it.
    // Then, wait for the real location to be recorded, and put that in instead.
    var self = this;
    // You know what? the whole cached thing is just confusing. Forget it.
    // var stored = localStorage.getItem('cached-geolocation');
    // if(stored) {
    //   self.geotag = JSON.parse(localStorage.getItem('cached-geolocation'));
    //   self.setValue(this.geotag);
    // }
    if (navigator.geolocation) 
            $(event.target).text("Locating...");
            navigator.geolocation.getCurrentPosition(pos => {
                  console.log("found current geolocation",pos);
                  const newValue = $.extend({},pos.coords);
                  localStorage.setItem('cached-geolocation', JSON.stringify(newValue));
                  self.geotag = JSON.parse(localStorage.getItem('cached-geolocation'));
                  $(event.target).text("Set to current location");
                  self.setValue(this.geotag);
            });
    // console.log("Do eeeeeet!",this.geotag );
    // InputComponent.prototype.updateValue.call(this, this.geotag);
  }


  getValue(){
    // console.log("getValue",this);
    return this.geotag;
  };

  setValue(value) {
    this.geotag = value;
    var iframe = $("iframe",this.element);
    if(iframe.length==0) {
      var div = $('div.google-map-div');
      iframe=$("<iframe class='googlemap-iframe' />");
      iframe.attr('height',div.height());
      div.append(iframe);
    }
    if(value  && value.latitude)
      iframe.attr('src',
        "https://www.google.com/maps/embed/v1/place?q="+value.latitude+"%2C"+value.longitude+"&key=AIzaSyDeEyg3PmVpBIVCRyak53KViUWg2-qiOpM"
        );
    super.updateValue(value);
  };


}
CustomGeoTagComponent.editForm = Formio.Components.components.hidden.editForm;
Formio.Components.addComponent('CustomGeoTagComponent', CustomGeoTagComponent);




