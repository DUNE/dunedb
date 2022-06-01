'use strict';


// Globals for debugging. Not really used.
// var gAI = []
// var gCanvas = null; 

class ImageAnnotator extends Formio.Components.components.field {

  static schema(...extend) {
    return super.schema({
              type: 'ImageAnnotator',
              label: "Annotated Image",
    }, ...extend);
  }

  static get builderInfo() {
    return {
      title: 'Upload Image with Annotation',
      group: 'custom',
      icon: 'picture-o',
      weight: 6,
      schema: this.schema()
    };
  }

  init() {
    // gAI.push(this);
    // Create an image-upload sub-component. See src/components/_classes/NestedComponent.js
    var options = this.options;
    var data = this.data;
    options.parent = this;
    options.parentVisible = this.visible;
    options.root = this.root || this;
    options.skipInit = true;
    var component = Formio.Components.components.file.schema();
    component.image = true;
    component.hideLabel = true;
    this.fileComponent = Formio.Components.create(component, options, data, true);
    this.fileComponent.init();
    var self = this;
    this.fileComponent.on('componentChange',this.fileChanged.bind(this));
    return super.init();
  }

  fileChanged(changed) {
    if(changed) {
      super.updateValue(this.getValue());
      this.redraw();
    }
  }
  setVisible(value) {
    super.visible = value;
    this.fileComponent.visible = value;
  }
  set disabled(disabled) {
    super.disabled = disabled;
    this.fileComponent.parentDisabled = disabled;
  }

  render() {
    this.imRenderingNow = true;
    console.log("rendering ImageAnnotator",this);
    var tpl = '';
    
    tpl += `<div class='annotatedDiv'>`;
    var imageUrlToShow = this.annotatedUrl;
    var originalFile = (this.fileComponent.getValue() || [])[0];
    if(!imageUrlToShow && originalFile && originalFile.url) {
      imageUrlToShow = originalFile.url;
    }
    if(imageUrlToShow) {
      if( !(this.options.readOnly || this.disabled)) {
        tpl += `<button class="btn btn-primary"  ref="launchAnnotatorButton">Annotate This Image</button>`;
      }
      tpl += `<img style='width:100%;" ref='annotatedImg' src='${imageUrlToShow}' />`
    }
    tpl += `</div>`;
    // tpl += this.renderTemplate('file', {
    //   fileSize: this.fileSize,
    //   files: this.dataValue || [],
    //   statuses: this.statuses,
    //   disabled: this.disabled,
    //   support: this.support,
    // });
    // return Formio.Components.components.field.prototype.render.call(this,tpl)
    if(!(this.options.readOnly || this.disabled)) {
      tpl += `<div ref="fileSubComponent">`;
      tpl += this.fileComponent.render(tpl);
      tpl += `</div>`
    }
    this.imRenderingNow = false;

    return super.render(tpl);

  };

  attach(element) 
  {
    /// Called after rendering, just as the component is being inserted into the DOM.
    /// .. just like a text area...
    this.imAttachingNow = true;
    this.loadRefs(element, {annotatedImg: 'single',
                            launchAnnotatorButton: 'single',
                            fileSubComponent: 'single'});
    var superAttach = super.attach(element);
    var self = this;

    // subcomponent
    if(!(this.options.readOnly || this.disabled)) {
      this.fileComponent.attach(this.refs.fileSubComponent);
    }

    // The meat:
    $(this.refs.launchAnnotatorButton).on('click',
        function(){
                var modal = $('#AnnotatorModal');
                console.log('clicked the button',modal);
                modal.modal("show");
                modal.on("shown.bs.modal",
                  function(){
                    console.log("modal should be open now");

                    // Fix the z-index so it's bigger.
                    var zIndex = 1000040 + (10 * $('.modal:visible').length);
                      $(this).css('z-index', zIndex);
                      setTimeout(function() {
                          $('.modal-backdrop').not('.modal-stack').css('z-index', zIndex - 1).addClass('modal-stack');
                      }, 0);

                    var canvas = new AnnotationCanvas(
                        $('.AnnotationCanvas',modal).get(0),
                        {
                          img_url: ((self.fileComponent.getValue() || [])[0]).url,
                          annotation: self.annotation
                        });
                    // for debugging:
                    // gCanvas = canvas;
                    $(this).off("shown.bs.modal"); // remove this handler.

                    // handle the save button:
                    $('#AnnotatorModal .SaveAnnotationCanvas').on('click',
                    function(){
                        $(this).off('click'); // remove handler.
                        // save the image.
                        var uri = canvas.getImageUri();
                        self.annotatedUrl = uri; // This would work but isn't what we want. 
                        self.annotation = canvas.getJSON();
                        $.post({
                            url:'/file/gridfsBase64',
                            data: uri,
                            contentType:'text/plain',
                            success: function(result) {
                                // Ok, at this point we should have everything we Non-prefixed  
                                console.log('success',result);

                                // Set the orignal data.
                                if(result.url) self.annotatedUrl = result.url;


                                // FIXME( This doesn't work.
                                // The problem here is that the superclass (File.js) doesn't 
                                // actually follow the rules; it directly accessses this.dataValue
                                // at all times, which is what Formio uses as the value. In fact, the 
                                // getValue function by default just returns this.dataValue.

                                modal.modal("hide");
                                $('.AnnotationCanvas',modal).empty();
                                self.fileChanged(true);

                            }
                        }).fail(function(err){
                            console.error(err);
                            $('#AnnotatorModal .SaveAnnotationCanvas').text("Something went wrong!");
                        })
                    })

                }); // end shown.bs.modal
        });  // end on annotate button click
    this.imAttachingNow = false;
    return superAttach;
  }


   getValue() {
      var value= {
        file: (this.fileComponent.getValue() || [])[0],
        annotatedUrl: this.annotatedUrl,
        annotation: this.annotation,
      };
      console.log('getValue ImageAnnotator',value);
      return value;
    }


    get emptyValue() {
      return {};
    }

    setValue(value) {
        console.log("setValue ImageAnnotator",value);
        var filevalue = value.file?[value.file]:[];
        this.fileComponent.setValue(filevalue);
        this.annotatedUrl = value.annotatedUrl;
        this.annotation = value.annotation;
    }


}


// Use the table component edit form.
ImageAnnotator.editForm = function(a,b,c)
{
    var form = Formio.Components.components.file.editForm();
    return form;
}


// Register the component to the Formio.Components registry.
Formio.Components.addComponent('ImageAnnotator', ImageAnnotator);

$(function(){
  // Add to the body of the HTML. Do this just once.
  $(document.body).append(
    ` <!-- Modal for image annotations -->
    <div class="modal fade" id="AnnotatorModal" data-keyboard="false" data-backdrop="static"  role="dialog" aria-labelledby="AnnotatorModalTitle" aria-hidden="true">
      <div class="modal-dialog modal-xl modal-dialog-centered" role="document">
        <div class="modal-content">
          <div class="modal-body">
                <div class="AnnotationCanvas"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
            <button type="button" class="btn btn-primary SaveAnnotationCanvas">Save changes</button>
          </div>
        </div>
      </div>
    </div>`
    );
})
