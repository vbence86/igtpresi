/**
 * Describes a factory object that writes formatted text to an offscreen canvas element using fillText.
 *  - Can then be used as an image source for an {{#crossLink "Actor"}}{{/crossLink}} or written directly to an onscreen canvas element.
 *  - Gives a performance improvement over using fillText every frame.
 *  - Includes functions for font preload detection.
 * @author Bob Moir on 18/06/2015.
 * @class CanvasText
 * @param config {Object}
 *      @param [config.fontFamily = "arial"] {String} The font family to use
 *      @param [config.fontSize = "10px"] {String} Text size / line height
 *      @param [config.fontStyle = "normal"] {String} normal|italic|oblique
 *      @param [config.fontWeight = "normal"] {String} normal|bold|bolder|lighter|100|200...
 *      @param [config.fontVariant = "normal"] {String} normal|small-caps
 *      @param [config.fillStyle = "black"] {String} Fill colour to apply to the characters
 *      @param [config.strokeStyle] {String} Fill colour to apply to stroke (i.e. text outline)
 *      @param [config.strokeStyles = []] {Array} Fill colours to apply to strokes (i.e. text outlines). Listed in drawing order.
 *      @param [config.lineWidth] {String} Stroke width in pixels.
 *      @param [config.lineWidths = []] {Array} Stroke widths in pixels. Listed in drawing order.
 *      @param [config.shadowColour = null] {String} Fill colour to apply to text shadow. Null = no shadow.
 *      @param [config.shadowBlur = 0] {Number} Gaussian shadow blur radius in px. Larger numbers = more blur.
 *      @param [config.shadowOffsetX = 0] {Number} Horizontal distance between shadow and characters in px.
 *      @param [config.shadowOffsetY = 0] {Number} Vertical distance between shadow and characters in px.
 *      @param [config.baseHeightString = "WWW"] {String} A canvas element that is taller than any character must be created to measure the text height of a new CanvasText object. This is calculated by measuring the width of the baseHeightString setting and using that as the height. Normally this value never needs to be changed.
 *      @param [config.measureHeightString = "IQqgjiy|0123456789,"] {String} This is the string that is written to the base canvas and used to measure the text height. It usually doesn't need to be changed unless a font has a particularly tall character or a game uses a reduced character set and you want to save some space.
 *      @param [config.location] {HTMLElement} The place in the document that generated text will be placed. Useful when converting values from px.
 * @module CanvasText
 * @constructor
 */

