'use strict;'

// A class that allows you to annotate an image with some useful markers and stuff.
// 
// Useage:
// new AnnotationCanvas(element,options)
// options:
//   img_url  the base image to annotate.
//   TO DO: serialized object stored to resume editing!

class AnnotationCanvas
{

  // static init() {
  //   $('div.AnnotationCanvas').each(function(){
  //     $(this).data('AnnotationCanvas')=new AnnotationCanvas(this);
  //   })
  // }
  constructor(top_element,options) {
    // options:
    // img_url: url to base image, will rescale canvas to these dimensions.

    options = options||{};
    this.options = options;
    // Top element should be sized already.
    this.top_element = top_element;
    $(this.top_element).empty();
    this.addControls();

    console.log('add canvas');

    // create a canvas element.
    $(this.top_element).append("<canvas></canvas>");
    this.canvas_element = $('canvas',this.top_element).get(0);

    this.nominal_width = 600;  // nominal sizing, but will resize to pic dimensions
    this.nominal_height = 600;

    this.img_url = options.img_url;

    console.log('add fabricjs')
    this.canvas = new fabric.Canvas(this.canvas_element);
    this.resize();
    $(window).on('resize',this.resize.bind(this));
    $(this.top_element).parents('')

    this.canvas.preserveObjectStacking = true;

    // default controls appearance
    fabric.Object.prototype.set({
        transparentCorners: false,
        borderColor: 'rgba(255,255,255,0.5)',
        // cornerColor: '#ff0000',
        cornerColor: 'rgba(255,0,0,0.5)',
        cornerStyle: 'circle',
    });
    this.marker_number = 1;

    // These are promises because I might want to load several assets at the same time.
    this.loadThings()
      .then(()=>{
        console.log('done loading things',this);
      })
      .then(()=>{
        this.populate();
        this.setup();
      })
      .catch(console.error);
  }

  // useful for external caller:
  getSerialized() {
    return this.canvas.toObject();
  }
  getJSON() {
    return this.canvas.toDatalessJSON();
  }
  getImageUri() {
    this.canvas.discardActiveObject();
    this.canvas.requestRenderAll();
    return this.canvas.toDataURL({format: 'png', multiplier:(1.0/this.img_scale)});
  }


  // Add controls to top of element, draggable below.
  addControls() {
    console.log('add controls',this.top_element);
    var html = `
      <div class='control_div'>
        <div id='marker' class='dragthing rounded-sm'><img src='/annotation/marker-blue.svg'/></div>
        <div id='arrow'  class='dragthing rounded-sm'><img src='/annotation/myarrow.svg'/></div>
        <div id='circle' class='dragthing rounded-sm'><img src='/annotation/circle.svg'/></div>
        <div id='rect'   class='dragthing rounded-sm'><img src='/annotation/rect.svg'/></div>
        <div id='text'   class='dragthing rounded-sm'><img src='/annotation/text.svg'/></div>
        <div class='palette fill'>
          <span>Fill</span>
          <span class='palette-box' data-color="#000000"></span>
          <span class='palette-box' data-color="#575757"></span>
          <span class='palette-box' data-color="#ad2323"></span>
          <span class='palette-box' data-color="#2a4bd7"></span>
          <span class='palette-box' data-color="#1d6914"></span>
          <span class='palette-box' data-color="#814a19"></span>
          <span class='palette-box' data-color="#8126c0"></span>
          <span class='palette-box' data-color="#a0a0a0"></span>
          <span class='palette-box' data-color="#81c57a"></span>
          <span class='palette-box' data-color="#9dafff"></span>
          <span class='palette-box' data-color="#29d0d0"></span>
          <span class='palette-box' data-color="#ff9233"></span>
          <span class='palette-box' data-color="#ffee33"></span>
          <span class='palette-box' data-color="#e9debb"></span>
          <span class='palette-box' data-color="#ffcdf3"></span>
          <span class='palette-box' data-color="#ffffff"></span>
          <span class='palette-box' data-color=""></span>
        </div>
        <div class='palette stroke'>
         <span>Line</span>
          <span class='palette-box' data-color="#000000"></span>
          <span class='palette-box' data-color="#575757"></span>
          <span class='palette-box' data-color="#ad2323"></span>
          <span class='palette-box' data-color="#2a4bd7"></span>
          <span class='palette-box' data-color="#1d6914"></span>
          <span class='palette-box' data-color="#814a19"></span>
          <span class='palette-box' data-color="#8126c0"></span>
          <span class='palette-box' data-color="#a0a0a0"></span>
          <span class='palette-box' data-color="#81c57a"></span>
          <span class='palette-box' data-color="#9dafff"></span>
          <span class='palette-box' data-color="#29d0d0"></span>
          <span class='palette-box' data-color="#ff9233"></span>
          <span class='palette-box' data-color="#ffee33"></span>
          <span class='palette-box' data-color="#e9debb"></span>
          <span class='palette-box' data-color="#ffcdf3"></span>
          <span class='palette-box' data-color="#ffffff"></span>
          <span class='palette-box' data-color=""></span>
        </div>
        <div><span class='delete btn btn-primary'>&#9003;</span</div> 
      </div>
    `;
    $(this.top_element).append(html);
    this.control_element = $('.control_div',this.top_element).get(0);
    this.top_element.tabIndex=1000;

    // For each individual little colored box, set color = data
    $('.palette-box',this.control_element).each(function(){
      var c = $(this).data('color');
      if(c.length>0) $(this).css('background-color',c);
    });

    // color controls: clicking fill or stroke
    var self=this;
    $('.fill .palette-box',this.control_element).on('click',function(){
      var obj = self.canvas.getActiveObject();
      var c = $(this).data('color');
      console.log('click fill color',obj,c,this);
      obj.set({fill:$(this).data('color')});
      self.canvas.renderAll();
    });

   $('.stroke .palette-box',this.control_element).on('click',function(){
      var obj = self.canvas.getActiveObject();
      var c = $(this).data('color');
      obj.set({stroke:c});
      if(obj.my_text_obj && c != '') obj.my_text_obj.set({fill:c,stroke:c});
      self.canvas.renderAll();
    });

   // delete if button pressed or ke pressed.
   var delete_selected = function() {
      var obj = self.canvas.getActiveObject();
      if(obj) {
        if(obj.my_text_obj) self.canvas.remove(obj.my_text_obj);
        self.canvas.remove(obj);
        self.canvas.renderAll();
      }
   }

   $('.delete',this.control_element).on('click',delete_selected);


   // undo/redo
    this.top_element.addEventListener('keydown',function(event){
      console.log('keydown',event.key);
      switch(event.key) {
        case "Backspace":
        case "Delete":
            delete_selected();
            break;
        case "z":
          //https://github.com/lyzerk/fabric-history#readme
          if(event.ctrlKey || event.metaKey){
            self.canvas.undo();
          }
          break;
        case "Z":
          if(event.ctrlKey || event.metaKey){
            self.canvas.redo();
          }
          break;
      }
    },false);


    // If you start dragging a thing, put it's id in the drag info
    $('.dragthing',this.canvas_element).on('dragstart',function(ev){
      ev.originalEvent.dataTransfer.setData("text", this.id);
    });

  }

