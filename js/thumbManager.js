var ThumbManager = function (options, $){
  this.options = options

  , this.$thumbs = $([])

  // external function that will redraw all the slides
  , this.redrawSlideShow = function(){}

  // sels for thumbs and containers
  , this.sels = {
    thumbsBarId: "#thumbs-bar",
    thumbsHolderId    : "#thumb-holder",
    thumbEditIdClass : "thumb-edit-id", 
    thumbListClass    : "thumb-li",
    thumbContainerClass  : "thumb",
    slideThumbClass : "thumb-step",
    dragBarId: "#thumbs-bar #dragbar",
  }

  /** @function validateAndSetOptions
  *   @description: validates external options and, if valid, overrides defaults
  */
  ThumbManager.prototype.validateAndSetOptions = function (options){
    if(!options){return;}

    if(options.sels){
      for (var key in this.sels){
        if( options.sels[key]){
          if(!(typeof options.sels[key] == "string")){
            console.log("Error atThumbManager.validateAndSetOptions(): options.sels." + key + " should be a string")
            return;
          }else{
            this.sels[key] = options.sels[key];
          }
        } 
      }
    }
  }

  /** @function init
  *   @description: adds resize listeners to the thumb container,
  *   and creates the thumbs for existing slides
  */
  ThumbManager.prototype.init = function(){
    this.validateAndSetOptions(this.options)
    var that = this
    , sels = this.sels;

    // setup resize listeners
    $(sels.thumbsBarId)
      //delete handler
      .on("click", '.' + sels.thumbContainerClass + " .close", function(e){
        e.stopPropagation();
        var $thumbStep = $(this).parent().find('.' + sels.slideThumbClass)
        , thumbId = $thumbStep.attr('id')
        , slideRefId = $thumbStep.attr('data-references');

        triggerEvent(document, "thumbmanager:thumb-delete", {thumbId: thumbId, slideRefId: slideRefId}); 
    })
      //change slide id handler
      .on("blur", '.' + sels.thumbEditIdClass, function(e){
        var $thumbStep = $(this).siblings('.thumb').find('.' + sels.slideThumbClass)
        , newId = this.textContent
        , slideRefId = $thumbStep.attr('data-references');

        triggerEvent(document, "thumbmanager:thumb-edit-id", {
          slideRefId: slideRefId,
          newId : newId
        }); 
    })
      //on enter do not got to a new line
      .on("keydown", '.' + sels.thumbEditIdClass, function(e){
        if(e.keyCode == 13) {
          this.blur();
        }
    });

    // when not clicking
    // $(sels.thumbsBarId).on("click", '*', function(e){
    //   console.log("should clear");
    // });

    $(sels.dragBarId).on("mousedown.dragbar",function(e){
      e.preventDefault();
      var $document = $(document)

      $document.on('mouseup.dragbar',function(e){          
        $document.off('mousemove.dragbar');
        $document.off('mouseup.dragbar');
      });
     
      
      $document.on('mousemove.dragbar',function(e){
        var newWidth = $(window).innerWidth() - e.clientX;
        //return if too big or too small
        if(newWidth > 500 || newWidth < 100) return;

        $(sels.thumbsBarId).css("width",newWidth);
        that.resizeThumbs();
      })
    });
    
    // add thumbs:

    //choose all elements 
    var $steps = $('.step');
    var thumbs = [];
    $steps.each(function(index){
     thumbs.push(that.createThumb($(this)))
    })

    //add to thumbsbar
    $.each(thumbs, that.injectThumb.bind(that));

    //cache jquery objects
    that.$thumbs = $("."+ this.sels.slideThumbClass);
    that.resizeThumbs();

    $(sels.thumbsHolderId).multisortable({
      items: ".thumb-li",
      cancel: ".thumb-edit-id",
      stop: function(e){
        var triggerSortEvent = function (el){
          var $thumbStep  = $(el).find('.' + sels.slideThumbClass)
            , thumbId       = $thumbStep.attr('id')
            , slideRefId    = $thumbStep.attr('data-references')
            , newIndex      = $(el).index();
          console.log('trigger 4', slideRefId)
          triggerEvent(document, "thumbmanager:thumb-sorted", {
            thumbId : thumbId,
            slideRefId : slideRefId,
            newIndex : newIndex
          })
        };
       
        var $selection = $(sels.thumbsHolderId + ' .selected');
        // if it's just one no need to run through the whole array
        if($selection.length==1){
          triggerSortEvent($selection[0]);
        }else{
          $(sels.thumbsHolderId + ' .thumb-li')
          .sort(function(a,b){
            return  ($(a).index() <  $(b).index() ? -1 : 1);
          })
          .each(function(){
            console.log()
            triggerSortEvent(this);
          });
        }
      },
      click: function(e){ 
        var $selection = $(sels.thumbsHolderId + ' .selected');
        if($selection.length==1){
          var thumbId = $selection.attr('id')
          , slideRefId = $selection.attr('data-references');
          triggerEvent(document, "thumbmanager:thumb-clicked", {thumbId: thumbId, slideRefId: slideRefId}) 
        }else{

          var thumbIds = []
          , slideRefIds = [];

          $selection.each(function(){
            var $this = $(this);
            thumbIds.push($this.attr('id'));
            slideRefIds.push($this.attr('data-references'))
          })
      
          triggerEvent(document, "thumbmanager:thumb-selection", {thumbIds: thumbIds, slideRefIds: slideRefIds}) 
        }
     }
  });

  }

  /** @function injectThumb
  *   @description: injects a cloned slide to the thumb bar after it wraps it with
  * a container element and a label. index 
  * is a parameter that jQuery each() functions pass. It's not
  * used currently
  */
  ThumbManager.prototype.injectThumb = function(index, thumb){
    var sels = this.sels
    , $thumb = $(thumb)
    , ref = $thumb.attr('data-references');

    // look if the body has an impress-on-* class and cache it
    var saved_body_class
      , body_classes = $("body")[0].classList;

    for (i = 0; i<body_classes.length; i++) {
      var c = body_classes[i];
      if (c.match("^impress-on-")) {
        saved_body_class = c;
      }
    }

    if (saved_body_class) {
        $("body").removeClass(saved_body_class);
    }

    //force the body to be on the current ref slide 
    // (we're going to use the body background for the 
    // thumb background)
    $("body").addClass("impress-on-"+ref);

    $(sels.thumbsBarId + ' ' + sels.thumbsHolderId).append($thumb)
    $thumb
      .wrap('<li id="' + ref + '-thumb" class="'+ sels.thumbListClass +'" data-references="' + ref + '"></li>')
      .wrap('<div class="'+ sels.thumbContainerClass +'"></div>')
      .parent()
        .css("background", $('body').css('background'))
        // add the delete button to each thumb
        .prepend('<a class="close" href="#">&times;</a>')
        .parent()
          .prepend('<div class="thumb-edit-id" contenteditable="true">'+ ref + '</div>');

    //clean up body impress-on- class and restore previous one
    $("body").removeClass("impress-on-"+ref);

    if (saved_body_class) {
        $("body").addClass(saved_body_class);
    }
  }

  /** @function updateThumb
  *   @description: updates the thumb that corresponds to
  * stepId to much the contents and style of it (the stepId slide)
  */
  ThumbManager.prototype.updateThumb = function(stepId){
    var $newThumb = this.createThumb($('#' + stepId));

    //update in thumbs-bar
    $('.' + this.sels.slideThumbClass+'[data-references='+ stepId+']').replaceWith($newThumb);
    //update $thumbs
    this.$thumbs = $("."+ this.sels.slideThumbClass);
    this.resizeThumbs();
  }

  /** @function setThumbTitle
  *   @description: updates the title for the target thumb
  */
  ThumbManager.prototype.setThumbTitle = function(target, value){
    $('#' + target + '-thumb')
      .find('.'+this.sels.thumbEditIdClass)[0].textContent = value;
  }

  /** @function setThumbId
  *   @description: updates the oldId with newId
  */
  ThumbManager.prototype.setThumbId = function(oldId, newId){
    $('#' + oldId + '-thumb')
      .attr('data-references', newId)
      .attr('id', newId + '-thumb');

    $('#' + oldId + '-clone')
      .attr('data-references', newId)
      .attr('id', newId + '-clone');
  }

  /** @function deleteThumb
  *   @description: deletes the thumb that corresponds to the 
  * specified stepId
  */
  ThumbManager.prototype.deleteThumb = function(stepId){
  var that = this;
  $('.' + this.sels.slideThumbClass+'[data-references='+ stepId+']')
    .parents('li').fadeOut("slow", function() {
      $(this).remove();
      //update $thumbs
      that.$thumbs = $("."+ that.sels.slideThumbClass)
    });
  }

  /** @function selectThumb
  *   @description: Highlight the thumb that corresponds to the
  * specified thumb id
  */
  ThumbManager.prototype.selectThumb = function(stepId){
    if(stepId instanceof Array){

    }else if(typeof stepId == "string"){

    }
    $('.' + this.sels.thumbContainerClass+'[data-references='+ stepId+']')
      .addClass('active')
    .siblings()
      .removeClass('active')
      //.parent().removeClass("ui-selected")
    //$('.' + this.sels.slideThumbClass+'[data-references='+ stepId+']').parent().addClass('active');
  }
 
  /** @function insertThumb
  *   @description: given a step id it creates the corresponding
  * thumb and adds it to the thumbar
  */
  ThumbManager.prototype.insertThumb = function(stepId){
    var $newThumb = this.createThumb($('#' + stepId));
    // this.$thumbs = this.$thumbs.add($newThumb);

    this.injectThumb(0, $newThumb[0])
    that.resizeThumbs();
  }

  /** @function resizeThumbs
  *   @description: resizes all thumbs to fit their container width
  */
  ThumbManager.prototype.resizeThumbs = function(){
    // calculate padding margin and border width for left and right for each thumbContainer
    var $thumbContainer = $(this.sels.thumbsBarId + ' .' + this.sels.thumbContainerClass).eq(0);
    var outerWidth =  parseInt($thumbContainer.css("padding-left").replace("px", "")) + parseInt($thumbContainer.css("padding-right").replace("px", ""));
    outerWidth +=  parseInt($thumbContainer.parent().css("margin-left").replace("px", "")) + parseInt($thumbContainer.parent().css("margin-right").replace("px", ""))
    outerWidth +=  parseInt($thumbContainer.css("border-left-width").replace("px", "")) + parseInt($thumbContainer.css("border-right-width").replace("px", ""));
    var thumbContentWidth = $(this.sels.thumbsBarId).innerWidth() - outerWidth;

    this.$thumbs.each( function(index){
      var $this = $(this)
      , scaleFactor =  thumbContentWidth / $this.outerWidth();

      this.style["-webkit-transform"] = "scale("+scaleFactor+")";
      this.style["transform"] = "scale("+scaleFactor+")";
      $this.parent()
        .css({
          "width"  : parseInt($this.outerWidth() * scaleFactor) + "px",
          "height" : parseInt($this.outerHeight() * scaleFactor) + "px" 
        });
    });
  }


  /** @function createThumb
  *   @description: creates a clone of the original element,
  *   appends '-clone' to the original id and removes any
  *   classes for the cloned element and its children.
  *   iIt also adds a data-references attribute to the referenced
  *   step and sets the transform-origin css property.
  */
  ThumbManager.prototype.createThumb = function($slide){

    var that = this
    , $clone = $slide.clone()
    , cloneId = $clone.attr("id")

    , styles = {
        "-webkit-touch-callout" : "",
        "-webkit-user-select" : "",
        "-khtml-user-select" : "",
        "-moz-user-select" : "",
        "-ms-user-select" : "",
        "user-select" : ""
    };

    $clone
      //change id only if not empty
      .attr("id", (cloneId === undefined || cloneId == '') ? '' : cloneId + "-clone")
      .attr("class",that.sels.slideThumbClass)
      //copy original computed style
      .css(that.css($slide))
      .css(styles)
      //add reference to original slide
      .attr('data-references', $slide.attr('id'))
    
    //set transform orign property
    $clone[0].style["-webkit-transform-origin"] = "0 0";

    var $cloneChildren = $clone.find('*');
    //copy original computed style for children
    $slide.find('*').each(function(index){
      var id = $cloneChildren.eq(index).attr("id");
      $cloneChildren.eq(index)
        .removeAttr("id")
        .removeAttr("class")
        //copy original computed style
        .css(that.css($(this)))
        .css(styles);
    });

    return $clone;
  }

  /** @function css
  *   @description: Gets the computed styles of an element and returns
  *   key value pair of rules (compatible with jQuery)
  */
  ThumbManager.prototype.css = function(a){
      var rules = window.getComputedStyle(a.get(0));
      return this.css2json(rules);
  }

  /** @function css2json
  *   @description: Converts CSSStyleDeclaration objects or css rules
  *   in string format to key value pairs (compatible with jQuery)
  */
  ThumbManager.prototype.css2json = function(css){
      var s = {};
      if(!css) return s;
      if(css instanceof CSSStyleDeclaration) {
          for(var i in css) {
            if(!css[i]) {break;}
              if((css[i]).toLowerCase) {
                  s[(css[i]).toLowerCase()] = (css[css[i]]);
              }
          }
      } 
      else if(typeof css == "string") {
          css = css.split("; ");          
          for (var i in css) {
              var l = css[i].split(": ");
              s[l[0].toLowerCase()] = (l[1]);
          };
      }
      return s;
  }

  /** copied from impress.js (Copyright 2011-2012 Bartek Szopka (@bartaz))
  * @function triggerEvent
  * @description builds a custom DOM event with given `eventName` and `detail` data
  * and triggers it on element given as `el`.
  */
  var triggerEvent = function (el, eventName, detail) {
    var event = document.createEvent("CustomEvent");
    event.initCustomEvent(eventName, true, true, detail);
    el.dispatchEvent(event);
  };

  var that = this;
  $(function(){
    that.init()
  })
  

}