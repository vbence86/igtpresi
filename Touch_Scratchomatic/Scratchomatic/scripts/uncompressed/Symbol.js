/**
 * Z Indices of different symbol components (allows you to draw stuff across symbols, e.g. the shine effect on lucky numbers)
 * @class SymbolZIndices
 */
var SymbolZIndices = {
    BACKGROUND: 10,
    POP_UNDER: 20,
    PRIZE: 30,
    VALUE: 40,
    SPRITE: 50,
    FOIL: 100,
    POP_OVER: 110
};

/**
 * A class that defines the unique aspects of a symbol that appears on a scratch card.
 * @author Bob Moir on 19/06/2015.
 * @class Symbol
 * @param config
 *      @param config.group {SymbolGroup} Reference to the SymbolGroup that created this symbol
 *      @param [config.texMult] {Number} Local copy of the texture multiplier.
 *      @param [config.x] {Number} X-Coordinate in the group.
 *      @param [config.y] {Number} Y-Coordinate in the group.
 *      @param [config.width] {Number} Width of the symbol in px.
 *      @param [config.height] {Number} Height of the symbol in px.
 *      @param [config.backgroundObj] {PGCImage} Image used to draw the back of the symbol.
 *      @param [config.value] {String} Symbol value as a string.
 *      @param [config.valueObj] {PGCImage} Symbol value as a text image.
 *      @param [config.prize] {String} Symbol prize as a string.
 *      @param [config.prizeObj] {PGCImage} Symbol prize as a text image.
 *      @param [config.specialObjs] {Array} Any additional PGCImage objects used by the symbol (e.g. particles, animated content)
 *      @param [config.foilImage] {PGCImage} The canvas used to draw the foil for this symbol, wrapped in a PGCImage.
 *      @param [config.foilContext] {CanvasRenderingContext2d} Reference to the 2d context of the foilImage's canvas.
 *      @param [config.scratchSprite] {PGCImage} The sprite used to automatically scratch the symbol.
 *      @param [config.scratchBBox] {{x: Number, y: Number, w: Number, h: Number}} The area of the symbol that must be uncovered for this symbol to count as scratched.
 *      @param [config.prizeSymbol = false] {Boolean} Flag indicating that this symbol is a prize symbol
 * @constructor
 */