  resize() {
    // Actual screen realestate
    var w = $(this.top_element).width();
    var h = $(this.top_element).height()-$(this.control_element).height();
    console.log('resizing. Top element dimensions:',w,h);
    console.log('resizing. Nominal dimensions:',this.nominal_width,this.nominal_height);

    // scale to width/height as possible.
    var scalefactor_w = w/this.nominal_width;
    var scalefactor_h = h/this.nominal_height;
    this.img_scale = Math.min(scalefactor_w,scalefactor_h);
    console.log(this.nominal_width*this.img_scale);
    console.log(this.nominal_height*this.img_scale);

    this.canvas.setWidth(this.nominal_width*this.img_scale);
    this.canvas.setHeight(this.nominal_height*this.img_scale);
    this.canvas.renderAll();
  }

  loadThings() {
    return new Promise((resolve,reject)=>{
      // things that take no time.
      // load things that require callbacks.
      var loadsvg = this.promisify(fabric.loadSVGFromURL);
      var loadimg = this.promisify(fabric.Image.fromURL)
      Promise.all(
        [loadimg(this.img_url||"/annotation/1x1-ffffffff.png"),
         loadsvg('/annotation/marker-blue.svg'),
         loadsvg('/annotation/myarrow.svg')],         
      ).then((vec)=>{
        this.image = vec[0];
        this.nominal_width = this.image.width;
        this.nominal_height= this.image.height;
        console.log('image',this.image);
        this.resize();
        this.image.set({left:0, top:0, scaleX: this.img_scale, scaleY:this.img_scale});
        this.image.setCoords();
        this.canvas.add(this.image);
        console.log(this.image);
        // set boundaries for the canvas.        
        // this.nominal_width = this.img_element.naturalWidth;
        // this.nominal_height = this.img_element.naturalHeight;
        
        this.marker  = vec[1][0];
        this.arrow   = vec[2][0];
        this.circle  = new fabric.Circle({radius:50, fill:'white', strokeWidth:3, stroke:'white'});
        this.itext   = new fabric.IText("text",{fill:'white',strokeWidth:0.2,stroke:'black',fontSize:25});
        this.rect    = new fabric.Rect({width:40,height:30,fill:'',stroke:'white',strokeWidth:3})
        
        resolve();
      })
      .catch(reject);
    });
  }

