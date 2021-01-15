

///
/// Custom component for UUIDs
///
/// Basically sets some good defaults for what a UUID should look like
///
/// To do: add default validation technique.
///

var TextFieldComponent = Formio.Components.components.textfield;

// Insert the a hidden div into the HTML.
$(function(){
  var modal =`<div class="modal fade" tabindex="-1" role="dialog" id="qrCameraModel" aria-labelledby="qrCameraModalLabel" aria-hidden="true">
                  <div class="modal-dialog" role="document">
                    <div class="modal-content">
                      <div class="modal-header">
                        <h5 class="modal-title" id="qrCameraModalLabel">Scan QR Code for UUID</h5>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                          <span aria-hidden="true">&times;</span>
                        </button>
                      </div>
                      <div class="modal-body">
                        <canvas class="p-4" id="qrCameraCanvas" hidden="hidden" style='width:100%'></canvas>
                        <video id="qrCameraVideo" hidden="hidden"></video>
                        <div id="qrCameraLoadingMessage">&#xF3A5; Unable to access video stream (please make sure you have a webcam enabled)</div>
                        <div id="qrCameraOutputMessage">No QR code detected</div>
                        
                      </div>
                      <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                      </div>
                    </div>
                  </div>
                </div>`;
  $('body').append(modal);
});

function runQrCameraModel(cb)
{
    // Show the modal.
    $('#qrCameraModel').modal('show');
    // see the jsqr demo
    var video = document.getElementById("qrCameraVideo");
    var canvasElement = document.getElementById("qrCameraCanvas");
    var ctx = canvasElement.getContext("2d");
    var loadingMessage = document.getElementById("qrCameraLoadingMessage");
    var outputMessage = document.getElementById("qrCameraOutputMessage");
    var outputData = document.getElementById("outputData");

    function drawLine(begin, end, color) {
      ctx.beginPath();
      ctx.moveTo(begin.x, begin.y);
      ctx.lineTo(end.x, end.y);
      ctx.lineWidth = 4;
      ctx.strokeStyle = color;
      ctx.stroke();
    }
      // Use facingMode: environment to attemt to get the front camera on phones
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then(function(stream) {
      video.srcObject = stream;
      video.setAttribute("playsinline", true); // required to tell iOS safari we don't want fullscreen
      video.play();
      requestAnimationFrame(tick);
    });
    var running = true;
    // cancel button.

    function stop() {
      running = false;
      const stream = video.srcObject;
      if(stream){
          const tracks = stream.getTracks() || [];
          tracks.forEach(function(track) { track.stop(); });
      }
      video.srcObject = null;
    };

    $('#qrCameraModel button').click(stop);

    function tick() {
      loadingMessage.innerText = "⌛ Loading video..."
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        loadingMessage.hidden = true;
        canvasElement.hidden = false;

        canvasElement.height = video.videoHeight;
        canvasElement.width = video.videoWidth;
        ctx.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
        var imageData = ctx.getImageData(0, 0, canvasElement.width, canvasElement.height);
        var code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        if (code) {
          console.log("found QR code",code)
          drawLine(code.location.topLeftCorner, code.location.topRightCorner, "#FF3B58");
          drawLine(code.location.topRightCorner, code.location.bottomRightCorner, "#FF3B58");
          drawLine(code.location.bottomRightCorner, code.location.bottomLeftCorner, "#FF3B58");
          drawLine(code.location.bottomLeftCorner, code.location.topLeftCorner, "#FF3B58");
          $(outputMessage).text(code.data);
          var match = code.data.match(".*/([A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12})");
          if(match) {
            uuid = match[1];
            $(outputMessage).text(uuid);
            running = false;
            cb(uuid); // return the value.
            stop();
            $('#qrCameraModel').modal('hide');
          }
        }
      }
      if(running) requestAnimationFrame(tick);
    }

}

var gUuidComponent = null;

class ComponentUUID extends TextFieldComponent{


  static schema(...extend) {
    return TextFieldComponent.schema({
      "label": "Component UUID",
      "placeholder": "Example: 123e4567-e89b-12d3-a456-426655440000",
      "tooltip": "Database component UUID. Found on QR code.",
      "inputMask": "********-****-****-****-************",
      "validateOn": "change",
      "validate": {
        "pattern": "^$|([0-9a-fA-F]{8}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{12})",
        "customMessage": "Needs to be hexadecimal in 8-4-4-4-12 layout",
        "unique": false,
        "multiple": false
      },
      "customClass": ".component-uuid-formio",
      // "errorLabel": "Not a UUID",
      "key": "component_uuid",
      "type": "ComponentUUID",
      "input": true,
      "showCamera": true,
      "autocomplete": true,
      "autocomplete_type": null // Component type to restrict to used when autocompleteing
    }, ...extend);
  }

