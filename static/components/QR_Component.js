

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
    // cb is a callback that uses the QR code we find. 
    // It returns 'true' if that data is ok, or 'false' if that data does not match
    // expectations.

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
          // $(outputMessage).text(code.data);
          // var match = code.data.match(match_regex);//(".*/([A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12})");

          // Ask callback if this input is OK.
          if(cb(code.data)) {
            stop();
            $('#qrCameraModel').modal('hide');
          } else {
            (outputMessage).text("QR code: \""+code.data+"\" does not match expected format");
          }
 
        }
      }
      if(running) requestAnimationFrame(tick);
    }

}


class QR_Component extends TextFieldComponent{


  static schema(...extend) {
    return TextFieldComponent.schema({
      "label": "QR Text",
      "validateOn": "change",
      "customClass": ".component-uuid-formio",
      // "errorLabel": "Not a UUID",
      "key": "qrCode",
      "type": "qrCode",
      "input": true,
      "showCamera": true,
    }, ...extend);
  }

  static get builderInfo() {
    return {
      title: 'Generic QR Code',
      group: 'custom',
      icon: 'qrcode',
      weight: 71,
      documentation: '#', 
      schema: QR_Component.schema()
     };
  }
  get defaultSchema() {
    return QR_Component.schema();
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
    tpl += "<em><a target='_blank' ref='compUuidInfo' class='componentUuid-info'></a></em>";
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


    if(this.component.showCamera) {
      $('.runQrCameraModel',element).each(function(index){
        // set up for each button
        $(this).click(function(){
            runQrCameraModel( self.cameraCallback.bind(self,index)
              // self.component.cameraMatchRegex,
              // function(uuid) {
                
              // }
            );
        });
      });
    }


    return superattach;
  }

  cameraCallback(index,qrcode)
  {
    // accept anything
    this.setValueAt(index,qrcode);
    return true;
  }

 // setValueAt(index, value,flags) {

 //    const changed = super.setValueAt.call(this, index, value);


 //    return changed;
 //  }


}

// QR_Component.editForm = TextFieldComponent.editForm;
QR_Component.editForm = function(a,b,c)
{
    var form = TextFieldComponent.editForm(a,b,c);
    var tabs = form.components.find(obj => { return obj.type === "tabs" });
    var datatab = tabs.components.find(obj => {return obj.key=='data'});

    // Remove 'multiple components'. I could probably make it work.. but nah
    datatab.components.splice(datatab.components.findIndex(obj=>{return obj.key = "multiple"}),1);
    var displaytab = tabs.components.find(obj => {return obj.key=='display'});

    datatab.components.splice(1,0);

    return form;
}

Formio.Components.addComponent('qrCode', QR_Component);