  populate() {
    if(this.options.annotation) {
      this.canvas.loadFromJSON(this.options.annotation);
    } else {
      this.canvas.add(this.image);
    }
  }
  setup() {
    console.log(this);
    this.canvas.renderAll();
    var self = this;
    this.canvas.on('drop', function(ev){
      console.log(ev);
      var thingid = ev.e.dataTransfer.getData("text");
      var pointer = self.canvas.getPointer(ev.e);
      console.log(pointer,thingid);
      if(thingid=='marker')   self.addMarkerA(pointer);
      if(thingid=='arrow')    self.addObj(self.arrow,pointer);
      if(thingid=='circle')   self.addObj(self.circle,pointer);
      if(thingid=='rect')     self.addObj(self.rect,pointer);
      if(thingid=='text')     self.addObj(self.itext,pointer);
    })

    $('.dragthing',this.control_div).on('click',function(){
      console.log('click thing',this.id);
      var thingid = this.id;
      var pointer = {x: self.canvas.width/2, y: self.canvas.height/2};
      if(thingid=='marker')   self.addMarkerA(pointer);
      if(thingid=='arrow')    self.addObj(self.arrow,pointer);
      if(thingid=='circle')   self.addObj(self.circle,pointer);
      if(thingid=='rect')     self.addObj(self.rect,pointer);
      if(thingid=='text')     self.addObj(self.itext,pointer);

    })

  }

  addObj(obj,pt,attributes,cb) {
    pt = pt || {x:0, y:0};
    console.log('new arrow at',pt);
    var self = this;
    obj.clone(function(newobj){
      if (attributes) newobj.set(attributes);
      self.canvas.add(newobj);
      newobj.setPositionByOrigin(pt, 'center','center');
      newobj.setCoords();
      self.canvas.setActiveObject(newobj);

      self.canvas.renderAll();
      if(cb) cb(newobj);
    });
  } 



  addMarkerA(pt,attributes,cb){
        pt=pt || {x:0,y:0};
        console.log("new marker at",pt);
        var self = this;


        this.marker.clone(function(newmarker){
            if(attributes) newmarker.set(attributes);
            var text = (self.marker_number++).toString();
            var txt = new fabric.IText(text, { originX: 'center', originY:'center', fill: (attributes||{}).stroke || 'white', fontSize: 20 });
            newmarker.my_text_obj = txt;
            txt.setCoords();
            // txt.setPositionByOrigin({ x: newmarker.getScaledHeight()*0.5, y: newmarker.getScaledHeight()*0.7 }, 'center','center');
            txt.set({left:newmarker.getScaledHeight()*0.5, top:newmarker.getScaledHeight()*0.7});
            txt.setCoords();
            txt.set({hasControls: false});//, lockMovementX: true, lockMovementY: true});
            newmarker.setCoords()
            self.canvas.add(newmarker);
            self.canvas.add(txt);

            var trans12 = fabric.util.multiplyTransformMatrices(
                fabric.util.invertTransform(newmarker.calcTransformMatrix()),
                txt.calcTransformMatrix());

            newmarker.setCoords();

            var trans_ab = fabric.util.multiplyTransformMatrices(
                  fabric.util.invertTransform(newmarker.calcTransformMatrix()),
                  txt.calcTransformMatrix());
            var trans_ba = fabric.util.multiplyTransformMatrices(
                  fabric.util.invertTransform(txt.calcTransformMatrix()),
                  newmarker.calcTransformMatrix());

            var where = null;

            var update_ab = function(){
                  if(where) console.log('in ab',where);
                  where = 'ab';
                  var nr  = fabric.util.multiplyTransformMatrices(newmarker.calcTransformMatrix(),trans_ab);
                  var opt = fabric.util.qrDecompose(nr);
                  txt.setPositionByOrigin({ x: opt.translateX, y: opt.translateY }, 'center','center');
                  txt.set(opt);
                  txt.set({angle:0});
                  txt.set({scaleY: opt.scaleX});
                  txt.setCoords();
                  trans_ba = fabric.util.multiplyTransformMatrices(
                   fabric.util.invertTransform(txt.calcTransformMatrix()),
                   newmarker.calcTransformMatrix());
            }
   
            var update_ba = function(){
                if(where) console.log('in ba',where);
                where = 'ba';
                console.log("start ba");
                var nr  = fabric.util.multiplyTransformMatrices(txt.calcTransformMatrix(),trans_ba);
                var opt = fabric.util.qrDecompose(nr);
                newmarker.setPositionByOrigin({ x: opt.translateX, y: opt.translateY }, 'center','center');
                newmarker.setCoords();
                where = null;
            }

            newmarker.setPositionByOrigin(pt, 'center','center');
            newmarker.setCoords();
            self.canvas.setActiveObject(newmarker);
            update_ab();

            newmarker.on('moving',  update_ab);
            newmarker.on('rotating',update_ab);
            newmarker.on('scaling', update_ab);
            self.canvas.renderAll();

            txt.on('moving',  update_ba);
        });
  }


  promisify(f) { //https://javascript.info/promisify
  return function (...args) { // return a wrapper-function
    return new Promise((resolve, reject) => {

      args.push(resolve); // append our custom callback to the end of f arguments

      try {
        f.call(this, ...args); // call the original function
      } catch(err) {
        reject(err);
      }
    });
  };

};

} // end of class.


$(function(){
  // $('div.AnnotationCanvas').each(function(){
  //   console.log('add AnnotationCanvas',this);
  //   gCanvas = new AnnotationCanvas(this,
  //       {img_url:'/file/gridfs/5ecd323531486a50e98cec26'});
  // })
});