  static get builderInfo() {
    return {
      title: 'Component UUID',
      group: 'custom',
      icon: 'qrcode',
      weight: 71,
      documentation: '#', 
      schema: ComponentUUID.schema()
     };
  }
  get defaultSchema() {
    return ComponentUUID.schema();
  }

  renderElement(value,index)  {
    gUuidComponent = this;
    // console.log('renderElement',this,value,index);
    var textvalue = value;
    if(value && typeof value === "object") {
      textvalue = value.uuidstr;
    }
    textvalue = textvalue || '';

    var tpl = "<div class='componentUuidComponent'>"; 
    tpl += "<div class='main-input'>";
    tpl += super.renderElement(textvalue,index);
    tpl += "</div>";
    if(this.component.showCamera && !this.disabled)  {
      tpl += `<button type="button" class="runQrCameraModel"><i class="fa fa-camera" title="Get QR code with your camera"></i></button>`;
    }
    // tpl += `<a href="${value}" ref='linkToComponent' class="uuid-link" ></a>`;
    tpl += "</div>";
    tpl += "<a target='_blank' ref='compUuidInfo' class='componentUuid-info'></a>";
    return tpl;
    // return TextFieldComponent.prototype.renderElement.call(this,textvalue,index)+tpl;
  }

  attach(element) 
  {
    /// Called after rendering, just as the component is being inserted into the DOM.
    /// .. just like a text area...
    var superattach = super.attach(element);
    // console.log('my attach',this,this.refs.input,element,$(this.refs.input[0]).val());
    this.loadRefs(element, {//linkToComponent: 'single',
                            compUuidInfo: 'multiple',
                           });

    var self = this; // for binding below


   // Except that after inserting into the DOM, we want to instantiate the autocomplete object.
    if(this.component.showCamera) {
      $('.runQrCameraModel',element).each(function(index){
        // set up for each button
        $(this).click(function(){
            runQrCameraModel(function(uuid) {
            self.setValueAt(index,uuid);
          })
        });
      });
    }

    if(this.component.autocomplete ) {
      var url = this.component.autocomplete;
      var query = {};
      if(this.component.autocomplete_type) query.type = this.component.autocomplete_type;

      $(this.refs.input).each(function(index) {
        $(this).autoComplete({
              resolver: 'custom',
              events: {
                  search: function (qry, callback) {
                      // let's do a custom ajax call
                      $.ajax(
                          '/autocomplete/uuid',
                          {
                              data: {...query,'q': qry}
                          }
                      ).done(callback);
                  }
              },

              resolverSettings: {
                minLength: 2,
                // url: String(self.component.autocomplete)
              }
        }).on('autocomplete.select', function (evt, item) {
          // console.log("autocomplete select",item.val,item.text);
          $(this).val(item.val);
          console.log('setting index',index,item.val,this);
          self.setValueAt(index,item.val);
          self.updateValue();
        });
      })
    }

    return superattach;
  }

 setValueAt(index, value,flags) {
    // flags = flags || {};
    const changed = super.setValueAt.call(this, index, value);

    // if(this.refs.linkToComponent && value && value.length==36) {
    //   $(this.refs.linkToComponent).show().prop('href','/'+value).text('link');
    // }
    if(this.refs.compUuidInfo && value && value.length==36) {
      var info_target = $(this.refs.compUuidInfo[index]);
      info_target.show().prop('href','/'+value).text('link');
      $.get('/json/component/'+value+"/simple").then(function(component){
        info_target.text(component.type +": "+ component.data.name);
      })
    }

    // if (changed) {
    //   this.redraw();
    // }

    return changed;
  }

  // setValueAt(index,value,flags)
  // {
  //   // console.log('setValue',this,value,flags);
  //   // console.log($('a',this.element),$('a',this.element).prop('href'));
  //   return super.setValueAt(...arguments);
  // }

  // getValueAt(index)
  // {
  //   // console.log('getValue',this);
  //   return super.getValueAt(index);
  // }


}

// ComponentUUID.editForm = TextFieldComponent.editForm;
ComponentUUID.editForm = function(a,b,c)
{
    var form = TextFieldComponent.editForm(a,b,c);
    var tabs = form.components.find(obj => { return obj.type === "tabs" });
    var datatab = tabs.components.find(obj => {return obj.key=='data'});

    // Remove 'multiple components'. I could probably make it work.. but nah
    datatab.components.splice(datatab.components.findIndex(obj=>{return obj.key = "multiple"}),1);
    var displaytab = tabs.components.find(obj => {return obj.key=='display'});

    datatab.components.splice(1,0,
      {
        "input": true,
        "key": "autocomplete_type",
        "label": "Restrict Autocomplete to type",
        "tooltip": "Restrict autocomplete results to this form type",
        "type": "textfield",
      }
  );


    return form;
}
Formio.Components.addComponent('ComponentUUID', ComponentUUID);


