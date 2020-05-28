'use strict';

var gAI = null

class AnnotatedImageUpload extends Formio.Components.components.file {

  static schema(...extend) {
    return super.schema({
              type: 'AnnotatedImageUpload',
              label: "Annotated Image",
              image: true,
              annotation: null,
              annotatedUrl: null
    }, ...extend);
  }

  static get builderInfo() {
    return {
      title: 'Annotated Image Upload (experimental: not working)',
      group: 'custom',
      icon: 'picture-o',
      weight: 6,
      schema: this.schema()
    };
  }


  render() {
    gAI = this;
    console.log("rendering Annotated",this.dataValue);
    var tpl = '';
    
    tpl += `<div class='annotatedDiv'>`;
    var imageUrlToShow = this.annotatedUrl;
    var originalFile = (this.dataValue||[])[0];
    if(!imageUrlToShow && originalFile && originalFile.url) {
      imageUrlToShow = originalFile.url;
    }
    if(imageUrlToShow) {
      tpl += `<button class="btn btn-primary"  ref="launchAnnotatorButton">Annotate This Image</button>`;
      tpl += `<img style='width:100%;" ref='annotatedImg' src='${imageUrlToShow}' />`
    }
    tpl += `</div>`;
    tpl += this.renderTemplate('file', {
      fileSize: this.fileSize,
      files: this.dataValue || [],
      statuses: this.statuses,
      disabled: this.disabled,
      support: this.support,
    });
    return Formio.Components.components.field.prototype.render.call(this,tpl)
  };

  attach(element) 
  {
    /// Called after rendering, just as the component is being inserted into the DOM.
    /// .. just like a text area...
    this.loadRefs(element, {annotatedImg: 'single',
                            launchAnnotatorButton: 'single'});
    var superAttach = super.attach(element);
    var self = this;
    
    // The meat:
    $(this.refs.launchAnnotatorButton).on('click',
        function(){
                var modal = $('#AnnotatorModal');
                console.log('clicked the button',modal);
                modal.modal("show");
                modal.on("shown.bs.modal",
                  function(){
                    console.log("modal should be open now");
                    var canvas = new AnnotationCanvas(
                        $('.AnnotationCanvas',modal).get(0),
                        {img_url:'/file/gridfs/5ecd323531486a50e98cec26'});
                    // for debugging:
                    gCanvas = canvas;
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
                                console.log('success',json,result);

                                // Set the orignal data.
                                if(result.url) self.annotatedUrl = result.url;
                                modal.modal("hide");
                                self.render();
                            }
                        }).fail(function(err){
                            console.error(err);
                            $('#AnnotatorModal .SaveAnnotationCanvas').text("Something went wrong!");
                        })
                    })

                }); // end shown.bs.modal
        });  // end on annotate button click
     
    return superAttach;
  }


   getValue() {
      return {
        file: (this.dataValue||[])[0],
        annotation: this.markerState,
        dataUrl: this.dataUrl,
      }
    }

}


// Use the table component edit form.
AnnotatedImageUpload.editForm = function(a,b,c)
{
    var form = Formio.Components.components.file.editForm();
    return form;
}


// Register the component to the Formio.Components registry.
Formio.Components.addComponent('AnnotatedImageUpload', AnnotatedImageUpload);

$(function(){
  // Add to the body of the HTML. Do this just once.
  console.log('appending modal');
  $(body).append(
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