Symbol = function(config) {
    if(!config || !config.group) {
        throw new Error("missing config group on Symbol init!");
    }
    // ----------------------------------------- //
    //Private properties
    var _texMult = config.texMult || 1;

    var _that = this,
        _group = config.group,                              //The container SymbolGroup
        _backgroundObj = config.backgroundObj || null,      //Background sprite
        _value = config.value || "none",                    //Value expressed as a string string
        _valueObj = config.valueObj || null,                //Value sprite
        _prize = config.prize || "none",                    //Prize expressed as a string
        _prizeObj = config.prizeObj || null,                //Prize sprite
        _specialObjs = config.specialObjs || [],            //Stores any additional sprite components
        _foilImage = config.foilImage || null,              //Canvas element that represents the foil covering the symbol
        _foilContext = config.foilContext || null,          //2d context of the the foil canvas
        _foilRect,                                          //Rectangle object denoting the edges of the foil canvas in group coordinates.
        _x = config.x || 0,                                 //X-coordinate of the centre of the symbol in the group
        _y = config.y || 0,                                 //Y-coordinate of the centre of the symbol in the group
        _width,                                             //Symbol width in px
        _height,                                            //Symbol height in px
        _touchBBox = null,                                  //Bounding box that determines the touchable area of this symbol
        _scratchBBox,                                       //Bounding box that indicates the area of the foil that must be (mostly) revealed before the symbol is considered "scratched"
        _scratchMask,                                       //Collision mask of the symbol (detects when an area is scratched)
        _scratched,                                         //Flag indicating when the symbol has been scratched
        _scratchAnimating,                                  //Flag indicating that the symbol's scratch animation is currently playing
        _scratchSprite = config.scratchSprite || null,      //Sprite used to scratch off the symbol's foil automatically
        _timeLine,                                          //Stores the active Timeline object for this symbol during triggered animations
        _prizeSymbol = config.prizeSymbol === true;         //Flag indicating that this symbol is a special "prize symbol" that shows the prize awarded for matching the normal symbols in the group.

    // ----------------------------------------- //

    // ----------------------------------------- //
    //Private functions
    /**
     * Given the name of a part of the symbol, returns the object reference.
     * @method getPartByName
     * @param partName
     * @returns {PGCImage}
     * @private
     */
    var getPartByName = function getPartByName(partName) {
        switch(partName) {
            case "value":
            case "Value":
                return _valueObj;
            case "prize":
            case "Prize":
                return _prizeObj;
            case "background":
            case "backGround":
            case "Background":
                return _backgroundObj;
            case "foil":
            case "Foil":
                return _foilImage;
            default:
                return _that.getSpecialObj(partName);
        }
    };

    /**
     * Crops the Symbol part so it fits under the foil.
     * @method cropToFoil
     * @param {PGCImage} part The Symbol part to crop.
     * @returns {PGCImage} The cropped part.
     * @private
     */
    var cropToFoil = function cropToFoil(part) {
        //Create a canvas for the part image
        var cropCanvas = document.createElement("canvas"),
            cropCtx = cropCanvas.getContext("2d");
        cropCanvas.width = _foilImage.width;
        cropCanvas.height = _foilImage.height;

        //Draw the part(or first frame of the part) to the canvas
        part.draw(cropCtx, 0, cropCanvas.width / 2, cropCanvas.height / 2);

        //Crop using the foil image
        cropCtx.globalCompositeOperation = "destination-in";
        if(_foilImage.spriteImage) {
            cropCtx.drawImage(_foilImage.image, 0, 0, _foilImage.spriteWidth, _foilImage.spriteHeight);
        } else {
            cropCtx.drawImage(_foilImage.image, 0, 0);
        }

        var cropped = new PGCImage(cropCanvas, part.x, part.y);
        cropped.anchor = PGCAnchors.CENTRE;

        //Save the uncropped part to the cropped one for convenience's sake
        cropped.unCropped = part;

        //copy over the special properties of the uncropped part
        cropped.zIndex = part.zIndex;
        cropped.nameVal = part.nameVal;
        cropped.visible = part.visible;

        return cropped;
    };

    /**
     * Uncrops a part that was previously cropped to the foil. Passes through parts that were never cropped.
     * @param part The cropped symbol part
     * @returns {PGCImage} The uncropped part
     * @private
     */
    var unCrop = function unCrop(part) {
        if(!part || !part.unCropped) {
            return part; //assume this is an uncropped part so pass through.
        }

        //Replace the cropped image with the original
        _group.getScene().removeFromScene(part);
        _group.getScene().addToScene(part.unCropped, part.zIndex);

        return part.unCropped;
    };
    // ----------------------------------------- //

    // ----------------------------------------- //
    //Public get/set functions
    /**
     * @method getX
     * @returns {Number} X-Coordinate of the centre of the symbol
     */
    this.getX = function getX() {
        return _x / _texMult;
    };

    /**
     * @method getY
     * @returns {Number} Y-Coordinate of the centre of the symbol
     */
    this.getY = function getY() {
        return _y / _texMult;
    };

    /**
     * @method getWidth
     * @returns {Number}
     */
    this.getWidth = function getWidth() {
        return _width / _texMult;
    };

    /**
     * @method getHeight
     * @returns {Number}
     */
    this.getHeight = function getHeight() {
        return _height / _texMult;
    };

    /**
     * Sets the X and Y coordinates of the symbol
     * @method setPosition
     * @param x {Number} X-Coordinate of the centre of the symbol
     * @param y {Number} Y-Coordinate of the centre of the symbol
     * @returns {Symbol} The Symbol object, so functions can be chained.
     */
    this.setPosition = function setPosition(x, y) {
        _x = x * _texMult;
        _y = y * _texMult;

        _group.requestDraw();
        return this;
    };

    /**
     * Gets the tap-sensitive bounding box of this symbol, expressed as the coordinates of the symbol's top-left corner, its width and its height.
     * @returns {{x: Number, y: Number, w: Number, h: Number}}
     */
    this.getTouchBBox = function getTouchBBox() {
        if(_touchBBox !== null) {
            return _touchBBox;
        } else {
            return {
                x: _x - _width / 2,
                y: _y - _height / 2,
                w: _width,
                h: _height
            };
        }
    };

    /**
     * Sets a custom bounding box for registering tap events
     * @method setTouchBBox
     * @param offsetX {Number} horizontal distance from the centre point to the top left corner of the bounding box
     * @param offsetY {Number} vertical distance from the centre point to the top left corner of the bounding box
     * @param w {Number} width
     * @param h {Number} height
     * @returns {Symbol} The Symbol object, so functions can be chained
     */
    this.setTouchBBox = function setTouchBBox(offsetX, offsetY, w, h) {
        _touchBBox = {
            x: (_x + offsetX) * _texMult,
            y: (_y + offsetY) * _texMult,
            w: w * _texMult,
            h: h * _texMult
        };

        _group.requestDraw();
        return this;
    };

    /**
     * Gets the scratch-sensitive bounding box of this symbol, expressed as the coordinates of the symbol's top-left corner, its width and its height.
     * @returns {{x: Number, y: Number, w: Number, h: Number}}
     */
    this.getScratchBBox = function getScratchBBox() {
        if(_scratchBBox !== null) {
            return _scratchBBox;
        } else {
            return {
                x: (_x - _width / 2) / _texMult,
                y: (_y - _height / 2) / _texMult,
                w: _width / _texMult,
                h: _height / _texMult
            };
        }
    };

    /**
     * Sets a custom bounding box for registering tap events
     * @method setScratchBBox
     * @param offsetX {Number} horizontal distance from the centre point to the top left corner of the bounding box
     * @param offsetY {Number} vertical distance from the centre point to the top left corner of the bounding box
     * @param w {Number} width
     * @param h {Number} height
     * @returns {Symbol} The Symbol object, so functions can be chained
     */
    this.setScratchBBox = function setScratchBBox(offsetX, offsetY, w, h) {
        _scratchBBox = {
            x: (_x + offsetX),
            y: (_y + offsetY),
            w: w,
            h: h
        };

        _group.requestDraw();
        _scratchMask = new ScratchMask(_scratchBBox);
        return this;
    };

    /**
     * @method getScratchMask
     * @returns {ScratchMask}
     */
    this.getScratchMask = function getScratchMask() {
        return _scratchMask;
    };

    /**
     * @method getScratched
     * @returns {Boolean} True when the symbol has been revealed
     */
    this.getScratched = function getScratched() {
        return _scratched;
    };

    /**
     * @method setScratched
     * @returns {Boolean} True/false to indicate if the symbol has been scratched/opened
     */
    this.setScratched = function setScratched(isScratched) {
        _scratched = isScratched;
    };

    /**
     * @method setScratchAnimating
     * @param scratchAnimating {Boolean}
     * @returns {Symbol} The Symbol object, so functions can be chained
     */
    this.setScratchAnimating = function setScratchAnimation(scratchAnimating) {
        _scratchAnimating = scratchAnimating !== false;
    };

    /**
     * @method getScratchAnimating
     * @returns {Boolean}
     */
    this.getScratchAnimating = function getScratchAnimating() {
        return _scratchAnimating;
    };

    /**
     * @method getBackgroundObj
     * @returns {PGCImage|null}
     */
    this.getBackgroundObj = function getBackgroundObj() {
        return _backgroundObj;
    };

    /**
     * @method getValue
     * @returns {String}
     */
    this.getValue = function getValue() {
        return _value;
    };

    /**
     * @method getValueObj
     * @returns {PGCImage|null}
     */
    this.getValueObj = function getValueObj() {
        return _valueObj;
    };

    /**
     * @method getPrize
     * @returns {String}
     */
    this.getPrize = function getPrize() {
        return _prize;
    };

    /**
     * @method getPrizeObj
     * @returns {PGCImage|null}
     */
    this.getPrizeObj = function getPrizeObj() {
        return _prizeObj;
    };

    /**
     * Returns the special object named by the user, or the default special object (if any)
     * @method getSpecialObj
     * @param [specialName = "default"] {String}
     * @returns {PGCImage|{}}
     */
    this.getSpecialObj = function getSpecialObj(specialName) {
        specialName = specialName || "default";
        for(var i = 0; i < _specialObjs.length; i++) {
            if(_specialObjs[i].nameVal === specialName) {
                return _specialObjs[i];
            }
        }
        return {};
    };

    /**
     * Given a list of special object names, returns the first special object it finds on this Symbol that has one of those names.
     * @method getSpecialObjInList
     * @param list
     * @returns {PGCImage|{}}
     */
    this.getSpecialObjInList = function getSpecialObjInList(list) {
        var ret;
        for(var i = 0; i < list.length; i++) {
            ret = _that.getSpecialObj(list[i]);
            if(Object.keys(ret).length > 0) {
                return ret;
            }
        }
        return {};
    };

    /**
     * @method getFoilImage
     * @returns {PGCImage|null}
     */
    this.getFoilImage = function getFoilImage() {
        return _foilImage;
    };

    /**
     * @method getFoilContext
     * @returns {PGCImage|null}
     */
    this.getFoilContext = function getFoilContext() {
        return _foilContext;
    };

    /**
     * @method getFoilRect
     * @returns {PGCRect}
     */
    this.getFoilRect = function getFoilRect() {
        return _foilRect ? _foilRect : new PGCRect(0, 0, 0, 0);
    };

    /**
     * @method getGroup
     * @returns {SymbolGroup}
     */
    this.getGroup = function getGroup() {
        return _group;
    };

    /**
     * @method getPrizeSymbol
     * @returns {Boolean}
     */
    this.getPrizeSymbol = function getPrizeSymbol() {
        return _prizeSymbol;
    };
    // ----------------------------------------- //

    // ----------------------------------------- //
    //Public timeline functions
    /**
     * Sets the timeline for this symbol and starts it immediately.
     * @method setTimeLine
     * @param timeLine (TimeLine)
     */
    this.setTimeLine = function setTimeLine(timeLine) {
        _timeLine = timeLine;
        _timeLine.start();
    };

    /**
     * Stops the current timeline and removes it from the symbol.
     * @method unsetTimeLine
     */
    this.unsetTimeLine = function unsetTimeLine() {
        _timeLine.stop();
        _timeLine = null;
    };
    // ----------------------------------------- //

    // ----------------------------------------- //
    //Public animation functions
    /**
     * Returns the argument that corresponds with the current skin
     * @method skinSelect
     * @param [...args]
     */
    this.skinSelect = function skinSelect(args) {
        return arguments[pgc.Game.chosenTheme - 1];
    };

    /**
     * Function to perform a pulse animation on parts of the symbol
     * @param config
     *      @param [config.partName] {String} name of the symbol part to animate. This can be "value", "prize", "background", "foil"; or the name of a special element.
     *      @param [config.partReference] {PGCImage} Direct reference to the symbol part to animate.
     *      @param [config.setVisible = true] {Boolean} Sets the "visible" property on the part. Useful for parts that start off as not being drawn at all (e.g. particle effects)
     *      @param [config.firstScale = 1.5] {Number} Scale to shrink or grow to first.
     *      @param [config.lastScale = 1] {Number} Scale to shrink or grow to second.
     *      @param [config.totalTime = 750] {Number} Time to take to go from animation start, to firstScale, to lastScale (milliseconds).
     *      @param [config.firstScaleTime] {Number} Time to take to go from animation start to firstScale (milliseconds).
     *      @param [config.lastScaleTime] {Number} Time to take to go from firstScale to lastScale (milliseconds).
     *      @param [config.afterFirstScale] {Function Function to call after scaling to firstScale. The symbol part is passed as the first argument.
     *      @param [config.afterLastScale] {Function Function to call after scaling to lastScale. The symbol part is passed as the first argument.
     *      @param [config.loop = false] {Boolean} Whether or not to loop the animation.
     * @returns {time: Number, callback: Function} The time this animation will take to complete, and the callback that starts the animation.
     */
    this.pulse = function pulse(config) {
        if(!config.partName && !config.partReference) {
            throw new Error("partName or partReference must be specified in animation functions!");
        }
        if(config.partName && config.partReference && config.partName !== config.partReference.nameVal) {
            throw new Error("Cannot animate parts '" + config.partName + "' and '" + config.partReference.nameVal + "' in the same function call!");
        }

        //Test if the symbol has the part named
        var part = config.partReference ? config.partReference : getPartByName(config.partName);
        if(part === null) {
            //Named part not present, so skip the animation
            return;
        }

        //Check the time setting provided
        if(config.totalTime && config.firstScaleTime && !config.lastScaleTime) {
            config.lastScaleTime = config.totalTime - config.firstScaleTime;
        } else if(config.totalTime && !config.firstScaleTime && config.lastScaleTime) {
            config.firstScaleTime = config.totalTime - config.lastScaleTime;
        } else if(config.totalTime && !config.firstScaleTime && !config.lastScaleTime) {
            config.firstScaleTime = config.totalTime / 2;
            config.lastScaleTime = config.lastScaleTime / 2;
        } else if(!config.totalTime && config.firstScaleTime && config.lastScaleTime) {
            config.totalTime = config.firstScaleTime + config.lastScaleTime;
        } else if(!config.totalTime && !config.firstScaleTime && !config.lastScaleTime) {
            config.totalTime = 750;
            config.firstScaleTime = 375;
            config.lastScaleTime = 375;
        }

        if(config.totalTime && config.firstScaleTime && config.lastScaleTime && (config.totalTime !== config.firstScaleTime + config.lastScaleTime) || config.totalTime < 0 || config.firstScaleTime < 0 || config.lastScaleTime < 0) {
            throw new Error("Ambiguous scaling times provided!");
        }

        config.setVisible = config.setVisible || true;
        config.firstScale = config.firstScale || 1.5;
        config.lastScale = config.lastScale || 1;

        config.loop = config.loop || false;

        var scale1,
            midFunc1,
            scale2,
            midFunc2,
            firstScale = config.firstScale,
            lastScale = config.lastScale,
            firstScaleTime = config.firstScaleTime,
            lastScaleTime = config.lastScaleTime,
            loop = config.loop,
            afterFirstScale = config.afterFirstScale,
            afterLastScale = config.afterLastScale;
        part.visible = config.setVisible;

        //The basic scaling functions structure the loop.
        scale1 = function(){
            if(firstScaleTime === 0) {
                midFunc1();
            } else {
                part.growTo(firstScale, firstScaleTime / 1000, midFunc1);
            }
        };
        scale2 = function(){
            if(lastScaleTime === 0) {
                midFunc2();
            }
            else {
                part.growTo(lastScale, lastScaleTime / 1000, midFunc2);
            }
        };

        //Set up the midFunctions
        if(afterFirstScale) {
            midFunc1 = function() {
                afterFirstScale(part);
                scale2();
            };
        } else {
            midFunc1 = scale2;
        }
        if(afterLastScale) {
            midFunc2 = function() {
                afterLastScale(part);
                if (loop) {
                    part.setScaling(config.firstScale);
                    scale1();
                }
            };
        } else if (loop) {
            midFunc2 = function() {
                part.setScaling(config.firstScale);
                scale1();
            };
        }

        scale1();
    };

    /**
     * Function to modify the background element
     * @param config
     *      @param [config.source] {String|HTMLCanvasElement} The image source
     *      @param [config.sampleX] {Number} The image sample's x coordinate
     *      @param [config.sampleY] {Number} The image sample's y coordinate
     *      @param [config.sampleWidth] {Number} Width of the image sample.
     *      @param [config.sampleHeight] {Number} Height of the image sample.
     */
    this.modifyBackground = function modifyBackground(config) {
        var cfg = pgc.Game.ScratchController.multiplyConfig(config);
        if(cfg.source) {
            _backgroundObj.setImage(ip.getPreloadedImage(cfg.source));
        }
        _backgroundObj.spriteX = cfg.sampleX ? cfg.sampleX : _backgroundObj.spriteX;
        _backgroundObj.spriteY = cfg.sampleY ? cfg.sampleY : _backgroundObj.spriteY;
        _backgroundObj.spriteWidth = cfg.sampleWidth ? cfg.sampleWidth : _backgroundObj.spriteWidth;
        _backgroundObj.spriteHeight = cfg.sampleHeight ? cfg.sampleHeight : _backgroundObj.spriteHeight;
    };

    /**
     * Function to modify the font of the value element
     * @param config {Object} Properties to modify. Leave unset to keep the original values.
     *      @param [config.fontFamily = "arial"] {String} The font family to use
     *      @param [config.fontSize = "10px"] {String} Text size / line height
     *      @param [config.fontStyle = "normal"] {String} normal|italic|oblique
     *      @param [config.fontWeight = "normal"] {String} normal|bold|bolder|lighter|100|200...
     *      @param [config.fontVariant = "normal"] {String} normal|small-caps
     *      @param [config.fillStyle = "black"] {String} Fill colour to apply to the characters
     *      @param [config.strokeStyles = []] {Array} Fill colours to apply to strokes (i.e. text outlines). Listed in drawing order.
     *      @param [config.lineWidths = []] {Array} Stroke widths in pixels. Listed in drawing order.
     *      @param [config.shadowColour = null] {String} Fill colour to apply to text shadow. Null = no shadow.
     *      @param [config.shadowBlur = 0] {Number} Gaussian shadow blur radius in px. Larger numbers = more blur.
     *      @param [config.shadowOffsetX = 0] {Number} Horizontal distance between shadow and characters in px.
     *      @param [config.shadowOffsetY = 0] {Number} Vertical distance between shadow and characters in px.
     * @returns {time: Number, callback: Function} The time this animation will take to complete, and the callback that starts the animation.
     */
    this.modifyValue = function modifyValue(config) {
        var cfg = pgc.Game.ScratchController.multiplyConfig(config);
        //Switch out the image source of the value object
        if(_valueObj !== null) {
            _valueObj.setImage(_group.getValueFactory().modify(cfg).createTextImage(_value));
        }
    };

    /**
     * Function to modify the font of the prize element
     * @param config {Object} Properties to modify. Leave unset to keep the original values.
     *      @param [config.fontFamily = "arial"] {String} The font family to use
     *      @param [config.fontSize = "10px"] {String} Text size / line height
     *      @param [config.fontStyle = "normal"] {String} normal|italic|oblique
     *      @param [config.fontWeight = "normal"] {String} normal|bold|bolder|lighter|100|200...
     *      @param [config.fontVariant = "normal"] {String} normal|small-caps
     *      @param [config.fillStyle = "black"] {String} Fill colour to apply to the characters
     *      @param [config.strokeStyles = []] {Array} Fill colours to apply to strokes (i.e. text outlines). Listed in drawing order.
     *      @param [config.lineWidths = []] {Array} Stroke widths in pixels. Listed in drawing order.
     *      @param [config.shadowColour = null] {String} Fill colour to apply to text shadow. Null = no shadow.
     *      @param [config.shadowBlur = 0] {Number} Gaussian shadow blur radius in px. Larger numbers = more blur.
     *      @param [config.shadowOffsetX = 0] {Number} Horizontal distance between shadow and characters in px.
     *      @param [config.shadowOffsetY = 0] {Number} Vertical distance between shadow and characters in px.
     */
    this.modifyPrize = function modifyPrize(config) {
        //Switch out the image source of the prize object
        if(_prizeObj !== null) {
            var cfg = pgc.Game.ScratchController.multiplyConfig(config),
                factory = _prizeSymbol ? _group.getPrizeSymbolPrizeFactory() : _group.getPrizeFactory();
            _prizeObj.setImage(factory.modify(cfg).createTextImage(_prize));
        }
    };

    /**
     * Helper function. Gets a part of the symbol by name, and, if it's animated, performs the run operation on it.
     * @method animatePart
     * @param config
     *      @param [config.partName] {String} name of the symbol part to animate. This can be "value", "prize", "background", "foil"; or the name of a special element.
     *      @param [config.partReference] {PGCImage} Direct reference to the symbol part to animate.
     *      @param [config.visibleAfter = true] {Boolean} Sets the "visible" property on the part after the animation completes. Useful for parts that disappear after animating (e.g. particles)
     *      @param [config.count = 1] {Number} Number of times to run the animation
     */
    this.animatePart = function animatePart(config) {
        if(!config.partName && !config.partReference) {
            throw new Error("partName or partReference must be specified in animation functions!");
        }
        if(config.partName && config.partReference && config.partName !== config.partReference.nameVal) {
            throw new Error("Cannot animate parts '" + config.partName + "' and '" + config.partReference.nameVal + "' in the same function call!");
        }
        config.count = config.count || 1;
        config.visibleAfter = config.visibleAfter !== false;

        //Test if the symbol has the part named
        var part = config.partReference ? config.partReference : getPartByName(config.partName);
        if(part === null) {
            //Named part not present, so skip the animation
            return;
        }

        part.visible = true;

        if(!part.frames) {
            throw new Error("Trying to animate non-animated symbol part!");
        }

        var visibleAfter = config.visibleAfter,
            count = config.count;
        part.run(function(){
            part.visible = visibleAfter;
            _group.requestDraw();
        }, count, 0);
    };
    // ----------------------------------------- //

    // ----------------------------------------- //
    //Public functions
    /**
     * Adds this symbol's components to the SymbolGroup's scene
     * @method addSelfToScene
     * @returns {Symbol} The Symbol object, so functions can be chained
     */
    this.addSelfToScene = function addSelfToScene() {
        var scene = _group.getScene();
        if(_backgroundObj !== null) {
            scene.addToScene(_backgroundObj, SymbolZIndices.BACKGROUND);
        }
        if(_valueObj !== null) {
            scene.addToScene(_valueObj, SymbolZIndices.VALUE);
        }
        if(_prizeObj !== null) {
            scene.addToScene(_prizeObj, SymbolZIndices.PRIZE);
        }
        if(_specialObjs.length > 0) {
            for(var i = 0; i < _specialObjs.length; i++) {
                scene.addToScene(_specialObjs[i], _specialObjs[i].zIndex);
            }
        }
        if(_foilImage !== null) {
            scene.addToScene(_foilImage, SymbolZIndices.FOIL);
        }
        _group.requestDraw();
        return this;
    };

    /**
     * Removes this symbol's components from the SymbolGroup's scene
     * @method removeSelfFromScene
     * @returns {Symbol} The Symbol object, so functions can be chained
     */
    this.removeSelfFromScene = function removeSelfFromScene() {
        var scene = _group.getScene();
        if(_backgroundObj !== null) {
            scene.removeFromScene(_backgroundObj);
        }
        if(_valueObj !== null) {
            scene.removeFromScene(_valueObj);
        }
        if(_prizeObj !== null) {
            scene.removeFromScene(_prizeObj);
        }
        if(_specialObjs.length > 0) {
            for(var i = 0; i < _specialObjs.length; i++) {
                scene.removeFromScene(_specialObjs[i]);
            }
        }
        if(_foilImage !== null) {
            scene.removeFromScene(_foilImage);
        }
        _group.requestDraw();
        return this;
    };

    /**
     * Draws the brushSprite to the foil and applies the brushRect to the collision mask
     * @method scratch
     * @param brushSprite
     * @param brushRect
     * @param x
     * @param y
     * @returns {Symbol} The Symbol object, so functions can be chained
     */
    this.scratch = function scratch(brushSprite, brushRect, x, y) {
        if(!_scratched) {
            var i;
            if(_foilImage.spriteImage) {
                //We need to apply the brush to every frame
                for(i = 0; i < _foilImage.frames.length; i++) {
                    brushSprite.draw(_foilContext, 0, x - _foilRect.left + _foilImage.frames[i].x, y - _foilRect.top + _foilImage.frames[i].y);
                }
            } else {
                brushSprite.draw(_foilContext, 0, x - _foilRect.left, y - _foilRect.top);
            }
            _scratchMask.collisionRects(brushRect);
            if(_scratchMask.scratched()) {
                this.animateScratch();
            }
            _group.requestDraw();
        }

        return this;
    };

    /**
     * Starts this symbol's scratch animation
     * @method animateScratch
     * @returns {Symbol} The Symbol object, so functions can be chained
     */
    this.animateScratch = function animateScratch() {
        _scratchAnimating = true; //Set this to true when directly using animateScratch(). If this function was called by SymbolGroup, this will already be set. REQUIRED, DO NOT REMOVE

        if(_scratchSprite !== null) {
            //Your run-of-the-mill scratchable symbol
            _scratchSprite.run(function(){
                _scratchMask.setScratched(true);
                _scratchAnimating = false;
            }, 1);
        } else {
            //Doesn't have a scratch sprite, so just set it to scratched.
            _scratchMask.setScratched(true);
            _scratched = true;
        }

        _group.requestDraw();

        return this;
    };

    /**
     * Updates the state of the Symbol, and is called every step by the SymbolGroup. Named "step" to avoid confusion with the PGCScene update function.
     * @method update
     * @param delta
     */
    this.step = function step(delta) {
        var i;

        //Update timeline
        if(_timeLine) {
            _timeLine.step(delta);
        }

        //Check if the symbol is scratched
        if(!_scratched && !_scratchAnimating && _scratchMask.scratched()) {
            //Set the _scratched flag so we don't end up back in here next tick
            _scratched = true;

            //Run the unCrop function on all sprites. Items that aren't cropped will just pass through.
            _valueObj = unCrop(_valueObj);
            _prizeObj = unCrop(_prizeObj);
            for(i = 0; i < _specialObjs.length; i++) {
                _specialObjs[i] = unCrop(_specialObjs[i]);
            }

            //Trigger the scratched animation for this symbol
            _group.triggerAnimation({
                trigger:    pgc.ScratchAnimationTriggers.SCRATCHED,
                symbols:    [_that]
            });

            pgc.Game.UserData.setGameSpecificData(_group.getScene().id, _group.save()); //Save the game state to userdata

            //Tell the symbolgroup to re-render itself this tick.
            _group.requestDraw();
        }

        //Draw the scratch sprite if required
        ////Note that this gets drawn to the foil, so we need to take the gutter into account when setting its position.
        if(_scratchSprite !== null && _scratchSprite.runFrameAnimation) {
            var xDiff = ((_foilImage.spriteImage ? _foilImage.spriteWidth : _foilImage.width) - _scratchSprite.spriteWidth) / 2,
                yDiff = ((_foilImage.spriteImage ? _foilImage.spriteHeight : _foilImage.height) - _scratchSprite.spriteHeight) / 2;
            if(_foilImage.frames) {
                //We need to apply the brush to every frame
                for(i = 0; i < _foilImage.frames.length; i++) {
                    _scratchSprite.draw(_foilContext, delta, _foilImage.frames[i].x + xDiff, _foilImage.frames[i].y + yDiff, false);
                }
            } else {
                _scratchSprite.draw(_foilContext, delta, xDiff, yDiff, false);
            }
            _group.requestDraw();
        }
    };

    /**
     * Takes a callback function and applies it to every sprite in this symbol. Useful for animating whole symbols.
     * @method forEachSprite
     * @param func {Function}
     * @returns {Symbol} The Symbol object, so functions can be chained
     */
    this.forEachSprite = function forEachSprite(func) {
        var objList = [_backgroundObj, _valueObj, _prizeObj, _foilImage, _scratchSprite].concat(_specialObjs),
            i;
        for(i = 0; i < objList.length; i++) {
            if(objList[i] && objList[i] !== null) {
                func(objList[i]);
            }
        }
        _group.requestDraw();
    };

    /**
     * Custom toString function - returns a string containing the symbol coordinates, value string and prize string.
     * @method toString
     * @returns {string}
     */
    this.toString = function symbolToString() {
        var symbols = _group.getSymbols();
        return "Symbol " + symbols.indexOf(_that) + " of " + symbols.length + " at (" + _x + ", " + _y + ") - value: " + _value + " prize: " + _prize + " - " + (_scratched ? "scratched" : "unscratched");
    };
    // ----------------------------------------- //

    // ----------------------------------------- //
    //Initialisation
    var initialise = function initialise() {
        if(config.width) {
            _width = config.width;
        } else if(config.backgroundObj) {
            _width = config.backgroundObj.spriteWidth;
        } else if(_foilImage) {
            _width = _foilImage.width;
        } else {
            throw new Error("unable to establish symbol width! Symbols must have a background or foil image to establish their width!");
        }

        if(config.height) {
            _height = config.height;
        } else if(config.backgroundObj) {
            _height = config.backgroundObj.spriteHeight;
        } else if(_foilImage) {
            _height = _foilImage.height;
        } else {
            throw new Error("unable to establish symbol width! Symbols must have a background or foil image to establish their width!");
        }


        if(!_foilImage) {
            _scratched = true;
        }

        if(config.scratchBBox) {
            _that.setScratchBBox(
                config.scratchBBox.offsetX,
                config.scratchBBox.offsetY,
                config.scratchBBox.w,
                config.scratchBBox.h
            );
        } else {
            _that.setScratchBBox(
                -_width / 2,
                -_height / 2,
                _width,
                _height
            );
        }

        //If the cropToFoil flag is set for any parts, replace said parts with a cropped version.
        if(_valueObj && _valueObj.cropToFoil) {
            _valueObj = cropToFoil(_valueObj);
        }
        if(_prizeObj && _prizeObj.cropToFoil) {
            _prizeObj = cropToFoil(_prizeObj);
        }
        for(i = 0; i <_specialObjs.length; i++) {
            if(_specialObjs[i].cropToFoil) {
                _specialObjs[i] = cropToFoil(_specialObjs[i]);
            }
        }
        _scratchMask = new ScratchMask(_scratchBBox);
        _foilRect = config.foilImage ? new PGCRect(_x - (_foilImage.width / 2), _y - (_foilImage.height / 2), _x + (_foilImage.width / 2), _y + (_foilImage.height / 2)) : null;
    };
    initialise();
};