var CanvasText = function(config) {
    // ----------------------------------------- //
    //Configuration
    config = config || {};

    config.strokeStyles = config.strokeStyles || (config.strokeStyle ? [config.strokeStyle] : []);
    config.lineWidths = config.lineWidths || (config.lineWidth ? [config.lineWidth] : []);

    if(config.strokeStyles.length !== config.lineWidths.length) {
        throw new Error("number of stroke styles and line widths do not match!");
    }

    // ----------------------------------------- //
    //Private properties
    var _that = this,
        _fontFamily = config.fontFamily || "Arial",                             //Name of the font to use.
        _fontSize = config.fontSize || "10px",                                  //Font size. This is a style string so you can use px, em, %...
        _fontStyle = config.fontStyle || "normal",                              //Font style. Can be normal, italic, oblique...
        _fontWeight = config.fontWeight || "normal",                            //Font weight. Can be normal, bold, bolder, 100, 200...
        _fontVariant = config.fontVariant || "normal",                          //Font variant. Can be normal, small-caps...
        _fillStyle = config.fillStyle || "black",                               //Text colour
        _strokeStyles = config.strokeStyles,                                    //Stroke(outline) colours. Listed in drawing order
        _lineWidths = config.lineWidths,                                        //Stroke widths
        _shadowColour = config.shadowColour || null,                            //Shadow colour
        _shadowBlur = config.shadowBlur || 0,                                   //Shadow blur level
        _shadowOffsetX = config.shadowOffsetX || 0,                             //Horizontal shadow offset
        _shadowOffsetY = config.shadowOffsetY || 0,                             //Vertical shadow offset
        _measureRequired = true,                                                //True when the text height has changed and must be measured again
        _measuredTextHeight = -1,                                               //Height in px of the final
        _measureString = config.measureHeightString || "IQqgjiy|0123456789,",   //String to use when measuring the text height (default string tries to cover full font height)
        _baseHeightString = config.baseHeightString || "WWW",                   //Used to set the canvas height before measuring. Makes the assumption that no text is three times as high as it is wide.
        _location = config.location,                                            //Can be set to the container that this text will be placed in, to attempt conversion from ems/pts to px by testing the font height of the .
        _minimumTextHeight = parseInt(config.minimumTextHeight, 10) || 5;       //If the _measuredTextHeight is below this value, assume the font had not loaded yet and force a re-measure.
    // ----------------------------------------- //

    // ----------------------------------------- //
    //Private functions
    /**
     * Writes the given string to a canvas using the current format settings
     * @method writeToCanvas
     * @param {String} string The text to write
     * @param {HTMLCanvasElement} canvas The canvas to write it to
     * @return {HTMLCanvasElement} the edited canvas
     * @private
     */
    var writeToCanvas = function writeToCanvas(string, canvas) {
        var context = canvas.getContext("2d");     //2d canvas context

        canvas.id = "textCanvas";                       //In some cases the canvas needs to be added to the page temporarily, so make it easy to identify
        canvas.visibility = "hidden";                   //Hide it when it's added to the page

        document.body.appendChild(canvas);              //Canvas has to be added to the document to get an accurate fontSize when using ems.

        //Apply settings
        context.font = getFontString();

        //Set canvas width
        canvas.width = context.measureText(string).width + Math.max(Math.max.apply(null, _lineWidths) * 2, 0); //If _lineWidths is empty, the max value returned is -Infinity, for some reason.

        //Reapply settings (changing canvas width resets them)
        context.font = getFontString();

        //Baseline and Alignment should always be the same values
        context.textBaseline = "middle";
        context.textAlign = "center";

        //Draw the shadow first
        if(_shadowColour !== null) {
            context.shadowColor = _shadowColour;
            context.shadowBlur = _shadowBlur;
            context.shadowOffsetX = _shadowOffsetX;
            context.shadowOffsetY = _shadowOffsetY;
        }

        //draw any outlines
        if(_strokeStyles.length > 0) {
            context.lineWidth = _lineWidths[0];
            context.strokeStyle = _strokeStyles[0];
            context.strokeText(string, canvas.width / 2, canvas.height / 2);

            //Have to redraw the first stroke if a shadow is present (avoids bleed into the stroke)
            if(_shadowColour !== null) {
                context.shadowColor = "transparent";
                context.strokeText(string, canvas.width / 2, canvas.height / 2);
            }

            //Draw remaining outlines
            for(var i = 1; i < _strokeStyles.length; i++) {
                context.lineWidth = _lineWidths[i];
                context.strokeStyle = _strokeStyles[i];
                context.strokeText(string, canvas.width / 2, canvas.height / 2);
            }
        }

        //finally, draw the text on top
        if(_fillStyle !== null) {
            context.fillStyle = _fillStyle;
            context.fillText(string, canvas.width / 2, canvas.height / 2);
        }

        document.body.removeChild(canvas); //Remove from the DOM
        return canvas;
    };

    /**
     * Converts a non-px font size string (e.g. pt, em) to the value in px, for use in lineWidths etc.
     * @param size {String} Font size and units as a string (e.g. "5pt")
     * @returns {Number} Font size in px.
     */
    var convertToPx = function convertToPx(size) {
        //sanitise input
        size = String(size);

        //Check if we need to convert
        if(size.indexOf("px") > 0 || String(parseInt(size, 10)) === size) {
            //size is already in px or is dimensionless, so assume it is in px.
            return parseInt(size, 10);
        }

        //Convert
        var canvas = document.createElement("canvas");
        var context = canvas.getContext("2d");

        if(_location) {
            _location.appendChild(canvas);
        }

        context.font = [_fontStyle, _fontWeight, _fontVariant, size, _fontFamily].join(" ");

        if(_location) {
            _location.removeChild(canvas);
        }

        var ret = parseInt(context.font, 10);
        context = null;
        canvas = null;

        return ret;
    };

    /**
     * Puts all font options together into a string to assign to the canvas
     * @private
     */
    var getFontString = function getFontString() {
        var str = [_fontStyle, _fontWeight, _fontVariant, _fontSize, _fontFamily].join(" ");
        return str;
    };
    // ----------------------------------------- //

    // ----------------------------------------- //
    //Public get/set functions
    /**
     * Sets the font family to use when creating the text image.
     * @method setFontFamily
     * @param {String} fontFamily
     * @returns {CanvasText} The CanvasText object, so functions can be chained.
     * @public
     */
    this.setFontFamily = function setFontFamily(fontFamily) {
        _fontFamily = fontFamily;
        _measureRequired = true;
        return this;
    };

    /**
     * Sets the font size to use when creating the text image.
     * @method setFontSize
     * @param {String} fontSize
     * @returns {CanvasText} The CanvasText object, so functions can be chained.
     * @public
     */
    this.setFontSize = function setFontSize(fontSize) {
        _fontSize = fontSize;
        _measureRequired = true;
        return this;
    };

    /**
     * Sets the font style to use when creating the text image.
     * @method setFontStyle
     * @param fontStyle
     * @returns {CanvasText} The CanvasText object, so functions can be chained.
     * @public
     */
    this.setFontStyle = function setFontStyle(fontStyle) {
        _fontStyle = fontStyle;
        _measureRequired = true;
        return this;
    };

    /**
     * Sets the font style to use when creating the text image.
     * @method setFontWeight
     * @param {string} fontWeight
     * @returns {CanvasText} The CanvasText object, so functions can be chained.
     * @public
     */
    this.setFontWeight = function setFontWeight(fontWeight) {
        _fontWeight = fontWeight;
        _measureRequired = true;
        return this;
    };

    /**
     * Sets the font style to use when creating the text image.
     * @method setFontVariant
     * @param {string} fontVariant
     * @returns {CanvasText} The CanvasText object, so functions can be chained.
     * @public
     */
    this.setFontVariant = function setFontVariant(fontVariant) {
        _fontVariant = fontVariant;
        _measureRequired = true;
        return this;
    };

    /**
     * Sets the fill style (i.e. text colour) to use when creating the text image.
     * @method setFillStyle
     * @param {string} fillStyle
     * @returns {CanvasText} The CanvasText object, so functions can be chained.
     * @public
     */
    this.setFillStyle = function setFillStyle(fillStyle) {
        _fillStyle = fillStyle;
        return this;
    };

    /**
     * Sets the string to use when setting the height of the test canvas during text height measurement. This should not be called unless measuring a font that is at least 3 times as tall as it is wide.
     * @method setBaseHeightString
     * @param {string} string
     * @returns {CanvasText} The CanvasText object, so functions can be chained.
     * @public
     */
    this.setBaseHeightString = function setBaseHeightString(string) {
        _baseHeightString = string;
        _measureRequired = true;
        return this;
    };

    /**
     * Sets the text shadow to apply when creating the text image.
     * @method setShadow
     * @param {string} colour Shadow colour.
     * @param {number} blur Shadow blur amount.
     * @param {number} offsetX Horizontal shadow offset.
     * @param {number} offsetY Vertical shadow offset.
     * @returns {CanvasText} The CanvasText object, so functions can be chained.
     * @public
     */
    this.setShadow = function setShadow(colour, blur, offsetX, offsetY) {
        if(typeof(colour !== "undefined")) {_shadowColour = colour;}
        if(typeof(blur !== "undefined")) {_shadowBlur = blur;}
        if(typeof(offsetX !== "undefined")) {_shadowOffsetX = offsetX;}
        if(typeof(offsetY !== "undefined")) {_shadowOffsetY = offsetY;}
        _measureRequired = true;
        return this;
    };

    /**
     * Sets the minimum height of the text. Text measured as being smaller than this is treated as an error, and is re-measured.
     * @method setMinimumTextHeight
     * @param minHeight
     * @returns {CanvasText}
     */
    this.setMinimumTextHeight = function setMinimumTextHeight(minHeight) {
        var mh = parseInt(minHeight, 10);
        if(!isNaN(mh)){
            _minimumTextHeight = mh;
            _measureRequired = true;
        }

        return this;
    };

    // ----------------------------------------- //

    // ----------------------------------------- //
    //Object methods
    /**
     * Adds a stroke/outline to the text.
     * @method addStroke.
     * @param {String} style strokeStyle property to apply.
     * @param {Number} width lineWidth property to apply.
     * @returns {CanvasText} The CanvasText object, so functions can be chained.
     * @public
     */
    this.addStroke = function addStroke(style, width) {
        _strokeStyles.push(style);
        _lineWidths.push(width);
        _measureRequired = true;
        return this;
    };

    /**
     * Remove an outline from the object. This is probably only useful for debug..
     * @method removeStroke.
     * @param {string} style Stroke style to remove from the text image.
     * @returns {CanvasText} The CanvasText object, so functions can be chained.
     * @public
     */
    this.removeStroke = function removeStroke(style) {
        var index = _strokeStyles.indexOf(style);
        if(index > -1) {
            _strokeStyles.splice(index, 1);
            _lineWidths.splice(index, 1);
            _measureRequired = true;
        }
        return this;
    };

    /**
     * A laborious function for accurately measuring text height - far more expensive than it should be.
     * @method measureTextHeight
     * @param {String} [string] Sample string used to measure the height (retained between calls; has a default value).
     * @returns {Number} Text height in px.
     * @public
     */
    this.measureTextHeight = function measureTextHeight(string) {
        if(typeof(string) !== "undefined") {_measureString = string;}   //Check for new test string

        var canvas = document.createElement("canvas");                  //Test canvas for measuring the text height
        var context = canvas.getContext("2d");                          //Canvas context

        //We can measure how wide the text will be natively, so we use that to make our test canvas
        context.font = getFontString();
        var hh = context.measureText(_baseHeightString).width; //assume that a single letter will not be taller than _baseHeightString is wide
        canvas.width = context.measureText(_measureString).width;
        canvas.height = hh;

        //Write the sample text to the test canvas
        canvas = writeToCanvas(_measureString, canvas);

        //now we have our sample written onto the canvas, lets get the height in pixels
        var data = context.getImageData(0, 0, canvas.width, canvas.height).data;
        var heightCounter = canvas.height;

        //Scan through the entire canvas, decrementing heightCounter every time you find a fully transparent row
        ////This won't work if you have a font with a clear gap through the middle, but it's not the '80s so this is probably fine.
        var xx = 0,
            yy = 0;
        var alphaChannel = [[]];
        for(var i = 3; i < data.length; i += 4) {
            if(xx === canvas.width) {
                xx = 0;
                yy ++;
                alphaChannel.push([]);
            } else {
                xx++;
            }
            alphaChannel[yy].push(data[i]);
        }

        for(yy = 0; yy < alphaChannel.length; yy++) {
            var rowClear = true;
            for(xx = 0; xx < alphaChannel[0].length; xx++) {
                if(alphaChannel[yy][xx] !== 0) {
                    rowClear = false;
                    break;
                }
            }
            if(rowClear) {
                heightCounter--;
            }
        }

        _measuredTextHeight = heightCounter + 2; //Add an extra 2 pixels to avoid clipping due to rounding errors
        _measureRequired = false;
        return _measuredTextHeight;
    };

    /**
     * Given a string, writes it to the object canvas and returns a copy.
     * @method createTextImage
     * @param {string} string Text to convert to an image
     * @returns {HTMLCanvasElement} An offscreen canvas element containing the text
     * @public
     */
    this.createTextImage = function createTextImage(string) {
        //Check if the height needs to be calculated
        if(_measureRequired || (_minimumTextHeight > _measuredTextHeight)) {
            _fontSize = convertToPx(_fontSize) + "px";
            for(var i = 0; i < _lineWidths.length; i++) {
                _lineWidths[i] = convertToPx(_lineWidths[i]);
            }
            _shadowOffsetX = convertToPx(_shadowOffsetX);
            _shadowOffsetY = convertToPx(_shadowOffsetY);

            this.measureTextHeight();
        }

        //Create a canvas element and context
        var canvas = document.createElement("canvas");
        var context = canvas.getContext("2d");

        //Set the canvas height
        canvas.height = _measuredTextHeight;

        //draw and return
        return writeToCanvas(string, canvas);
    };

    /**
     * Takes a text configuration and uses it to modify the existing settings for this object.
     * Text height re-measurement will only occur if it is necessary.
     * @method modify
     * @param config
     *      @param [config.fontFamily = "arial"] {String} The font family to use
     *      @param [config.fontSize = "10px"] {String} Text size / line height
     *      @param [config.fontStyle = "normal"] {String} normal|italic|oblique
     *      @param [config.fontWeight = "normal"] {String} normal|bold|bolder|lighter|100|200...
     *      @param [config.fontVariant = "normal"] {String} normal|small-caps
     *      @param [config.fillStyle = "black"] {String} Fill colour to apply to the characters
     *      @param [config.strokeStyle] {String} Fill colour to apply to stroke (i.e. text outline)
     *      @param [config.strokeStyles = []] {Array} Fill colours to apply to strokes (i.e. text outlines). Listed in drawing order.
     *      @param [config.lineWidth] {String} Stroke width in pixels.
     *      @param [config.lineWidths = []] {Array} Stroke widths in pixels. Listed in drawing order.
     *      @param [config.shadowColour = null] {String} Fill colour to apply to text shadow. Null = no shadow.
     *      @param [config.shadowBlur = 0] {Number} Gaussian shadow blur radius in px. Larger numbers = more blur.
     *      @param [config.shadowOffsetX = 0] {Number} Horizontal distance between shadow and characters in px.
     *      @param [config.shadowOffsetY = 0] {Number} Vertical distance between shadow and characters in px.
     *      @param [config.baseHeightString = "WWW"] {String} A canvas element that is taller than any character must be created to measure the text height of a new CanvasText object. This is calculated by measuring the width of the baseHeightString setting and using that as the height. Normally this value never needs to be changed.
     *      @param [config.measureHeightString = "IQqgjiy|0123456789,"] {String} This is the string that is written to the base canvas and used to measure the text height. It usually doesn't need to be changed unless a font has a particularly tall character or a game uses a reduced character set and you want to save some space.
     * @returns {CanvasText} The CanvasText object, so functions can be chained.
     */
    this.modify = function(config) {
        config.strokeStyles = config.strokeStyles || (config.strokeStyle ? [config.strokeStyle] : []);
        config.lineWidths = config.lineWidths || (config.lineWidth ? [config.lineWidth] : []);

        var i,
            shadowColour = config.shadowColour || null,
            shadowBlur = config.shadowBlur || 0,
            shadowOffsetX = config.shadowOffsetX || 0,
            shadowOffsetY = config.shadowOffsetY || 0;

        if(config.fontFamily) {
            _that.setFontFamily(config.fontFamily);
        }
        if(config.fontSize) {
            _that.setFontSize(config.fontSize);
        }
        if(config.fontStyle) {
            _that.setFontStyle(config.fontStyle);
        }
        if(config.fontWeight) {
            _that.setFontWeight(config.fontWeight);
        }
        if(config.fontVariant) {
            _that.setFontVariant(config.fontVariant);
        }
        if(config.fillStyle) {
            _that.setFillStyle(config.fillStyle);
        }
        if(config.strokeStyles.length !== config.lineWidths.length) {
            throw new Error("number of stroke styles and widths do not match!");
        } else if(config.strokeStyles.length > 0) {
            _strokeStyles = [];
            _lineWidths = [];
            for(i = 0; i < config.strokeStyles.length; i++) {
                _that.addStroke(config.strokeStyles[i], config.lineWidths[i]);
            }
        }
        if(shadowColour !== null) {
            _that.setShadow(shadowColour, shadowBlur, shadowOffsetX, shadowOffsetY);
        }
        if(config.baseHeightString && config.baseHeightString !== _baseHeightString) {
            _baseHeightString = config.baseHeightString;
            _measureRequired = true;
        }
        if(config.measureHeightString && config.measureHeightString !== _measureString) {
            _measureString = config.measureHeightString;
            _measureRequired = true;
        }

        return this;
    };

    /**
     * Returns a "deep" copy of this Object, with no shared references. This is useful when text varies only slightly in style, e.g when using different skins, or multiple text sizes.
     * @method clone
     * @public
     * @returns {CanvasText}
     */
    this.clone = function clone() {
        //First create the clone using the primitive variables as settings (passed by value by default)
        var cl = new CanvasText({
            fontFamily:             _fontFamily,
            fontSize:               _fontSize,
            fontStyle:              _fontStyle,
            fontWeight:             _fontWeight,
            fontVariant:            _fontVariant,
            fillStyle:              _fillStyle,
            shadowColour:           _shadowColour,
            shadowBlur:             _shadowBlur,
            shadowOffsetX:          _shadowOffsetX,
            shadowOffsetY:          _shadowOffsetY,
            baseHeightString:       _baseHeightString,
            measureHeightString:    _measureString
        });

        //Now copy the Object variables and add them to the clone
        for(var i = 0; i < _strokeStyles.length; i++) {
            cl.addStroke(_strokeStyles[i], _lineWidths[i]);
        }

        return cl;
    };
};