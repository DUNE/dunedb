var TextFieldComponent = Formio.Components.components.textfield;
var gComponentUUIDComponent = null;


/// Define the modal that is displayed when the camera button is pressed
$(function () {
  const modal = `
    <div class = 'modal fade' tabindex = '-1' role = 'dialog' id = 'qrCameraModal' aria-labelledby = 'qrCameraModalLabel' aria-hidden = 'true'>
      <div class = 'modal-dialog' role = 'document'>
        <div class = 'modal-content'>
          <div class = 'modal-header'>
            <h5 class = 'modal-title' id = 'qrCameraModalLabel'>Scan QR Code for UUID</h5>
            <button type = 'button' class = 'close' data-dismiss = 'modal' aria-label = 'Close'>
              <span aria-hidden = 'true'>&times;</span>
            </button>
          </div>
          <div class = 'modal-body'>
            <canvas class = 'p-4' id = 'qrCameraCanvas' hidden = 'hidden' style = 'width: 100%'></canvas>
            <video id = 'qrCameraVideo' hidden = 'hidden'></video>
            <div id = 'qrCameraLoadingMessage'>Unable to access camera (please check that a webcam is connected)</div>
            <div id = 'qrCameraOutputMessage'>No QR code detected</div>
          </div>
          <div class = 'modal-footer'>
            <button type = 'button' class = 'btn btn-secondary' data-dismiss = 'modal'>Cancel</button>
          </div>
        </div>
      </div>
    </div>`;
  $('body').append(modal);
});


/// Define the behaviour of the interface when a QR code scan is attempted by pressing the camera button
/// The function argument 'cb' is a callback that uses the QR code we find ... returning 'true' if it is valid, or 'false' if not
function runQRCameraModal(cb) {
  // Show the modal defined above
  $('#qrCameraModal').modal('show');

  // Retrieve the variables from the pre-defined elements of the modal
  let video = document.getElementById('qrCameraVideo');
  let canvasElement = document.getElementById('qrCameraCanvas');
  let context = canvasElement.getContext('2d');
  let loadingMessage = document.getElementById('qrCameraLoadingMessage');
  let outputMessage = document.getElementById('qrCameraOutputMessage');

  // Define a function for drawing and displaying a line between two points on the camera stream
  function drawLine(begin, end) {
    context.beginPath();
    context.moveTo(begin.x, begin.y);
    context.lineTo(end.x, end.y);
    context.lineWidth = 4;
    context.strokeStyle = '#FF3B58';
    context.stroke();
  }

  // Attempt to get the video stream from the camera ... use 'facingMode: environment' to get the front-facing camera on phones
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(function (stream) {
    video.srcObject = stream;
    video.setAttribute('playsinline', true);
    video.play();

    requestAnimationFrame(tick);
  });

  let running = true;

  // Define a way to stop the camera video stream
  function stop() {
    running = false;
    const stream = video.srcObject;

    if (stream) {
      const tracks = stream.getTracks() || [];
      tracks.forEach(function (track) { track.stop(); });
    }

    video.srcObject = null;
  };

  $('#qrCameraModal button').click(stop);

  // Attempt to find a QR code on the current frame of the camera video stream, and if found check its validity
  function tick() {
    loadingMessage.innerText = '⌛ Loading video...';

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      loadingMessage.hidden = true;

      canvasElement.hidden = false;
      canvasElement.height = video.videoHeight;
      canvasElement.width = video.videoWidth;

      context.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);

      const imageData = context.getImageData(0, 0, canvasElement.width, canvasElement.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });

      if (code) {
        drawLine(code.location.topLeftCorner, code.location.topRightCorner);
        drawLine(code.location.topRightCorner, code.location.bottomRightCorner);
        drawLine(code.location.bottomRightCorner, code.location.bottomLeftCorner);
        drawLine(code.location.bottomLeftCorner, code.location.topLeftCorner);

        if (cb(code.data)) {
          stop();
          $('#qrCameraModal').modal('hide');
        } else {
          (outputMessage).text(`QR code data: "${code.data}" does not match expected format!`);
        }
      }
    }

    if (running) requestAnimationFrame(tick);
  }
}


/// This class describes a custom Formio component for inputting a component UUID
/// It also allows for a QR code to be scanned, from which a component UUID can be decoded
class ComponentUUID extends TextFieldComponent {

  // Base schema for the component (the built-in 'text field' Formio component)
  static schema(...extend) {
    return TextFieldComponent.schema({
      label: 'Component UUID',
      placeholder: 'Example: 123e4567-e89b-12d3-a456-426655440000',
      tooltip: 'Component UUID ... enter manually or scan component QR code',
      inputMask: '********-****-****-****-************',
      validateOn: 'change',
      validate: {
        pattern: '^$|([0-9a-fA-F]{8}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{12})',
        customMessage: 'Must be a string in the format: [8]-[4]-[4]-[4]-[12] characters',
        unique: false,
        multiple: false,
      },
      customClass: '.component-componentuuid-formio',
      key: 'component_uuid',
      type: 'ComponentUUID',
      showCamera: true,
      autocomplete: true,
    }, ...extend);
  }

  // Getter functions
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

  // Render the component as an element on the page
  renderElement(value, index) {
    gComponentUUIDComponent = this;
    let textValue = value;

    if (value && typeof value === 'object') textValue = value.uuidstr;

    textValue = textValue || '';

    let tpl = `
      <div class = 'componentuuid'>
        <div class = 'main-input'>
          ${super.renderElement(textValue, index)}
        </div>`

    if (this.component.showCamera && !this.disabled) {
      tpl += `<button type = 'button' class = 'runQRCameraModal'><i class = 'fa fa-camera' title = 'Get QR code with your camera'></i></button>`;
    }

    tpl += `
      </div>
      <a target = '_blank' ref = 'compUuidInfo' class = 'componentuuid-info'></a>`;

    return tpl;
  }

  // After rendering the Formio component, attach it to an element of the page
  attach(element) {
    const superattach = super.attach(element);
    this.loadRefs(element, { compUuidInfo: 'multiple' });
    let self = this;

    if (this.component.showCamera) {
      $('.runQRCameraModal', element).each(function (index) {
        $(this).click(function () {
          runQRCameraModal(self.cameraCallback.bind(self, index));
        });
      });
    }

    if (this.component.autocomplete) {
      let query = {};

      $(this.refs.input).each(function (index) {
        $(this).autoComplete({
          resolver: 'custom',
          events: {
            search: function (qry, callback) {
              $.ajax(
                '/autocomplete/uuid', { data: { ...query, 'q': qry } }
              ).done(callback);
            }
          },
          resolverSettings: {
            minLength: 2,
          }
        }).on('autocomplete.select', function (evt, item) {
          $(this).val(item.val);
          self.setValueAt(index, item.val);
          self.updateValue();
        });
      })
    }

    return superattach;
  }

  // If the camera icon is pressed, i.e. if the user is scanning a QR code ...
  // ... get the QR code, extract the short UUID, decode the full UUID, and populate the component input field
  // Please keep the console log statements in this function ... they are very useful for debugging the (notoriously unreliable!) QR code scanning
  cameraCallback(index, qrCode) {
    const matchedURL = qrCode.match('.*/([123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ-]{22})');

    if (matchedURL) {
      const shortuuid = matchedURL[1].match('[^\-]*')[0];
      const uuid58 = ShortUUID().toUUID(shortuuid);
      console.log('Base58 UUID', uuid58);
      const uuid57 = ShortUUID('23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz').toUUID(shortuuid);
      console.log('Base57 UUID', uuid57);

      const thisClass = this;
      let uuid, foundMatchingComponent58 = false, foundMatchingComponent57 = false;

      function checkUuid(uuid, base) {
        return $.ajax({
          type: 'GET',
          url: `/json/component/${uuid}`,
          dataType: 'json',
          success: function (data) {
            if (data) {
              if (base === 58) foundMatchingComponent58 = true;
              else foundMatchingComponent57 = true;
            }
          },
        })
      }

      jQuery.when(checkUuid(uuid58, 58), checkUuid(uuid57, 57)).done(function () {
        if (foundMatchingComponent58 && !foundMatchingComponent57) {
          uuid = uuid58;
          console.log('Found component matching only base58 UUID: ', uuid);
        }

        if (foundMatchingComponent57 && !foundMatchingComponent58) {
          uuid = uuid57;
          console.log('Found component matching only base57 UUID: ', uuid);
        }

        if (foundMatchingComponent57 && foundMatchingComponent58) {
          uuid = uuid58;
          console.log('Found components matching both base58 and base57 UUIDs ... using base58 as default query');
        }

        if (!foundMatchingComponent57 && !foundMatchingComponent58) {
          uuid = uuid58;
          console.log('Found no components matching either base58 and base57 UUIDs ... using base58 for query to fail');
        }

        thisClass.setValueAt(index, uuid);
        return true;
      });
    }

    return true;
  }

  // Set the input field to a provided string, and if it is a valid UUID string, do the appropriate action based on the current page URL
  //   - if on the 'Search for Record by UUID or ID' page, redirect to the component information page
  //   - if on the 'Search for Workflows by UUID' page, retrieve the relevant workflow information and redirect to the workflow information page
  //     (note that the 'ajax' query in this scenario uses the 'postSuccess' and 'postFail' functions already defined on the 'Search for Workflows by UUID' page)
  //   - in any other situation, i.e. if this Formio component is just part of a type form, then do not redirect anywhere
  setValueAt(index, value, flags) {
    const changed = super.setValueAt.call(this, index, value);

    if (this.refs.compUuidInfo && value && value.length === 36) {
      $.get(`/json/component/${value}`);

      if (window.location.pathname === '/search/recordByUUIDOrID') window.location.href = `/component/${value}`;
      if (window.location.pathname === '/search/workflowsByUUID') {
        $.ajax({
          contentType: 'application/json',
          method: 'GET',
          url: `/json/search/workflowsByUUID/${value}`,
          dataType: 'json',
          success: postSuccess,
        }).fail(postFail);
      }
    }

    return changed;
  }
}


/// Function for updating the selection of available Formio components to include this one (on any 'Edit Type Form' page)
ComponentUUID.editForm = function (a, b, c) {
  const form = TextFieldComponent.editForm(a, b, c);
  const tabs = form.components.find(obj => { return obj.type === 'tabs' });
  let dataTab = tabs.components.find(obj => { return obj.key == 'data' });

  dataTab.components.splice(dataTab.components.findIndex(obj => { return obj.key = 'multiple' }), 1);

  return form;
}


/// Register this custom Formio component with the overall list of components that are available to use in Formio forms
Formio.Components.addComponent('ComponentUUID', ComponentUUID);
