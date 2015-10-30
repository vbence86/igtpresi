/**
 * Describes a canvas that contains several scratchable Symbols
 * Properties / Roles:
 *  - Symbol positions
 *  - Maintaining the foil including effects (e.g. animation)
 * @author Bob Moir on 15/06/2015.
 * @class SymbolGroup
 * @param config
 *      @param config.container {HTMLElement} Reference to the DOM element that contains the group's canvas.
 *      @param [config.width] {Number} Width of the group's canvas in px.
 *      @param [config.height] {Number} Height of the group's canvas in px.
 *      @param [config.fitMode = pgc.CanvasFitModes.SCALE] {Number}
 *      @param [config.gutter = 0] {Number} If this value > 0, the group's canvas will extend past the bounds of its container by this number of px on all sides, while remaining centred on the container. This is useful when effects (e.g. particles) overlap the edges of the container.
 *      @param [config.unifiedScaling = false] {Boolean} Setting this to true will compare the scaling of the value and prize sprites on all symbols and apply the smallest of each setting to all sprites of that type (i.e. if maxWidth is applied to values and this flag is set, all value sprites will have the smallest scaling factor)
 *      @param [config.disableScratch = false] {Boolean} Set this to true to disable scratch effects.
 *      @param [config.disableInput = false] {Boolean} Set this to true to disable all input to the group.
 *      @param [config.fillEmpty = false] {Boolean} Set this to true to create symbols even when no input value/prize pair is provided.
 */
SymbolGroup = function(config) {
    // ----------------------------------------- //
    //Private properties and settings
    var _texMult = pgc.Game.ScratchController.getTextureMultiplier(),
        _symbols = [],                                                  //The array of the Symbol objects contained in this SymbolGroup.
        _positions,                                                     //Array of available position "slots" that are used to place the Symbols in the group.
        _drawRequired = [true, true],                                   //If either boolean is true, the SymbolGroup will redraw itself next frame, and set the first array element that is true to false. If both are false, it skips drawing.
        _scene,                                                         //The PGCScene object that draws the group.
        _allScratched = false,                                          //Flag - true once all symbols in the group are scratched
        _fitMode = config.fitMode || pgc.CanvasFitModes.SCALE,          //Method used to fit the canvas to the container
        _unifiedScaling = config.unifiedScaling === true,               //Setting flag - set to true to compare the scaling of the value and prize sprites on all symbols and apply the smallest of each setting to all sprites of that type.
        _disableScratch = config.disableScratch === true,               //Setting flag - set this to true to disable scratch effects for this group.
        _disableInput = config.disableInput === true,                   //Setting flag - set this to true to disable all input settings for this group.
        _fillEmpty = config.fillEmpty === true;                         //Setting flag - set this to true to force creation of symbols even when there are no settings

    //Group Dimensions
    var _that = this,
        _container = config.container,                                  //Reference to the HTML element that contains this group.
        _width = (config.width || 100) * _texMult,                      //Width of the container (px).
        _height = (config.height || 100) * _texMult,                    //Height of the container (px).
        _gutter = (config.gutter || 0) * _texMult,                      //Size of the margin around the container that determines the scene canvas size. Allows for drawing of effects that go outwith the bounds of the container.
        _gutterDoubled,                                                 //The gutter size * 2. The canvas will be (_width + _gutterDoubled) X (_height + _gutterDoubled).
        _gutterDoubledScaled;                                           //The gutter size * 2 after being scaled to the ratio of _width:container width.

    //Animations
    var _currentSymbolAnimations = [],                                  //Array of animations that have been triggered this step. 1 animation can be triggered per symbol per step.
        _currentGroupAnimation = null,                                  //An animation that applies to the SymbolGroup as a whole. Only 1 group animation can be triggered per step, and it is stored in this variable.
        _timeLine,                                                      //Stores the active TimeLine during group level animation sequences.
        _groupSprites = [],                                             //Array of group-level animation sprites.
        _maxAnimationDuration = 500;                                    //Stores the length in ms of the longest animation sequence in this SymbolGroup. Used to determine the delay between GAMEOVER triggering and entering the Summary state.

    //Group title(s)
    var _titleFactories = [],                                           //The CanvasText objects that draw the group's titles.
        _titleConfigs = [],                                             //The configuration Objects that create the titleFactories.
        _titles = [];                                                   //The group's title text images.

    //Symbol Config
    var _backgroundConfigs = [],                                        //The configuration Objects that create the backgrounds of each Symbol.
        _backgroundIndex = 0;                                           //Keeps track of which background config to apply to the next symbol.

    var _specialConfigs = [],                                           //Array of additional animated PGCSprites or PGCImages that apply to each Symbol.
        _specialValues = [];                                            //Array of String names for the special objects on this symbol.

    var _animationConfigs = [];                                         //Array of configuration Objects for the symbol animations that are triggered by the ScratchController.

    var _valueFactory,                                                  //The CanvasText Object that creates the Symbols' value text.
        _valueConfig,                                                   //The configuration Object that creates the valueFactory.
        _valueOffsetX,                                                  //X-position of the value object on the Symbol relative to its centre (px)
        _valueOffsetY;                                                  //Y-Position of the value object on the Symbol relative to its centre (px)

    var _prizeFactory,                                                  //The CanvasText Object that creates the Symbols' prize text.
        _prizeConfig,                                                   //The configuration Object that creates the valueFactory.
        _prizeOffsetX,                                                  //X-position of the prize object on the Symbol relative to its centre (px)
        _prizeOffsetY;                                                  //Y-Position of the prize object on the Symbol relative to its centre (px)

    var _prizeSymbolPrizeFactory,                                       //The CanvasText Object that creates the Prize Symbols' prize text.
        _prizeSymbolConfig,                                             //The configuration object that creates the prize symbols' prize factory, foil (if unique) and scratch sprite (if unique).
        _prizeSymbolPrizeOffsetX,                                       //X-position of the Prize Symbols' prize object on the Symbol relative to its centre (px)
        _prizeSymbolPrizeOffsetY;                                       //Y-Position of the Prize Symbols' prize object on the Symbol relative to its centre (px)

    var _foilConfigs = [],                                              //Array of configuration Objects that create the foil images for the symbols. Multiple configs result in a round-robin assignment of configs to foils
        _foilIndex = 0,                                                 //Keeps track of which foil config to apply to the next symbol.
        _foilAnim;                                                      //Reference to the animation sequence to overlay the foils with - usually this is a "shine" effect. This will only appear over the unscratched portion of the foils.

    var _scratchSpriteConfigs = [],                                     //The animation sequences used to auto-scratch Symbols. This is a sillouette animation that gradually covers the foil over the course of its sequence. Each frame deletes the covered area of the foil.
        _scratchSpriteIndex = 0;                                        //Keeps track of which scratch sprite to apply to the next symbol.

    var _customScratchAreas = [],                                       //Bounding box(relative to each Symbol's centre) that determines the area of the Symbol's collision box.
        _symbolTouchBBox;                                               //Bounding box(relative to each Symbol's centre) that detemines the area of the Symbol to apply touch/mouse Events to. Defaults to the symbol dimensions.

    //Symbol Skins
    var _skinConfigs = [];                                              //Array of configuration objects that containg the differences between the default skin and other skins.
                                                                        ////When a skin is applied any setting in this object for the current skin will overwrite the corresponding setting in the defaults.
    // ----------------------------------------- //

    // ----------------------------------------- //
    //Private functions
    /**
     * Wrapper on ip.getPreloadedImage(). If the input is a string, checks the image preloader and returns the result. If it isn't, returns the input unchanged.
     * @method getPreloadedImage
     * @param image {HTMLImageElement|HTMLCanvasElement|ImageBitmap|String} Image name or reference
     */
    var getPreloadedImage = function getPreloadedImage(image) {
        if(typeof image === "string") {
            return ip.getPreloadedImage(image);
        }
        else return image;
    };

    /**
     * Modifies a default object with the property values in a modification object.
     * @method configOR
     * @param def {Object} The default object
     * @param mod {Object} The modification object
     * @returns {Object} The combined mod||def object.
     */
    var configOR = function configOR(def, mod) {
        var keys = Object.keys(def),
            ret = {};
        for(var i = 0; i < keys.length; i++) {
            ret[keys[i]] = (typeof mod[keys[i]] !== "undefined" ? mod[keys[i]] : def[keys[i]]);
        }
        return ret;
    };

    /**
     * Refreshes the current title graphics with a new one based on the current _titleConfigs
     * @method applyTitleConfigs
     * @private
     */
    var applyTitleConfigs = function applyTitleConfigs() {
        var i, z, titlesClone = [];

        //Clone the titles array so it can be cleared safely while its components are removed from the scene.
        for(i = 0; i < _titles.length; i++) {
            titlesClone.push(_titles[i]);
        }
        _titles = [];

        for(i = 0; i < _titleConfigs.length; i++) {
            _scene.removeFromScene(titlesClone[i]);

            if(_titleFactories[i]) {
                _titleFactories[i].modify(_titleConfigs[i]);
            } else {
                _titleConfigs[i].location = _container;
                _titleFactories[i] = new CanvasText(_titleConfigs[i]);
            }

            _titles[i] = new PGCImage(_titleFactories[i].createTextImage(_titleConfigs[i].string));
            _titles[i].x = _titleConfigs[i].offsetX || 0;
            _titles[i].y = _titleConfigs[i].offsetY || 0;
            _titles[i].anchor = _titleConfigs[i].anchor || PGCAnchors.TOP_LEFT;

            _titles[i].x += _gutter;
            _titles[i].y += _gutter;
            _scene.addToScene(_titles[i], _titleConfigs[i].zIndex);
        }
    };

    /**
     * Modifies the default symbol settings using the appropriate skinConfig. Called internally by setSymbols
     * @method applyCurrentSkin
     * @private
     */
    var applyCurrentSkin = function applyCurrentSkin() {
        if(_skinConfigs.length <= 1) {
            //Only the default skin exists
            return;
        }

        var skin = _skinConfigs[pgc.Game.chosenTheme - 1], //chosenTheme is 1-indexed
            def = _skinConfigs[0],
            i, j, temp, skinSpecial;

        //replace the current config values. Use the defaults if there is nothing in the skin config
        if(skin.title) {
            //First set the main title config
            _titleConfigs = [configOR(def.title[0], skin.title[0])];
            //Then set any alts
            for(i = 1; i < skin.title.length; i++) {
                temp = configOR(def.title[0], skin.title[0]);
                _titleConfigs.push(temp);
            }
            applyTitleConfigs();
        }

        if(skin.background) {
            //First set the main background config
            _backgroundConfigs = [configOR(def.background[0], skin.background[0])];
            //Then set any alts
            for(i = 1; i < skin.background.length; i++) {
                temp = configOR(def.background[i], skin.background[i]);
                _backgroundConfigs.push(temp);
            }
        }
        if(skin.value) {
            _valueConfig = configOR(def.value, skin.value);
            if(_valueFactory) {
                _valueFactory.modify(_valueConfig);
            } else {
                _valueConfig.location = _container;
                _valueFactory = new CanvasText(_valueConfig);
            }
        }
        if(skin.prize) {
            _prizeConfig = configOR(def.prize, skin.prize);
            if(_prizeFactory) {
                _prizeFactory.modify(_prizeConfig);
            } else {
                _prizeConfig.location = _container;
                _prizeFactory = new CanvasText(_prizeConfig);
            }
        }
        if(skin.foil) {
            //First set the main foil config
            _foilConfigs = [configOR(def.foil[0], skin.foil[0])];
            //Then set any alts
            for(i = 1; i < skin.foil.length; i++) {
                temp = configOR(def.foil[i], skin.foil[i]);
                _foilConfigs.push(temp);
            }
        }
        if(skin.foilAnim) {
            _foilAnim = skin.foilAnim;
            _foilAnim.setGlobalCompositeOperation("source-in");
        }
        if(skin.scratchSprite) {
            //First set the main scratch sprite config
            _scratchSpriteConfigs = [configOR(def.scratchSprite[0], skin.scratchSprite[0])];
            //Then set any alts
            for(i = 1; i < skin.scratchSprite.length; i++) {
                temp = configOR(def.scratchSprite[i], skin.scratchSprite[i]);
                _scratchSpriteConfigs.push(temp);
            }
        }
        if(skin.prizeSymbol) {
            if(skin.prizeSymbol.prize) {
                _prizeSymbolConfig.prize = configOR(def.prizeSymbol.prize, skin.prizeSymbol.prize);
            }
            if(skin.prizeSymbol.foil) {
                _prizeSymbolConfig.foil = configOR(def.prizeSymbol.foil, skin.prizeSymbol.foil);
            }
            if(skin.prizeSymbol.scratchSprite) {
                _prizeSymbolConfig.scratchSprite = configOR(def.prizeSymbol.scratchSprite, skin.prizeSymbol.scratchSprite);
            }
        }

        if(skin.specials) {
            //Clear the specials
            _specialConfigs = [];
            _specialValues = [];

            //Cycle through the specials by nameVal and modify as appropriate
            temp = [];
            for(i = 0; i < def.specials.length; i++) {
                skinSpecial = false;
                for(j = 0; j < skin.specials.length; j++) {
                    if(def.specials[i].nameVal === skin.specials[j].nameVal) {
                        skinSpecial = true;
                        break;
                    }
                }
                if(skinSpecial) {
                    temp = configOR(def.specials[j], skin.specials[i]);
                } else {
                    temp = def.specials[i];
                }
                _specialConfigs.push(temp);
                if(temp.values) {
                    _specialValues.push(temp.values);
                } else {
                    _specialValues.push(null);
                }
            }
        }
    };

    /**
     * Creates a symbol using the current settings. Called internally by setSymbols
     * @method createSymbol
     * @param x {Number} X-coordinate of the symbol in the SymbolGroup
     * @param y {Number} Y-coordinate of the symbol in the SymbolGroup
     * @param prize {String} Symbol prize amount
     * @param value {String} Symbol value string
     * @param [isPrizeSymbol = false] {Boolean} Setting this flag applies the prizeSymbolConfig instead of the standard config
     * @returns {Symbol}
     * @private
     */
    var createSymbol = function createSymbol(x, y, prize, value, isPrizeSymbol) {
        var i, j;

        //Make sure the prize and value are cast to strings. They often arrive as numbers.
        if(value) {
            value = String(value);
        }
        if(prize) {
            prize = String(prize);
        }

        var backgroundObj,      //PGCImage that is the symbol's background image
            valueObj,           //PGCImage that is the symbol's value
            prizeObj,           //PGCImage that is the symbol's prize
            foilImage,          //PGCImage that is the symbol's foil
            foilCanvas,         //symbol's foil canvas element
            foilContext,        //2d context of the foil's canvas element
            scratchSprite,      //PGCImage that is the symbol's scratching sprite
            specialObjs = [],   //Array of special items to display
            animations = [],    //Array of animations to include in this symbol
            temp;

        //Create the background element
        if(_backgroundConfigs.length > 0) {
            if(_backgroundConfigs[_backgroundIndex].frames) {
                //Animated
                backgroundObj = new PGCSprite(
                    getPreloadedImage(_backgroundConfigs[_backgroundIndex].source), x, y,
                    _backgroundConfigs[_backgroundIndex].sampleX ,
                    _backgroundConfigs[_backgroundIndex].sampleY,
                    _backgroundConfigs[_backgroundIndex].sampleWidth,
                    _backgroundConfigs[_backgroundIndex].sampleHeight
                );
                backgroundObj.setFrames(_backgroundConfigs[_backgroundIndex].frames, _backgroundConfigs[_backgroundIndex].frameRate);
            } else {
                //Not animated
                backgroundObj = new PGCImage(
                    getPreloadedImage(_backgroundConfigs[_backgroundIndex].source), x, y,
                    _backgroundConfigs[_backgroundIndex].sampleX,
                    _backgroundConfigs[_backgroundIndex].sampleY,
                    _backgroundConfigs[_backgroundIndex].sampleWidth,
                    _backgroundConfigs[_backgroundIndex].sampleHeight
                );
            }
            _backgroundIndex++;
            _backgroundIndex %= _backgroundConfigs.length;

            if(_backgroundConfigs[_backgroundIndex].startingScale) {
                backgroundObj.setScaling(_backgroundConfigs[_backgroundIndex].startingScale);
            }
            backgroundObj.anchor = PGCAnchors.CENTRE;
        }

        if(isPrizeSymbol) {
            if(_prizeSymbolPrizeFactory && prize) { //This should always be true
                prizeObj = new PGCImage(_prizeSymbolPrizeFactory.createTextImage(prize), x + _prizeSymbolPrizeOffsetX, y + _prizeSymbolPrizeOffsetY);
                prizeObj.anchor = PGCAnchors.CENTRE;
                if(_prizeSymbolConfig.prize.maxWidth && (prizeObj.width > _prizeSymbolConfig.prize.maxWidth)) {
                    prizeObj.setScaling(_prizeSymbolConfig.prize.maxWidth / prizeObj.width);
                }
            } else {
                throw new Error("Attempt to create prize symbol without specifying prize value!");
            }
        } else {
            //Create the valueObj element (if any)
            if(_valueFactory && value) {
                //config is a CanvasText object. valueObj should be a text image of the value string
                valueObj = new PGCImage(_valueFactory.createTextImage(value), x + _valueOffsetX, y + _valueOffsetY);
                valueObj.anchor = PGCAnchors.CENTRE;
                if(_valueConfig.maxWidth && (valueObj.width > _valueConfig.maxWidth)) {
                    valueObj.setScaling(_valueConfig.maxWidth / valueObj.width);
                }
            }

            //Create the prizeObj element (if any)
            if(_prizeFactory && prize) {
                prizeObj = new PGCImage(_prizeFactory.createTextImage(prize), x + _prizeOffsetX, y + _prizeOffsetY);
                prizeObj.anchor = PGCAnchors.CENTRE;
                if(_prizeConfig.maxWidth && (prizeObj.width > _prizeConfig.maxWidth)) {
                    prizeObj.setScaling(_prizeConfig.maxWidth / prizeObj.width);
                }
            }
        }

        //Check for special configs
        if(_specialConfigs.length > 0) {
            //Check if the value matches the trigger value
            for (i = 0; i < _specialValues.length; i++) {
                if (_specialValues[i] === null || _specialValues[i].indexOf(value) > -1) {
                    //Copy the special Sprite to the symbol
                    if(_specialConfigs[i].strings) {
                        //Text sprite, so generate from the CanvasText object
                        temp = null; //reset temp so we know if no new PGCImage was created
                        for(j = 0; j < _specialConfigs[i].strings.length; j++) {
                            if(!_specialConfigs[i].strings[j].value || _specialConfigs[i].strings[j].value === value) {
                                //Generate the text sprite and apply offsets
                                temp = new PGCImage(_specialConfigs[i].createTextImage(_specialConfigs[i].strings[j].string),
                                    x + _specialConfigs[i].offsetX,
                                    y + _specialConfigs[i].offsetY
                                );
                                break;
                            }
                        }
                        //If the object wasn't created (i.e. no corresponding string is found), skip to next iteration
                        if(!temp) {
                            continue;
                        }
                    } else if(_specialConfigs[i].frames) {
                        //Animated, so make a PGCSprite
                        temp = new PGCSprite(getPreloadedImage(_specialConfigs[i].source),
                            x + _specialConfigs[i].offsetX,
                            y + _specialConfigs[i].offsetY,
                            _specialConfigs[i].sampleX,
                            _specialConfigs[i].sampleY,
                            _specialConfigs[i].sampleWidth,
                            _specialConfigs[i].sampleHeight);
                        temp.setFrames(_specialConfigs[i].frames, _specialConfigs[i].frameRate);
                    } else {
                        //Not animated, so make a simple PGCImage
                        temp = new PGCImage(getPreloadedImage(_specialConfigs[i].source),
                            x + _specialConfigs[i].offsetX,
                            y + _specialConfigs[i].offsetY,
                            _specialConfigs[i].sampleX,
                            _specialConfigs[i].sampleY,
                            _specialConfigs[i].sampleWidth,
                            _specialConfigs[i].sampleHeight);
                    }
                    temp.setScaling(_specialConfigs[i].startingScale);
                    temp.anchor = PGCAnchors.CENTRE;

                    //Append additional properties to the object so we have them at the symbol level TODO: Use a less hacky structure if/when we switch to Canvas API objects
                    temp.zIndex = _specialConfigs[i].zIndex;
                    temp.nameVal = _specialConfigs[i].nameVal;
                    temp.visible = _specialConfigs[i].visible;
                    temp.cropToFoil = _specialConfigs[i].cropToFoil;

                    specialObjs.push(temp);

                    //Hide the valueObj and prizeObj if necessary
                    if(valueObj && _specialConfigs[i].hideValue) {
                        valueObj.visible = false;
                    }
                    if(prizeObj && _specialConfigs[i].hidePrize) {
                        prizeObj.visible = false;
                    }
                }
            }
        }

        //Create the foil images
        if(isPrizeSymbol && _prizeSymbolConfig.foil) {
            ////We need to copy the foil source image to a canvas so it can be scratched
            foilCanvas = document.createElement("canvas");
            foilContext= foilCanvas.getContext("2d");
            foilCanvas.width = _prizeSymbolConfig.foil.sampleWidth;
            foilCanvas.height = _prizeSymbolConfig.foil.sampleHeight;
            foilContext.clearRect(0, 0, foilCanvas.width, foilCanvas.height);
            foilContext.drawImage(getPreloadedImage(_prizeSymbolConfig.foil.source),
                _prizeSymbolConfig.foil.sampleX,
                _prizeSymbolConfig.foil.sampleY,
                _prizeSymbolConfig.foil.sampleWidth,
                _prizeSymbolConfig.foil.sampleHeight,
                0, 0, foilCanvas.width, foilCanvas.height);
        } else if(_foilConfigs.length > 0) {
            ////We need to copy the foil source image to a canvas so it can be scratched
            foilCanvas = document.createElement("canvas");
            foilContext= foilCanvas.getContext("2d");
            foilCanvas.width = _foilConfigs[_foilIndex].sampleWidth;
            foilCanvas.height = _foilConfigs[_foilIndex].sampleHeight;
            foilContext.clearRect(0, 0, foilCanvas.width, foilCanvas.height);
            foilContext.drawImage(getPreloadedImage(_foilConfigs[_foilIndex].source),
                _foilConfigs[_foilIndex].sampleX,
                _foilConfigs[_foilIndex].sampleY,
                _foilConfigs[_foilIndex].sampleWidth,
                _foilConfigs[_foilIndex].sampleHeight,
                0, 0, foilCanvas.width, foilCanvas.height);
            _foilIndex++;
            _foilIndex %= _foilConfigs.length;
        }
        if(_foilConfigs[_foilIndex] && _foilConfigs[_foilIndex].frames) {
            foilImage = new PGCSprite(foilCanvas, x, y);
            foilImage.setFrames(_foilConfigs[_foilIndex].frames, _foilConfigs[_foilIndex].frameRate);
        } else {
            foilImage = new PGCImage(foilCanvas, x, y);
        }

        foilImage.opacity = _foilConfigs.foilOpacity;
        foilImage.anchor = PGCAnchors.CENTRE;

        //Create the scratch sprite
        ////Note that the scratch sprite is not centre anchored and has coordinates of 0, 0. This is beacause it is "drawn" directly to the source image of the foil object(which is a canvas element),
        ////And the foil image's coordinates do not correspond to world coordinates.
        if(isPrizeSymbol && _prizeSymbolConfig.scratchSprite) {
            scratchSprite = new PGCSprite(getPreloadedImage(_prizeSymbolConfig.scratchSprite.source), 0, 0,
                _prizeSymbolConfig.scratchSprite.sampleX,
                _prizeSymbolConfig.scratchSprite.sampleY,
                _prizeSymbolConfig.scratchSprite.sampleWidth,
                _prizeSymbolConfig.scratchSprite.sampleHeight);
            scratchSprite.setFrames(_prizeSymbolConfig.scratchSprite.frames, _prizeSymbolConfig.scratchSprite.frameRate);
            scratchSprite.globalCompositeOperation = "destination-out";
        } else if(_scratchSpriteConfigs.length > 0) {
            scratchSprite = new PGCSprite(getPreloadedImage(_scratchSpriteConfigs[_scratchSpriteIndex].source), 0, 0,
                _scratchSpriteConfigs[_scratchSpriteIndex].sampleX,
                _scratchSpriteConfigs[_scratchSpriteIndex].sampleY,
                _scratchSpriteConfigs[_scratchSpriteIndex].sampleWidth,
                _scratchSpriteConfigs[_scratchSpriteIndex].sampleHeight);
            scratchSprite.setFrames(_scratchSpriteConfigs[_scratchSpriteIndex].frames, _scratchSpriteConfigs[_scratchSpriteIndex].frameRate);
            scratchSprite.globalCompositeOperation = "destination-out";
            _scratchSpriteIndex++;
            _scratchSpriteIndex %= _scratchSpriteConfigs.length;
        }

        //Set the bounding box of each symbol's scratch detection area
        var sBBox;
        ////Check if there's a custom scratch area to apply to this symbol
        if(_customScratchAreas.length > 0) {
            for(i = 0; i < _customScratchAreas.length; i++) {
                if(!_customScratchAreas[i].values || _customScratchAreas[i].values.indexOf(value) > -1) {
                    //Apply the custom bbox
                    sBBox = _customScratchAreas[i];
                }
            }
        }
        if(!sBBox && _foilConfigs.length > 0) {
            var ww, hh, scratchArea;

            if (isPrizeSymbol && _prizeSymbolConfig.foil && _prizeSymbolConfig.foil.scratchArea) {
                scratchArea = _prizeSymbolConfig.foil.scratchArea;
            } else if (_foilConfigs[_foilIndex].scratchArea) {
                scratchArea = _foilConfigs[_foilIndex].scratchArea;
            }

            if (scratchArea) {
                switch (_foilConfigs[_foilIndex].scratchArea) {
                    case "Value":
                    case "value":
                        ww = valueObj.spriteImage ? valueObj.spriteWidth : valueObj.width;
                        hh = valueObj.spriteImage ? valueObj.spriteHeight : valueObj.height;
                        break;
                    case "Prize":
                    case "prize":
                        ww = prizeObj.spriteImage ? prizeObj.spriteWidth : prizeObj.width;
                        hh = prizeObj.spriteImage ? prizeObj.spriteHeight : prizeObj.height;
                        break;
                    default:
                        //If no name is given, use the foil as the scratch area
                        ww = foilCanvas.width;
                        hh = foilCanvas.height;
                }
                sBBox = {offsetX: -_valueOffsetX - (ww / 2), offsetY: _valueOffsetY - (hh / 2), w: ww, h: hh};
            }
        }

        //Create the symbol.
        var symbol = new Symbol({
            group: _that,
            x: x,
            y: y,
            backgroundObj: backgroundObj,
            value: value,
            valueObj: valueObj,
            prize: prize,
            prizeObj: prizeObj,
            specialObjs: specialObjs,
            foilImage: foilImage,
            foilContext: foilContext,
            scratchSprite: scratchSprite,
            scratchBBox: sBBox,
            texMult: _texMult,
            prizeSymbol: isPrizeSymbol
        });

        //Set the symbol's custom bounding box (if any)
        if(_symbolTouchBBox) {
            symbol.setTouchBBox(_symbolTouchBBox.offsetX, _symbolTouchBBox.offsetY, _symbolTouchBBox.w, _symbolTouchBBox.h);
        }

        return symbol;
    };

    /**
     * Checks that the main area of the scene canvas (not including the gutter) is the same width and height as its container element. Resizes the canvas as necessary.
     * @method fitToContainer
     */
    var fitToContainer = function fitToContainer() {
        var contWidth, contHeight, canWidth, canHeight;
        switch(_fitMode) {
            case pgc.CanvasFitModes.SCALE:
                contWidth = parseInt(getComputedStyle(_container).width, 10);
                contHeight = parseInt(getComputedStyle(_container).height, 10);
                canWidth = parseInt(_scene.canvas.style.width, 10) - _gutterDoubledScaled;
                canHeight = parseInt(_scene.canvas.style.height, 10) - _gutterDoubledScaled;

                if(canWidth !== contWidth || canHeight !== contHeight) {
                    _gutterDoubledScaled = (parseInt(getComputedStyle(_container).width, 10) / _width) * _gutterDoubled;
                    _scene.canvas.style.width = (contWidth + _gutterDoubledScaled) + "px";
                    _scene.canvas.style.height = (contHeight + _gutterDoubledScaled) + "px";
                    _scene.canvas.style.marginLeft = -(_gutterDoubledScaled / 2) + "px";
                    _scene.canvas.style.marginTop = -(_gutterDoubledScaled / 2) + "px";
                    _scene.context.clearRect(0, 0, 1, 1);
                }
                break;
            case pgc.CanvasFitModes.RESIZE:
                contWidth = parseInt(getComputedStyle(_container).width, 10);
                contHeight = parseInt(getComputedStyle(_container).height, 10);
                canWidth = _scene.canvas.width - _gutterDoubled;
                canHeight = _scene.canvas.height - _gutterDoubled;
                if(canWidth !== contWidth || canHeight !== contHeight) {
                    _scene.canvas.width = contWidth + _gutterDoubled;
                    _scene.canvas.height = contHeight + _gutterDoubled;
                    _scene.canvas.style.marginLeft = -_gutter + "px";
                    _scene.canvas.style.marginTop = -_gutter + "px";
                }
                _that.requestDraw();
                break;
            default:
                //no-op
        }
    };
    // ----------------------------------------- //

    // ----------------------------------------- //
    //Public get/set functions
    /**
     * @method getDisableScratch
     * @returns {Boolean}
     */
    this.getDisableScratch = function getDisableScratch() {
        return _disableScratch === true;
    };

    /**
     * Enables/disables scratch effects.
     * @method setDisableScratch
     */
    this.setDisableScratch = function setDisableScratch(disableScratch) {
        _disableScratch = disableScratch === true;
    };

    /**
     * @method getDisableInput
     * @returns {Boolean}
     */
    this.getDisableInput = function getDisableInput() {
        return _disableInput === true;
    };

    /**
     * Enables/disables response to mouse/touch events.
     * @method setDisableInput
     */
    this.setDisableInput = function setDisableInput(disableInput) {
        _disableInput = disableInput === true;
    };

    /**
     * @method getWidth
     * @returns {number}
     */
    this.getWidth = function getWidth() {
        return _scene.canvas.width / _texMult;
    };

    /**
     * @method getHeight
     * @returns {number}
     */
    this.getHeight = function getHeight() {
        return _scene.canvas.height / _texMult;
    };

    /**
     * Sets the configuration for the title of the scene
     * @method setTitleConfig
     * @param config {Object} A text definition object
     *      @param [config.nameVal = "default"] {String} Unique identifier for this title element
     *      @param [config.string] {String} Title string to display
     *      @param [config.offsetX = 0] {Number} Horizontal position of the prize text relative to the centre of the symbol.
     *      @param [config.offsetY = 0] {Number} Vertical position of the prize text relative to the centre of the symbol.
     *      @param [config.anchor = PGCAnchors.TOP_LEFT] {Number} Origin point of the title sprite
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
     * @returns {SymbolGroup} This SymbolGroup object, so functions can be chained.
     */
    this.setTitleConfig = function setTitleConfig(config) {
        var cfg = pgc.Game.ScratchController.multiplyConfig(config);
        cfg.offsetX = cfg.offsetX || 0;
        cfg.offsetY = cfg.offsetY || 0;
        cfg.zIndex = cfg.zIndex || SymbolZIndices.BACKGROUND + 1;
        cfg.nameVal = cfg.nameVal || "default";

        _titleConfigs = [cfg];

        //Reset the helper variables
        _titleFactories = [];
        applyTitleConfigs();

        _drawRequired = [true, true];
        return this;
    };

    /**
     * Sets the title string on a title image sprite.
     * @param config
     *      @param [config.nameVal = "default"] {String} The name of the title sprite to change.
     *      @param config.string {String} The text to replaces the current title text with.
     */
    this.setTitleString = function setTitleString(config) {
        if(typeof config.string !== "string") {
            throw new Error("Call to setTitleString without providing a new string");
        }

        var nameVal = config.nameVal || "default";
        for(var i = 0; i < _titleConfigs.length; i++) {
            if(_titleConfigs[i].nameVal === nameVal) {
                _titleConfigs[i].string = config.string;
                break;
            }
        }

        applyTitleConfigs();

        _drawRequired = [true, true];
        return this;
    };

    /**
     * Sets the PGCImage object to be used to draw the background of each symbol. This is basically a "stamp" used to draw the same image to the scratch scene multiple times.
     * @method setBackgroundConfig
     * @param config {Object}
     *      @param [config.source] {String|HTMLCanvasElement} The image source
     *      @param [config.sampleX] {Number} The image sample's x coordinate
     *      @param [config.sampleY] {Number} The image sample's y coordinate
     *      @param [config.sampleWidth] {Number} Width of the image sample.
     *      @param [config.sampleHeight] {Number} Height of the image sample.
     *      @param [config.frames] {Array} Frame data array with items in the format: [{x: {Number}, y: {Number}, [w: {Number}], [h: {Number}]},...]
     *      @param [config.frameRate = 100] {Number} Frame rate.
     *      @param [config.startingScale] {Number} Scaling factor to apply on creation.
     * @returns {SymbolGroup} The SymbolGroup object, so functions can be chained.
     */
    this.setBackgroundConfig = function setBackgroundConfig(config) {
        _backgroundConfigs = [pgc.Game.ScratchController.multiplyConfig(config)];
        return this;
    };

    /**
     * Configures the "Value" object of a symbol, i.e. the number behind the foil that the user matches with the other symbols.
     * @method setValueConfig
     * @param config {Object} A text definition object
     *      @param [config.offsetX = 0] {Number} Horizontal position of the prize text relative to the centre of the symbol.
     *      @param [config.offsetY = 0] {Number} Vertical position of the prize text relative to the centre of the symbol.
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
     *      @param [config.maxWidth] {Number} Set a maximum width that the value object can have while the symbol is unscratched. The object will scale down to this size if required.
     * @returns {SymbolGroup} The SymbolGroup object, so functions can be chained.
     */
    this.setValueConfig = function setValueConfig(config) {
        _valueConfig = pgc.Game.ScratchController.multiplyConfig(config);

        _valueOffsetX = _valueConfig.offsetX || 0;
        _valueOffsetY = _valueConfig.offsetY || 0;

        if(_valueFactory) {
            _valueFactory.modify(_valueConfig);
        } else {
            _valueConfig.location = _container;
            _valueFactory = new CanvasText(_valueConfig);
        }
        return this;
    };

    /**
     * @method getValueConfig
     * @returns {Object}
     */
    this.getValueConfig = function getValueConfig() {
        var ret = {
            offsetX:                _valueConfig.offsetX ? _valueConfig.offsetX / _texMult : undefined,
            offsetY:                _valueConfig.offsetY ? _valueConfig.offsetY / _texMult : undefined,
            fontFamily:             _valueConfig.fontFamily,
            fontSize:               _valueConfig.fontSize ? (parseFloat(_valueConfig.fontSize) / _texMult) + _valueConfig.fontSize.match(/[^\d\.]*$/)[0] : undefined,
            fontStyle:              _valueConfig.fontStyle,
            fontWeight:             _valueConfig.fontWeight,
            fontVariant:            _valueConfig.fontVariant,
            fillStyle:              _valueConfig.fillStyle,
            shadowColour:           _valueConfig.shadowColour,
            shadowBlur:             _valueConfig.shadowBlur,
            shadowOffsetX:          _valueConfig.shadowOffsetX ? _valueConfig.shadowOffsetX / _texMult : undefined,
            shadowOffsetY:          _valueConfig.shadowOffsetY ? _valueConfig.shadowOffsetY / _texMult : undefined
        };

        //Now copy the Object variables and add them to the clone
        var ss = [],
            lw = [];
        for(var i = 0; i < _valueConfig.strokeStyles.length; i++) {
            ss.push(_valueConfig.strokeStyles[i]);
            lw.push((parseFloat(_valueConfig.lineWidths[i]) / _texMult) + String(_valueConfig.lineWidths[i]).match(/[^\d\.]*$/)[0]);
        }
        ret.strokeStyles = ss;
        ret.lineWidths = lw;
        return ret;
    };

    /**
     * @method getValueFactory
     * @returns {CanvasText}
     */
    this.getValueFactory = function getValueFactory() {
        return _valueFactory.clone();
    };

    /**
     * Configures the "Prize" of a symbol, i.e. the cash amount written on a symbol that the user wins if there is a match.
     * @method setPrizeConfig
     * @param config {Object}
     *      @param [config.offsetX = 0] {Number} Horizontal position of the prize text relative to the centre of the symbol.
     *      @param [config.offsetY = 0] {Number} Vertical position of the prize text relative to the centre of the symbol.
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
     *      @param [config.maxWidth] {Number} Set a maximum width that the prize object can have while the symbol is unscratched. The object will scale down to this size if required.
     * @returns {SymbolGroup} The SymbolGroup object, so functions can be chained.
     */
    this.setPrizeConfig = function setPrizeConfig(config) {
        _prizeConfig = pgc.Game.ScratchController.multiplyConfig(config);
        _prizeOffsetX = _prizeConfig.offsetX || 0;
        _prizeOffsetY = _prizeConfig.offsetY || 0;

        if(_prizeFactory) {
            _prizeFactory.modify(_prizeConfig);
        } else {
            _prizeConfig.location = _container;
            _prizeFactory = new CanvasText(_prizeConfig);
        }
        return this;
    };

    /**
     * @method getPrizeConfig
     * @returns {Object}
     */
    this.getPrizeConfig = function getPrizeConfig() {
        var ret = {
            offsetX:                _prizeConfig.offsetX ? _prizeConfig.offsetX / _texMult : undefined,
            offsetY:                _prizeConfig.offsetY ? _prizeConfig.offsetY / _texMult : undefined,
            fontFamily:             _prizeConfig.fontFamily,
            fontSize:               _prizeConfig.fontSize ? (parseFloat(_prizeConfig.fontSize) / _texMult) + _prizeConfig.fontSize.match(/[^\d\.]*$/)[0] : undefined,
            fontStyle:              _prizeConfig.fontStyle,
            fontWeight:             _prizeConfig.fontWeight,
            fontVariant:            _prizeConfig.fontVariant,
            fillStyle:              _prizeConfig.fillStyle,
            shadowColour:           _prizeConfig.shadowColour,
            shadowBlur:             _prizeConfig.shadowBlur,
            shadowOffsetX:          _prizeConfig.shadowOffsetX ? _prizeConfig.shadowOffsetX / _texMult : undefined,
            shadowOffsetY:          _prizeConfig.shadowOffsetY ? _prizeConfig.shadowOffsetY / _texMult : undefined
        };

        //Now copy the Object variables and add them to the clone
        var ss = [],
            lw = [];
        for(var i = 0; i < _prizeConfig.strokeStyles.length; i++) {
            ss.push(_prizeConfig.strokeStyles[i]);
            lw.push((parseFloat(_prizeConfig.lineWidths[i]) / _texMult) + String(_prizeConfig.lineWidths[i]).match(/[^\d\.]*$/)[0]);
        }
        ret.strokeStyles = ss;
        ret.lineWidths = lw;
        return ret;
    };

    /**
     * @method getPrizeFactory
     * @returns {CanvasText}
     */
    this.getPrizeFactory = function getPrizeFactory() {
        return _prizeFactory.clone();
    };

    /**
     * @method getPrizeSymbolPrizeFactory
     * @returns {CanvasText}
     */
    this.getPrizeSymbolPrizeFactory = function getPrizeSymbolPrizeFactory() {
        return _prizeSymbolPrizeFactory.clone();
    };

    /**
     * Configures special "prize symbols" to add to the game. The prize symbols are special scratchable symbols that display the prize for getting a winning combination.
     * NOTE: Prize symbols all have the reserved value of "PRIZE_SYMBOL". This is what you use to apply special sprites and text.
     * @method setPrizeSymbolConfig
     * @param config
     *      @param [config.prize]
     *           @param [config.prize.offsetX = 0] {Number} Horizontal position of the prize text relative to the centre of the symbol.
     *           @param [config.prize.offsetY = 0] {Number} Vertical position of the prize text relative to the centre of the symbol.
     *           @param [config.prize.fontFamily = "arial"] {String} The font family to use
     *           @param [config.prize.fontSize = "10px"] {String} Text size / line height
     *           @param [config.prize.fontStyle = "normal"] {String} normal|italic|oblique
     *           @param [config.prize.fontWeight = "normal"] {String} normal|bold|bolder|lighter|100|200...
     *           @param [config.prize.fontVariant = "normal"] {String} normal|small-caps
     *           @param [config.prize.fillStyle = "black"] {String} Fill colour to apply to the characters
     *           @param [config.prize.strokeStyles = []] {Array} Fill colours to apply to strokes (i.e. text outlines). Listed in drawing order.
     *           @param [config.prize.lineWidths = []] {Array} Stroke widths in pixels. Listed in drawing order.
     *           @param [config.prize.shadowColour = null] {String} Fill colour to apply to text shadow. Null = no shadow.
     *           @param [config.prize.shadowBlur = 0] {Number} Gaussian shadow blur radius in px. Larger numbers = more blur.
     *           @param [config.prize.shadowOffsetX = 0] {Number} Horizontal distance between shadow and characters in px.
     *           @param [config.prize.shadowOffsetY = 0] {Number} Vertical distance between shadow and characters in px.
     *           @param [config.prize.maxWidth] {Number} Set a maximum width that the prize object can have while the symbol is unscratched. The object will scale down to this size if required.
     *      @param [config.foil]
     *           @param [config.foil.source] {String|HTMLCanvasElement} The image source
     *           @param [config.foil.sampleX] {Number} The image sample's x coordinate
     *           @param [config.foil.sampleY] {Number} The image sample's y coordinate
     *           @param [config.foil.sampleWidth] {Number} Width of the image sample.
     *           @param [config.foil.sampleHeight] {Number} Height of the image sample.
     *           @param [config.foil.frames] {Array} Frame data array with items in the format: [{x: {Number}, y: {Number}, [w: {Number}], [h: {Number}]},...]
     *           @param [config.foil.frameRate = 100] {Number} Frame rate.
     *           @param [config.foil.scratchArea] {String} Defines what must be uncovered before the symbol counts as being scratched. Can be set to "Value", "Prize" or "Foil"(default)
     *           @param [config.foil.foilOpacity = 1.0] {Number} Special foil opacity - allows partially transparent foil that does not reveal the values beneath.
     *      @param [config.scratchSprite]
     *           @param [config.scratchSprite.source] {String|HTMLCanvasElement} The image source
     *           @param [config.scratchSprite.sampleX] {Number} The image sample's x coordinate
     *           @param [config.scratchSprite.sampleY] {Number} The image sample's y coordinate
     *           @param [config.scratchSprite.sampleWidth] {Number} Width of the image sample.
     *           @param [config.scratchSprite.sampleHeight] {Number} Height of the image sample.
     *           @param [config.scratchSprite.frames] {Array} Frame data array with items in the format: [{x: {Number}, y: {Number}, [w: {Number}], [h: {Number}]},...]
     *           @param [config.scratchSprite.frameRate = 100] {Number} Frame rate.
     * @returns {SymbolGroup} The SymbolGroup object, so functions can be chained.
     */
    this.setPrizeSymbolConfig = function setPrizeSymbolConfig(config) {
        _prizeSymbolConfig = {};
        //Prize text config
        if(config.prize) {
            _prizeSymbolConfig.prize = pgc.Game.ScratchController.multiplyConfig(config.prize);
            _prizeSymbolPrizeOffsetX = _prizeSymbolConfig.prize.offsetX || 0;
            _prizeSymbolPrizeOffsetY = _prizeSymbolConfig.prize.offsetY || 0;

            if(_prizeSymbolPrizeFactory) {
                _prizeSymbolPrizeFactory.modify(_prizeSymbolConfig.prize);
            } else {
                _prizeSymbolConfig.location = _container;
                _prizeSymbolPrizeFactory = new CanvasText(_prizeSymbolConfig.prize);
            }
        }

        //Foil config
        if(config.foil) {
            _prizeSymbolConfig.foil = pgc.Game.ScratchController.multiplyConfig(config.foil);
        }

        //Scratch sprite config
        if(config.scratchSprite) {
            _prizeSymbolConfig.scratchSprite = pgc.Game.ScratchController.multiplyConfig(config.scratchSprite);
        }
        return this;
    };

    /**
     * Configures the default "Foil" of a symbol, i.e. the image that is drawn over the symbol content which is scratched off by the player.
     * @method setFoilConfig
     * @param config {Object} An image/sprite config object.
     *      @param [config.source] {String|HTMLCanvasElement} The image source
     *      @param [config.sampleX] {Number} The image sample's x coordinate
     *      @param [config.sampleY] {Number} The image sample's y coordinate
     *      @param [config.sampleWidth] {Number} Width of the image sample.
     *      @param [config.sampleHeight] {Number} Height of the image sample.
     *      @param [config.frames] {Array} Frame data array with items in the format: [{x: {Number}, y: {Number}, [w: {Number}], [h: {Number}]},...]
     *      @param [config.frameRate = 100] {Number} Frame rate.
     *      @param [config.scratchArea] {String} Defines what must be uncovered before the symbol counts as being scratched. Can be set to "Value", "Prize" or "Foil"(default)
     *      @param [config.foilOpacity = 1.0] {Number} Special foil opacity - allows partially transparent foil that does not reveal the values beneath.
     * @returns {SymbolGroup} The SymbolGroup object, so functions can be chained.
     */
    this.setFoilConfig = function setFoilConfig(config) {
        _foilConfigs = [];
        _foilConfigs[0] = pgc.Game.ScratchController.multiplyConfig(config);
        return this;
    };

    /**
     * Configures the default PGCSprite object to be used to auto-erase the foil from a symbol. This is drawn to the foil using the "destination-out" composite operation, essentially erasing the silouette of this sprite from the foil.
     * @method setScratchSpriteConfig
     * @param config {Object} The config to create the PGCSprite
     *      @param [config.source] {String|HTMLCanvasElement} The image source
     *      @param [config.sampleX] {Number} The image sample's x coordinate
     *      @param [config.sampleY] {Number} The image sample's y coordinate
     *      @param [config.sampleWidth] {Number} Width of the image sample.
     *      @param [config.sampleHeight] {Number} Height of the image sample.
     *      @param [config.frames] {Array} Frame data array with items in the format: [{x: {Number}, y: {Number}, [w: {Number}], [h: {Number}]},...]
     *      @param [config.frameRate = 100] {Number} Frame rate.
     * @returns {SymbolGroup} The SymbolGroup object, so functions can be chained.
     */
    this.setScratchSpriteConfig = function setScratchSpriteConfig(config) {
        _scratchSpriteConfigs = [];
        _scratchSpriteConfigs[0] = pgc.Game.ScratchController.multiplyConfig(config);
        return this;
    };

    /**
     * @method setSymbolTouchBBox
     * @param [config]
     *      @param [config.offsetX] {Number} horizontal distance from the centre point for the top left corner of the bounding box
     *      @param [config.offsetY] {Number} vertical distance from the centre point for the top left corner of the bounding box
     *      @param [config.w] {Number} width
     *      @param [config.h] {Number} height
     * @returns {Symbol} The Symbol object, so functions can be chained
     */
    this.setSymbolTouchBBox = function setSymbolTouchBBox(config) {
        _symbolTouchBBox = pgc.Game.ScratchController.multiplyConfig(config);
    };

    /**
     * Adds an animation to apply to the foil
     * @method setFoilAnimation
     * @param {PGCSprite} [animation]
     * @returns {SymbolGroup} This SymbolGroup object, so functions can be chained.
     */
    this.setFoilAnimation = function setFoilAnimation(animation) {
        _foilAnim = animation;
        if(_foilAnim) {
            _foilAnim.setGlobalCompositeOperation("source-in"); //The foil animation only draws to the unscratched foil pixels
        }
        return this;
    };

    /**
     * Returns the number of symbols this group has places for.
     * @method getGroupSize
     * @returns {Number}
     */
    this.getGroupSize = function getGroupSize() {
        return _positions.length;
    };

    /**
     * Returns all the symbols in the SymbolGroup, or a subset of them.
     * @method getSymbols
     * @param [subset] {Object} Subset of the symbols. Leave empty to return all the symbols in the group.
     * @param   [subset.start] {Number} Starting index for the symbol subset you want
     * @param   [subset.length] {Number} Length of the symbol subset you want
     * @returns {Array} The Symbol instances currently in the SymbolGroup
     */
    this.getSymbols = function getSymbols(subset) {
        var ret = [],
            start = subset && subset.start ? subset.start : 0,
            length = subset && subset.length ? subset.length : _symbols.length;
        for(var i = start; i < start + length; i++) {
            ret.push(_symbols[i]);
        }
        return ret;
    };

    /**
     * Removes all existing symbols from the scene and the SymbolGroup.
     * @method clearSymbols
     * @returns {SymbolGroup} This SymbolGroup object, so functions can be chained.
     */
    this.clearSymbols = function clearSymbols() {
        for(var i = 0; i < _symbols.length; i++) {
            _symbols[i].removeSelfFromScene();
        }
        _symbols = [];
        _currentSymbolAnimations = [];
        _allScratched = false;
        return this;
    };

    /**
     * Creates the symbols for the symbolGroup from the provided configuration object and adds them to the scene.
     * @method setSymbols
     * @param [symbolSettings = [...{value: undefined, prize: undefined}]] {Array} The server response configured in the format [{value: String, prize: String}]
     * @param [startingIndex = 0] {Number} The symbol index to apply to the first symbol in this group.
     * @returns {Number} The number of symbols created
     */
    this.setSymbols = function setSymbols(symbolSettings, startingIndex) {
        //Check for force-filling of symbols
        if(_fillEmpty && symbolSettings.length < _positions.length) {
            //Fill remaining positions in the group with undefined settings
            for(i = symbolSettings.length; i < _positions.length; i++) {
                symbolSettings.push({value: undefined, prize: undefined});
            }
        }

        startingIndex = startingIndex || 0;

        var settingIndex, positionIndex, newSymbol, newSymbolAmount = 0;

        //Set the skin
        applyCurrentSkin();

        //Add the new symbols
        positionIndex = startingIndex;
        for(settingIndex = 0; settingIndex < symbolSettings.length; settingIndex++) {
            if(!symbolSettings[settingIndex]) {
                //Missing a symbol setting. Default to an empty symbol
                symbolSettings[settingIndex] = {value: undefined, prize: undefined};
            }

            //First check to see if we need to make a prize symbol
            if(_positions[positionIndex].isPrizeSymbol) {
                ////Prize symbols have special configuration settings, and take their prize string from the last symbol that was created. They always have a value of "PRIZE_SYMBOL".
                if(!symbolSettings[settingIndex - 1]) {
                    throw new Error("Attempted to create a prizeSymbol before creating a normal symbol!"); //Note that you can never make two prize symbols in a row
                }
                newSymbol = createSymbol(_positions[positionIndex].x, _positions[positionIndex].y, symbolSettings[settingIndex - 1].prize, "PRIZE_SYMBOL", true);
                newSymbolAmount++;
                if(_symbols[positionIndex]) {
                    _symbols[positionIndex].removeSelfFromScene();
                }
                _symbols[positionIndex] = newSymbol;
                _currentSymbolAnimations.push(null);
                newSymbol.addSelfToScene(_scene);
                positionIndex++;
            }

            //Check for multi-symbols and prize symbols
            if(symbolSettings[settingIndex].value && String(symbolSettings[settingIndex].value).indexOf(pgc.ScratchConstants.MULTI_SYMBOL_DELIMITER) > 0) {
                ////multi-symbols are identified by a value string that has two or more strings separated by colons (e.g. "5:2", "56:7:23", etc.).
                ////These should be split up into a seperate symbol for each value given in the colon-separated list. All have the same prize.
                var values = symbolSettings[settingIndex].value.split(pgc.ScratchConstants.MULTI_SYMBOL_DELIMITER),
                    multiSymbolIndex;
                for(multiSymbolIndex = 0; multiSymbolIndex < values.length; multiSymbolIndex++) {
                    newSymbol = createSymbol(_positions[positionIndex].x, _positions[positionIndex].y, symbolSettings[settingIndex].prize, values[multiSymbolIndex]);
                    newSymbolAmount++;
                    if(_symbols[positionIndex]) {
                        _symbols[positionIndex].removeSelfFromScene();
                    }
                    _symbols[positionIndex] = newSymbol;
                    _currentSymbolAnimations.push(null);
                    newSymbol.addSelfToScene(_scene);
                    positionIndex++;
                }
            } else {
                ////Normal symbol
                newSymbol = createSymbol(_positions[positionIndex].x, _positions[positionIndex].y, symbolSettings[settingIndex].prize, symbolSettings[settingIndex].value);
                newSymbolAmount++;
                if(_symbols[positionIndex]) {
                    _symbols[positionIndex].removeSelfFromScene();
                }
                _symbols[positionIndex] = newSymbol;
                _currentSymbolAnimations.push(null);
                newSymbol.addSelfToScene(_scene);
                positionIndex++;
            }
        }

        //Finally check to see if there is another prizeSymbol after the final set above
        if(_positions[positionIndex] && _positions[positionIndex].isPrizeSymbol) {
            ////Prize symbols have special configuration settings, and take their prize string from the last symbol that was created. They always have a value of "PRIZE_SYMBOL".
            if(!symbolSettings[settingIndex - 1]) {
                throw new Error("Attempted to create a prizeSymbol before creating a normal symbol!"); //Note that you can never make two prize symbols in a row
            }
            newSymbol = createSymbol(_positions[positionIndex].x, _positions[positionIndex].y, symbolSettings[settingIndex - 1].prize, "PRIZE_SYMBOL", true);
            newSymbolAmount++;
            if(_symbols[positionIndex]) {
                _symbols[positionIndex].removeSelfFromScene();
            }
            _symbols[positionIndex] = newSymbol;
            _currentSymbolAnimations.push(null);
            newSymbol.addSelfToScene(_scene);
        }

        if(_unifiedScaling) {
            //Apply the smallest value and prize scaling factors across all symbols, to every symbol.
            ////First get the smallest scaling factors for value and prize
            var valueSmallest = Infinity,
                valueScale,
                prizeSmallest = Infinity,
                prizeScale,
                i;
            for (i = 0; i < _symbols.length; i++) {
                if (_valueConfig) {
                    valueScale = _symbols[i].getValueObj().scalingFactor;
                    valueSmallest = valueScale < valueSmallest ? valueScale : valueSmallest;
                }
                if (_prizeConfig) {
                    prizeScale = _symbols[i].getPrizeObj().scalingFactor;
                    prizeSmallest = prizeScale < prizeSmallest ? prizeScale : prizeSmallest;
                }
            }
            ////Then apply the value across all symbols
            for (i = 0; i < _symbols.length; i++) {
                if(_valueConfig) {
                    _symbols[i].getValueObj().setScaling(valueSmallest);
                }
                if(_prizeConfig) {
                    _symbols[i].getPrizeObj().setScaling(prizeSmallest);
                }
            }
        }
        _drawRequired = [true, true];
        return newSymbolAmount;
    };

    /**
     * Sets the "pool" of symbol positions. When a new set of symbols is generated, they will be added to the scene at these coordinates.
     * @method setSymbolPositions
     * @param positions {Array} An array of objects indicating the symbol positions and types
     *      @param positions.x {Number} X-Coordinate in the group canvas.
     *      @param positions.y {Number} Y-Coordinate in the group canvas.
     *      @param [positions.isPrizeSymbol = false] {Boolean} Indicates that this symbol is a prize object
     * @returns {SymbolGroup} This SymbolGroup object, so functions can be chained.
     */
    this.setSymbolPositions = function setSymbolPositions(positions) {
        _positions = [];
        for(var i = 0; i < positions.length; i++) {
            _positions.push({
                x: (positions[i].x * _texMult) + _gutter,
                y: (positions[i].y * _texMult) + _gutter,
                isPrizeSymbol: positions[i].isPrizeSymbol === true
            });
        }
        return this;
    };

    /**
     * @method getScene
     * @returns {PGCScene}
     */
    this.getScene = function getScene() {
        return _scene;
    };

    /**
     * @method getMaxAnimationDuration
     * @returns {number}
     */
    this.getMaxAnimationDuration = function getMaxAnimationDuration() {
        return _maxAnimationDuration;
    };

    /**
     * Given a name, returns the group sprite with that name.
     * @method getGroupSprite
     * @param nameVal {String}
     * @returns {PGCImage}
     */
    this.getGroupSpriteByName = function getGroupSpriteByName(nameVal) {
        for(var i = 0; i < _groupSprites.length; i++) {
            if(_groupSprites[i].nameVal === nameVal) {
                return _groupSprites[i];
            }
        }
        throw new Error("Group sprite: '" + nameVal + "' does not exist!");
    };

    /**
     * Allows the user to set a custom scratch area on all symbols in the group.
     * @method setScratchArea
     * @param config
     *      @param config.offsetX {Number} horizontal distance from the centre point to the top left corner of the bounding box
     *      @param config.offsetY {Number} vertical distance from the centre point to the top left corner of the bounding box
     *      @param config.w {Number} width
     *      @param config.h {Number} height
     */
    this.setScratchArea = function setScratchArea(config) {
        if(!config.offsetX || !config.offsetY || !config.w || !config.h) {
            throw new Error("Missing config on custom scratch area!");
        }
        //Replace the list of custom scratch bboxes with this one.
        _customScratchAreas = [config];
        return this;
    };
    // ----------------------------------------- //

    // ----------------------------------------- //
    //Public timeline functions
    /**
     * Sets the timeline for this SymbolGroup and starts it immediately.
     * @method setTimeLine
     * @param timeLine (TimeLine)
     */
    this.setTimeLine = function setTimeLine(timeLine) {
        _timeLine = timeLine;
        _timeLine.start();
    };

    /**
     * Stops the current timeline and removes it from the SymbolGroup.
     * @method unsetTimeLine
     */
    this.unsetTimeLine = function unsetTimeLine() {
        _timeLine.stop();
        _timeLine = null;
    };
    // ----------------------------------------- //

    // ----------------------------------------- //
    //Public "add" functions - Used to apply additional settings and components to symbols in the same game.
    /**
     * Adds an additional background config to the SymbolGroup. The SymbolGroup will cycle through the available background configurations as it creates new symbols.
     * The default settings(backgroundConfigs[0]) will be used where no config value has been provided.
     * @method addBackgroundConfig
     * @param config
     *      @param [config.source] {String|HTMLCanvasElement} The image source
     *      @param [config.sampleX] {Number} The image sample's x coordinate
     *      @param [config.sampleY] {Number} The image sample's y coordinate
     *      @param [config.sampleWidth] {Number} Width of the image sample.
     *      @param [config.sampleHeight] {Number} Height of the image sample.
     *      @param [config.frames] {Array} Frame data array with items in the format: [{x: {Number}, y: {Number}, [w: {Number}], [h: {Number}]},...]
     *      @param [config.frameRate] {Number} Frame rate.
     *  @returns {SymbolGroup} This SymbolGroup object, so functions can be chained.
     */
    this.addBackgroundConfig = function addBackgroundConfig(config) {
        //Supply defaults where required
        var cfg = pgc.Game.ScratchController.multiplyConfig(config);
        cfg = cfg || {};
        cfg.source = cfg.source || _backgroundConfigs[0].source;
        cfg.sampleX = cfg.sampleX || _backgroundConfigs[0].sampleX;
        cfg.sampleY = cfg.sampleY || _backgroundConfigs[0].sampleY;
        cfg.sampleWidth = cfg.sampleWidth || _backgroundConfigs[0].sampleWidth;
        cfg.sampleHeight = cfg.sampleHeight || _backgroundConfigs[0].sampleHeight;
        cfg.frames = cfg.frames || _backgroundConfigs[0].frames;
        cfg.frameRate = cfg.frameRate || _backgroundConfigs[0].frameRate;
        cfg.startingScale = cfg.startingScale || _backgroundConfigs[0].startingScale;

        //Add the config list
        _backgroundConfigs.push(cfg);

        return this;
    };

    /**
     * Adds an additional foil config to the SymbolGroup. The SymbolGroup will cycle through the available foil configurations as it creates new symbols.
     * The default settings(foilConfigs[0]) will be used where no config value has been provided.
     * @method addFoilConfig
     * @param config
     *      @param [config.source] {String|HTMLCanvasElement} The image source
     *      @param [config.sampleX] {Number} The image sample's x coordinate
     *      @param [config.sampleY] {Number} The image sample's y coordinate
     *      @param [config.sampleWidth] {Number} Width of the image sample.
     *      @param [config.sampleHeight] {Number} Height of the image sample.
     *      @param [config.frames] {Array} Frame data array with items in the format: [{x: {Number}, y: {Number}, [w: {Number}], [h: {Number}]},...]
     *      @param [config.frameRate] {Number} Frame rate.
     *      @param [config.scratchArea] {String} Defines what must be uncovered before the symbol counts as being scratched. Can be set to "Value", "Prize" or "Foil"(default)
     *      @param [config.foilOpacity] {Number} Special foil opacity - allows partially transparent foil that does not reveal the values beneath.
     *  @returns {SymbolGroup} This SymbolGroup object, so functions can be chained.
     */
    this.addFoilConfig = function addFoilConfig(config) {
        //Supply defaults where required
        var cfg = pgc.Game.ScratchController.multiplyConfig(config);
        cfg = cfg || {};
        cfg.source = cfg.source || _foilConfigs[0].source;
        cfg.sampleX = cfg.sampleX || _foilConfigs[0].sampleX;
        cfg.sampleY = cfg.sampleY || _foilConfigs[0].sampleY;
        cfg.sampleWidth = cfg.sampleWidth || _foilConfigs[0].sampleWidth;
        cfg.sampleHeight = cfg.sampleHeight || _foilConfigs[0].sampleHeight;
        cfg.frames = cfg.frames || _foilConfigs[0].frames;
        cfg.frameRate = cfg.frameRate || _foilConfigs[0].frameRate;
        cfg.scratchArea = cfg.scratchArea || _foilConfigs[0].scratchArea;
        cfg.foilOpacity = cfg.foilOpacity || _foilConfigs[0].foilOpacity;

        //Add the config list
        _foilConfigs.push(cfg);

        return this;
    };

    /**
     * Adds an additional scratch sprite config to the SymbolGroup. The SymbolGroup will cycle through the available scratch sprite configurations as it creates new symbols.
     * The default settings(scratchSpriteConfigs[0]) will be used where no config value has been provided.
     * @method addScratchSpriteConfig
     * @param config
     *      @param [config.source] {String|HTMLCanvasElement} The image source
     *      @param [config.sampleX] {Number} The image sample's x coordinate
     *      @param [config.sampleY] {Number} The image sample's y coordinate
     *      @param [config.sampleWidth] {Number} Width of the image sample.
     *      @param [config.sampleHeight] {Number} Height of the image sample.
     *      @param [config.frames] {Array} Frame data array with items in the format: [{x: {Number}, y: {Number}, [w: {Number}], [h: {Number}]},...]
     *      @param [config.frameRate] {Number} Frame rate.
     *  @returns {SymbolGroup} This SymbolGroup object, so functions can be chained.
     */
    this.addScratchSpriteConfig = function addScratchSpriteConfig(config) {
        //Supply defaults where required
        var cfg = pgc.Game.ScratchController.multiplyConfig(config);
        cfg = cfg || {};
        cfg.source = cfg.source || _scratchSpriteConfigs[0].source;
        cfg.sampleX = cfg.sampleX || _scratchSpriteConfigs[0].sampleX;
        cfg.sampleY = cfg.sampleY || _scratchSpriteConfigs[0].sampleY;
        cfg.sampleWidth = cfg.sampleWidth || _scratchSpriteConfigs[0].sampleWidth;
        cfg.sampleHeight = cfg.sampleHeight || _scratchSpriteConfigs[0].sampleHeight;
        cfg.frames = cfg.frames || _scratchSpriteConfigs[0].frames;
        cfg.frameRate = cfg.frameRate || _scratchSpriteConfigs[0].frameRate;

        //Add the config list
        _scratchSpriteConfigs.push(cfg);

        return this;
    };

    /**
     * Adds an extra sprite to symbols, to use in animations or in place of a value and/or prize. The sprite can be added to all symbols or just symbols with a specific value range.
     * @method addSpecialConfig
     * @param config
     *      @param [config.values] {Array} Array of symbol value strings that will trigger adding this sprite to the symbol. If config.values is undefined, show the sprite on default symbols.
     *      @param [config.nameVal = "default"] {String} Name of this component. Useful for animations
     *      @param [config.hideValue = false] If true, hides the value text sprite on symbols that show this sprite.
     *      @param [config.hidePrize = false] If true, hides the prize text sprite on symbols that show this sprite.
     *      @param [config.source] {String|HTMLCanvasElement} The image source
     *      @param [config.offsetX = 0] {Number} Horizontal position of the sprite relative to the centre of the symbol.
     *      @param [config.offsetY = 0] {Number} Vertical position of the sprite relative to the centre of the symbol.
     *      @param [config.startingScale = 1] {Number} Scaling factor to apply to the sprite at creation.
     *      @param [config.sampleX = 0] {Number} The image sample's x coordinate
     *      @param [config.sampleY = 0] {Number} The image sample's y coordinate
     *      @param [config.sampleWidth] {Number} Width of the image sample.
     *      @param [config.sampleHeight] {Number} Height of the image sample.
     *      @param [config.frames] {Array} Frame data array with items in the format: [{x: {Number}, y: {Number}, [w: {Number}], [h: {Number}]},...]
     *      @param [config.frameRate = 100] {Number} Frame rate.
     *      @param [config.visible = true] {Boolean} Starting visibility.
     *      @param [config.zIndex = SymbolZIndices.SPRITE] {Number} Z-Index of the sprite on the symbol
     *      @param [config.cropToFoil = false] {Boolean} Set true to crop this image to the limits of the foil while the symbol remains unscratched. Useful for images that stick out from under the foil.
     * @returns {SymbolGroup} This SymbolGroup object, so functions can be chained.
     */
    this.addSpecialConfig = function addSpecialConfig(config) {
        config = config || {};
        var cfg = pgc.Game.ScratchController.multiplyConfig(config);
        cfg.nameVal = cfg.nameVal || "default";
        cfg.hideValue = cfg.hideValue || false;
        cfg.hidePrize = cfg.hidePrize || false;
        cfg.visible = cfg.visible !== false;
        cfg.zIndex = cfg.zIndex || SymbolZIndices.SPRITE;
        cfg.startingScale = cfg.startingScale || 1;
        cfg.offsetX = cfg.offsetX || 0;
        cfg.offsetY = cfg.offsetY || 0;


        //Error check - make sure the special has a unique name
        for(var i = 0; i < _specialConfigs.length; i++) {
            if(_specialConfigs[i].nameVal === cfg.nameVal) {
                throw new Error("Special config nameVal: '" + cfg.nameVal + "' is not unique! All specials must have a unique name.");
            }
        }

        if(cfg.values) {
            _specialValues.push(cfg.values);
        } else {
            _specialValues.push(null);
        }
        _specialConfigs.push(cfg);

        return this;
    };

    /**
     * Adds extra text to each symbol that can be used in animations or in place of a value number and/or prize. Different strings can be applied depending on the value or prize.
     * @method addSpecialTextConfig
     * @param config {Object} A text definition object
     *      @param [config.values] {Array} Array of symbol value strings that will trigger adding this text sprite to the symbol. If config.values is undefined, show the sprite on default symbols.
     *      @param config.nameVal {String} Name of this component. Useful for animations
     *      @param [config.hideValue = false] If true, hides the value text sprite on symbols that show this sprite.
     *      @param [config.hidePrize = false] If true, hides the prize text sprite on symbols that show this sprite.
     *      @param [...config.strings] {Object} Config object detailing the strings that can be displayed by this symbol.
     *            @param [config.strings.value] {String} Value that triggers the object to have the specific string.
     *            @param [config.strings.string] {String} String to display when the symbol has the corresponding value and/or prize.
     *      @param [config.offsetX = 0] {Number} Horizontal position of the text centre relative to the centre of the symbol.
     *      @param [config.offsetY = 0] {Number} Vertical position of the text centre relative to the centre of the symbol.
     *      @param [config.startingScale = 1] {Number} Scaling factor to apply to the image at creation.
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
     *      @param [config.maxWidth] {Number} Set a maximum width that the text sprite can have while the symbol is unscratched. The object will scale down to this size if required.
     *      @param [config.visible = true] {Boolean} Starting visibility.
     *      @param [config.zIndex = SymbolZIndices.SPRITE] {Number} Z-Index of the sprite on the symbol
     * @returns {SymbolGroup} The SymbolGroup object, so functions can be chained.
     */
    this.addSpecialTextConfig = function addSpecialTextConfig(config) {
        //Create the text factory and append the additional parameters to it
        config.location = _container;
        var cfg = new CanvasText(pgc.Game.ScratchController.multiplyConfig(config));
        cfg.values = config.values;
        cfg.nameVal = config.nameVal;
        cfg.hideValue = config.hideValue || false;
        cfg.hidePrize = config.hidePrize || false;
        cfg.visible = config.visible !== false;
        cfg.zIndex = config.zIndex || SymbolZIndices.SPRITE;
        cfg.startingScale = cfg.startingScale || 1;
        cfg.offsetX = config.offsetX || 0;
        cfg.offsetY = config.offsetY || 0;
        cfg.strings = config.strings;

        //Error checks
        ////special must have a unique name
        if(!cfg.nameVal) {
            throw new Error("Special text config must have a unique nameVal!");
        }
        for(var i = 0; i < _specialConfigs.length; i++) {
            if(_specialConfigs[i].nameVal === cfg.nameVal) {
                throw new Error("Special config nameVal: '" + cfg.nameVal + "' is not unique! All specials must have a unique name.");
            }
        }
        ////special must have at least one string value
        if(!cfg.strings) {
            throw  new Error("Special text config nameVal: '" + cfg.nameVal + "' is never used! At least one string must be specified for a special text config to be usable.");
        }

        if(cfg.values) {
            _specialValues.push(cfg.values);
        } else {
            _specialValues.push(null);
        }
        _specialConfigs.push(cfg);

        return this;
    };

    /**
     * Allows the user to set custom scratch areas on special symbols
     * @method addScratchArea
     * @param config
     *      @param config.values {Array} Apply this scratch area to symbols with one of the value strings in the list
     *      @param config.offsetX {Number} horizontal distance from the centre point to the top left corner of the bounding box
     *      @param config.offsetY {Number} vertical distance from the centre point to the top left corner of the bounding box
     *      @param config.w {Number} width
     *      @param config.h {Number} height
     */
    this.addScratchArea = function addScratchArea(config) {
        if(!config.values || !config.offsetX || !config.offsetY || !config.w || !config.h) {
            throw new Error("Missing config on custom scratch area!");
        }
        _customScratchAreas.push(config);
        return this;
    };

    /**
     * Adds an animation timeline that can be fired when the trigger condition is met
     * @method addAnimation
     * @param config
     *      @param config.triggerCondition {Number} Specific condition that must be satisfied before this callback is fired
     *      @param [config.values = []] {Array} Array of symbol value strings. The symbol animation will apply only to symbols with these values. If config.values is empty, the animation will apply to all symbols.
     *      @param [config.priority = pgc.Priorities.NORMAL] {Number} "Priority" of the animation. If two sequences are triggered simultaneously, the higher priority one will be run.
     *      @param [config.duration] {Number} Length of the animation sequence in ms. This should be specified if the summary popup is appearing before this animation completes.
     *      @param [config.timeLine] {TimeLine} Symbol animation timeline.
     *      @param [config.groupTimeLine] {TimeLine} Group animation timeline.
     * @returns {SymbolGroup} This SymbolGroup object, so functions can be chained.
     */
    this.addAnimation = function addAnimation(config) {
        if(!config.triggerCondition) {
            throw new Error("Must supply trigger condition from pgc.ScratchAnimationTriggers!");
        }
        config.values = config.values || [];
        config.priority = config.priority || pgc.Priorities.NORMAL;

        _animationConfigs.push(config);

        //Check the animation length against the current maximum animation length
        if(config.duration && (_maxAnimationDuration < config.duration)) {
            _maxAnimationDuration = config.duration;
        }

        return this;
    };

    /**
     * Add an additional text sprite to the SymbolGroup.
     * @method addTitleConfig
     * @param config {Object} A text definition object
     *      @param config.nameVal {String} Unique identifier for this title element
     *      @param [config.string] {String} Title string to display
     *      @param [config.offsetX = 0] {Number} Horizontal position of the prize text relative to the centre of the symbol.
     *      @param [config.offsetY = 0] {Number} Vertical position of the prize text relative to the centre of the symbol.
     *      @param [config.anchor = PGCAnchors.TOP_LEFT] {Number} Origin point of the title sprite
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
     *      @param [config.zIndex = SymbolZindices.BACKGROUND + 1] {Number} Z-index to add the title to the scene at
     * @returns {SymbolGroup} This SymbolGroup object, so functions can be chained.
     */
    this.addTitleConfig = function addTitleConfig(config) {
        var cfg = pgc.Game.ScratchController.multiplyConfig(config);
        cfg.offsetX = cfg.offsetX || 0;
        cfg.offsetY = cfg.offsetY || 0;
        cfg.zIndex = cfg.zIndex || SymbolZIndices.BACKGROUND + 1;

        //Error check - make sure the special has a unique name
        for(var i = 0; i < _titleConfigs.length; i++) {
            if(_titleConfigs[i].nameVal === cfg.nameVal) {
                throw new Error("Title config nameVal: '" + cfg.nameVal + "' is not unique! All titles must have a unique name.");
            }
        }

        _titleConfigs.push(cfg);
        applyTitleConfigs();

        _drawRequired = [true, true];
        return this;
    };

    /**
     * Adds an extra sprite to the SymbolGroup to use in animations done at the group level (e.g. the shine effect on the lucky numbers in Pengedryss).
     * @method addGroupSprite
     * @param config
     *      @param config.nameVal {String} Name of this component. Useful for animations
     *      @param config.source {String|HTMLCanvasElement} The image source
     *      @param [config.offsetX = 0] {Number} Horizontal position of the sprite in the group canvas.
     *      @param [config.offsetY = 0] {Number} Vertical position of the sprite in the group canvas.
     *      @param [config.startingScale = 1] {Number} Scaling factor to apply to the sprite at creation.
     *      @param config.sampleX {Number} The image sample's x coordinate
     *      @param config.sampleY {Number} The image sample's y coordinate
     *      @param config.sampleWidth {Number} Width of the image sample.
     *      @param config.sampleHeight {Number} Height of the image sample.
     *      @param [config.anchor = PGCAnchors.TOP_LEFT] {Number} Sprite origin position.
     *      @param [config.frames] {Array} Frame data array with items in the format: [{x: {Number}, y: {Number}, [w: {Number}], [h: {Number}]},...]
     *      @param [config.frameRate = 100] {Number} Frame rate.
     *      @param [config.visible = true] {Boolean} Starting visibility.
     *      @param [config.zIndex = SymbolZIndices.POP_OVER] {Number} Z-Index of the sprite in the scene.
     * @returns {SymbolGroup} This SymbolGroup object, so functions can be chained.
     */
    this.addGroupSprite = function addGroupSprite(config) {
        config = config || {};
        var cfg = pgc.Game.ScratchController.multiplyConfig(config),
            newSprite;

        cfg.offsetX = cfg.offsetX || 0;
        cfg.offsetY = cfg.offsetY || 0;
        cfg.startingScale = cfg.startingScale || 1;

        if(cfg.frames) {
            newSprite = new PGCSprite(getPreloadedImage(cfg.source), cfg.offsetX, cfg.offsetY, cfg.sampleX, cfg.sampleY, cfg.sampleWidth, cfg.sampleHeight);
            newSprite.setFrames(cfg.frames, cfg.frameRate);
        } else {
            newSprite = new PGCImage(getPreloadedImage(cfg.source), cfg.offsetX, cfg.offsetY, cfg.sampleX, cfg.sampleY, cfg.sampleWidth, cfg.sampleHeight);
        }
        newSprite.anchor = cfg.anchor || PGCAnchors.TOP_LEFT;
        newSprite.visible = cfg.visible !== false;
        newSprite.zIndex = cfg.zIndex || SymbolZIndices.POP_OVER;
        newSprite.nameVal = cfg.nameVal;

        newSprite.setScaling(cfg.startingScale);

        _groupSprites.push(newSprite);
        _scene.addToScene(newSprite, newSprite.zIndex);
        return this;
    };
    // ----------------------------------------- //

    // ----------------------------------------- //
    //Public skin function. Used to apply a theme to the scratch card.
    /**
     * Applies a theme to the scratch card.
     * @method addSkin
     * @param newDefaultConfig {Object} The elements of the default config that are overwritten for this skin.
     *      @param [newDefaultConfig.title] {Object}
     *          @param [newDefaultConfig.title.offsetX = 0] {Number} Horizontal position of the prize text relative to the centre of the symbol.
     *          @param [newDefaultConfig.title.offsetY = 0] {Number} Vertical position of the prize text relative to the centre of the symbol.
     *          @param [newDefaultConfig.title.fontFamily = "arial"] {String} The font family to use
     *          @param [newDefaultConfig.title.fontSize = "10px"] {String} Text size / line height
     *          @param [newDefaultConfig.title.fontStyle = "normal"] {String} normal|italic|oblique
     *          @param [newDefaultConfig.title.fontWeight = "normal"] {String} normal|bold|bolder|lighter|100|200...
     *          @param [newDefaultConfig.title.fontVariant = "normal"] {String} normal|small-caps
     *          @param [newDefaultConfig.title.fillStyle = "black"] {String} Fill colour to apply to the characters
     *          @param [newDefaultConfig.title.strokeStyles = []] {Array} Fill colours to apply to strokes (i.e. text outlines). Listed in drawing order.
     *          @param [newDefaultConfig.title.lineWidths = []] {Array} Stroke widths in pixels. Listed in drawing order.
     *          @param [newDefaultConfig.title.shadowColour = null] {String} Fill colour to apply to text shadow. Null = no shadow.
     *          @param [newDefaultConfig.title.shadowBlur = 0] {Number} Gaussian shadow blur radius in px. Larger numbers = more blur.
     *          @param [newDefaultConfig.title.shadowOffsetX = 0] {Number} Horizontal distance between shadow and characters in px.
     *          @param [newDefaultConfig.title.shadowOffsetY = 0] {Number} Vertical distance between shadow and characters in px.
     *      @param [newDefaultConfig.background] {Object}
     *          @param [newDefaultConfig.background.source] {String|HTMLCanvasElement} The image source
     *          @param [newDefaultConfig.background.sampleX] {Number} The image sample's x coordinate
     *          @param [newDefaultConfig.background.sampleY] {Number} The image sample's y coordinate
     *          @param [newDefaultConfig.background.sampleWidth] {Number} Width of the image sample.
     *          @param [newDefaultConfig.background.sampleHeight] {Number} Height of the image sample.
     *          @param [newDefaultConfig.background.frames] {Array} Frame data array with items in the format: [{x: {Number}, y: {Number}, [w: {Number}], [h: {Number}]},...]
     *          @param [newDefaultConfig.background.frameRate = 100] {Number} Frame rate.
     *      @param [newDefaultConfig.value] {Object}
     *          @param [newDefaultConfig.value.offsetX = 0] {Number} Horizontal position of the prize text relative to the centre of the symbol.
     *          @param [newDefaultConfig.value.offsetY = 0] {Number} Vertical position of the prize text relative to the centre of the symbol.
     *          @param [newDefaultConfig.value.fontFamily = "arial"] {String} The font family to use
     *          @param [newDefaultConfig.value.fontSize = "10px"] {String} Text size / line height
     *          @param [newDefaultConfig.value.fontStyle = "normal"] {String} normal|italic|oblique
     *          @param [newDefaultConfig.value.fontWeight = "normal"] {String} normal|bold|bolder|lighter|100|200...
     *          @param [newDefaultConfig.value.fontVariant = "normal"] {String} normal|small-caps
     *          @param [newDefaultConfig.value.fillStyle = "black"] {String} Fill colour to apply to the characters
     *          @param [newDefaultConfig.value.strokeStyles = []] {Array} Fill colours to apply to strokes (i.e. text outlines). Listed in drawing order.
     *          @param [newDefaultConfig.value.lineWidths = []] {Array} Stroke widths in pixels. Listed in drawing order.
     *          @param [newDefaultConfig.value.shadowColour = null] {String} Fill colour to apply to text shadow. Null = no shadow.
     *          @param [newDefaultConfig.value.shadowBlur = 0] {Number} Gaussian shadow blur radius in px. Larger numbers = more blur.
     *          @param [newDefaultConfig.value.shadowOffsetX = 0] {Number} Horizontal distance between shadow and characters in px.
     *          @param [newDefaultConfig.value.shadowOffsetY = 0] {Number} Vertical distance between shadow and characters in px.
     *      @param [newDefaultConfig.prize] {Object}
     *          @param [newDefaultConfig.prize.offsetX = 0] {Number} Horizontal position of the prize text relative to the centre of the symbol.
     *          @param [newDefaultConfig.prize.offsetY = 0] {Number} Vertical position of the prize text relative to the centre of the symbol.
     *          @param [newDefaultConfig.prize.fontFamily = "arial"] {String} The font family to use
     *          @param [newDefaultConfig.prize.fontSize = "10px"] {String} Text size / line height
     *          @param [newDefaultConfig.prize.fontStyle = "normal"] {String} normal|italic|oblique
     *          @param [newDefaultConfig.prize.fontWeight = "normal"] {String} normal|bold|bolder|lighter|100|200...
     *          @param [newDefaultConfig.prize.fontVariant = "normal"] {String} normal|small-caps
     *          @param [newDefaultConfig.prize.fillStyle = "black"] {String} Fill colour to apply to the characters
     *          @param [newDefaultConfig.prize.strokeStyles = []] {Array} Fill colours to apply to strokes (i.e. text outlines). Listed in drawing order.
     *          @param [newDefaultConfig.prize.lineWidths = []] {Array} Stroke widths in pixels. Listed in drawing order.
     *          @param [newDefaultConfig.prize.shadowColour = null] {String} Fill colour to apply to text shadow. Null = no shadow.
     *          @param [newDefaultConfig.prize.shadowBlur = 0] {Number} Gaussian shadow blur radius in px. Larger numbers = more blur.
     *          @param [newDefaultConfig.prize.shadowOffsetX = 0] {Number} Horizontal distance between shadow and characters in px.
     *          @param [newDefaultConfig.prize.shadowOffsetY = 0] {Number} Vertical distance between shadow and characters in px.
     *      @param [newDefaultConfig.foil] {Object}
     *          @param [newDefaultConfig.foil.source] {String|HTMLCanvasElement} The image source
     *          @param [newDefaultConfig.foil.sampleX] {Number} The image sample's x coordinate
     *          @param [newDefaultConfig.foil.sampleY] {Number} The image sample's y coordinate
     *          @param [newDefaultConfig.foil.sampleWidth] {Number} Width of the image sample.
     *          @param [newDefaultConfig.foil.sampleHeight] {Number} Height of the image sample.
     *          @param [newDefaultConfig.foil.frames] {Array} Frame data array with items in the format: [{x: {Number}, y: {Number}, [w: {Number}], [h: {Number}]},...]
     *          @param [newDefaultConfig.foil.frameRate = 100] {Number} Frame rate.
     *          @param [newDefaultConfig.foil.scratchArea] {String} Defines what must be uncovered before the symbol counts as being scratched. Can be set to "Value", "Prize" or "Foil"(default)
     *          @param [newDefaultConfig.foil.foilOpacity = 1.0] {Number} Special foil opacity - allows partially transparent foil that does not reveal the values beneath.
     *      @param [newDefaultConfig.scratchSprite] {Object}
     *          @param [newDefaultConfig.scratchSprite.source] {String|HTMLCanvasElement} The image source
     *          @param [newDefaultConfig.scratchSprite.sampleX] {Number} The image sample's x coordinate
     *          @param [newDefaultConfig.scratchSprite.sampleY] {Number} The image sample's y coordinate
     *          @param [newDefaultConfig.scratchSprite.sampleWidth] {Number} Width of the image sample.
     *          @param [newDefaultConfig.scratchSprite.sampleHeight] {Number} Height of the image sample.
     *          @param [newDefaultConfig.scratchSprite.frames] {Array} Frame data array with items in the format: [{x: {Number}, y: {Number}, [w: {Number}], [h: {Number}]},...]
     *          @param [newDefaultConfig.scratchSprite.frameRate = 100] {Number} Frame rate.
     *      @param [newDefaultConfig.foilAnimation] {PGCSprite}
     *      @param [newDefaultConfig.title] {PGCSprite}
     *      @param [newDefaultConfig.prizeSymbol]
     *          @param [newDefaultConfig.prizeSymbol.prize]
     *               @param [newDefaultConfig.prizeSymbol.prize.offsetX = 0] {Number} Horizontal position of the prize text relative to the centre of the symbol.
     *               @param [newDefaultConfig.prizeSymbol.prize.offsetY = 0] {Number} Vertical position of the prize text relative to the centre of the symbol.
     *               @param [newDefaultConfig.prizeSymbol.prize.fontFamily = "arial"] {String} The font family to use
     *               @param [newDefaultConfig.prizeSymbol.prize.fontSize = "10px"] {String} Text size / line height
     *               @param [newDefaultConfig.prizeSymbol.prize.fontStyle = "normal"] {String} normal|italic|oblique
     *               @param [newDefaultConfig.prizeSymbol.prize.fontWeight = "normal"] {String} normal|bold|bolder|lighter|100|200...
     *               @param [newDefaultConfig.prizeSymbol.prize.fontVariant = "normal"] {String} normal|small-caps
     *               @param [newDefaultConfig.prizeSymbol.prize.fillStyle = "black"] {String} Fill colour to apply to the characters
     *               @param [newDefaultConfig.prizeSymbol.prize.strokeStyles = []] {Array} Fill colours to apply to strokes (i.e. text outlines). Listed in drawing order.
     *               @param [newDefaultConfig.prizeSymbol.prize.lineWidths = []] {Array} Stroke widths in pixels. Listed in drawing order.
     *               @param [newDefaultConfig.prizeSymbol.prize.shadowColour = null] {String} Fill colour to apply to text shadow. Null = no shadow.
     *               @param [newDefaultConfig.prizeSymbol.prize.shadowBlur = 0] {Number} Gaussian shadow blur radius in px. Larger numbers = more blur.
     *               @param [newDefaultConfig.prizeSymbol.prize.shadowOffsetX = 0] {Number} Horizontal distance between shadow and characters in px.
     *               @param [newDefaultConfig.prizeSymbol.prize.shadowOffsetY = 0] {Number} Vertical distance between shadow and characters in px.
     *               @param [newDefaultConfig.prizeSymbol.prize.maxWidth] {Number} Set a maximum width that the prize object can have while the symbol is unscratched. The object will scale down to this size if required.
     *          @param [newDefaultConfig.prizeSymbol.foil]
     *               @param [newDefaultConfig.prizeSymbol.foil.source] {String|HTMLCanvasElement} The image source
     *               @param [newDefaultConfig.prizeSymbol.foil.sampleX] {Number} The image sample's x coordinate
     *               @param [newDefaultConfig.prizeSymbol.foil.sampleY] {Number} The image sample's y coordinate
     *               @param [newDefaultConfig.prizeSymbol.foil.sampleWidth] {Number} Width of the image sample.
     *               @param [newDefaultConfig.prizeSymbol.foil.sampleHeight] {Number} Height of the image sample.
     *               @param [newDefaultConfig.prizeSymbol.foil.frames] {Array} Frame data array with items in the format: [{x: {Number}, y: {Number}, [w: {Number}], [h: {Number}]},...]
     *               @param [newDefaultConfig.prizeSymbol.foil.frameRate = 100] {Number} Frame rate.
     *               @param [newDefaultConfig.prizeSymbol.foil.scratchArea] {String} Defines what must be uncovered before the symbol counts as being scratched. Can be set to "Value", "Prize" or "Foil"(default)
     *               @param [newDefaultConfig.prizeSymbol.foil.foilOpacity = 1.0] {Number} Special foil opacity - allows partially transparent foil that does not reveal the values beneath.
     *          @param [newDefaultConfig.prizeSymbol.scratchSprite]
     *               @param [newDefaultConfig.prizeSymbol.scratchSprite.source] {String|HTMLCanvasElement} The image source
     *               @param [newDefaultConfig.prizeSymbol.scratchSprite.sampleX] {Number} The image sample's x coordinate
     *               @param [newDefaultConfig.prizeSymbol.scratchSprite.sampleY] {Number} The image sample's y coordinate
     *               @param [newDefaultConfig.prizeSymbol.scratchSprite.sampleWidth] {Number} Width of the image sample.
     *               @param [newDefaultConfig.prizeSymbol.scratchSprite.sampleHeight] {Number} Height of the image sample.
     *               @param [newDefaultConfig.prizeSymbol.scratchSprite.frames] {Array} Frame data array with items in the format: [{x: {Number}, y: {Number}, [w: {Number}], [h: {Number}]},...]
     *               @param [newDefaultConfig.prizeSymbol.scratchSprite.frameRate = 100] {Number} Frame rate.
     * @param [...altConfig] {Object} The elements of any alternate configs that will be replaced this skin
     *      @param [altConfig.altTitle] {Object} Additional title config
     *          @param [altConfig.altTitle.offsetX] {Number} Horizontal position of the prize text relative to the centre of the symbol.
     *          @param [altConfig.altTitle.offsetY] {Number} Vertical position of the prize text relative to the centre of the symbol.
     *          @param [altConfig.altTitle.fontFamily] {String} The font family to use
     *          @param [altConfig.altTitle.fontSize] {String} Text size / line height
     *          @param [altConfig.altTitle.fontStyle] {String} normal|italic|oblique
     *          @param [altConfig.altTitle.fontWeight] {String} normal|bold|bolder|lighter|100|200...
     *          @param [altConfig.altTitle.fontVariant] {String} normal|small-caps
     *          @param [altConfig.altTitle.fillStyle  {String} Fill colour to apply to the characters
     *          @param [altConfig.altTitle.strokeStyles] {Array} Fill colours to apply to strokes (i.e. text outlines). Listed in drawing order.
     *          @param [altConfig.altTitle.lineWidths] {Array} Stroke widths in pixels. Listed in drawing order.
     *          @param [altConfig.altTitle.shadowColour] {String} Fill colour to apply to text shadow. Null = no shadow.
     *          @param [altConfig.altTitle.shadowBlur] {Number} Gaussian shadow blur radius in px. Larger numbers = more blur.
     *          @param [altConfig.altTitle.shadowOffsetX] {Number} Horizontal distance between shadow and characters in px.
     *          @param [altConfig.altTitle.shadowOffsetY] {Number} Vertical distance between shadow and characters in px.
     *      @param [altConfig.altBackground] {Object} Additional foil config
     *          @param [altConfig.altBackground.source] {String|HTMLCanvasElement} The image source
     *          @param [altConfig.altBackground.sampleX] {Number} The image sample's x coordinate
     *          @param [altConfig.altBackground.sampleY] {Number} The image sample's y coordinate
     *          @param [altConfig.altBackground.sampleWidth] {Number} Width of the image sample.
     *          @param [altConfig.altBackground.sampleHeight] {Number} Height of the image sample.
     *          @param [altConfig.altBackground.frames] {Array} Frame data array with items in the format: [{x: {Number}, y: {Number}, [w: {Number}], [h: {Number}]},...]
     *          @param [altConfig.altBackground.frameRate] {Number} Frame rate.
     *      @param [altConfig.altFoil] {Object} Additional foil config
     *          @param [altConfig.altFoil.source] {String|HTMLCanvasElement} The image source
     *          @param [altConfig.altFoil.sampleX] {Number} The image sample's x coordinate
     *          @param [altConfig.altFoil.sampleY] {Number} The image sample's y coordinate
     *          @param [altConfig.altFoil.sampleWidth] {Number} Width of the image sample.
     *          @param [altConfig.altFoil.sampleHeight] {Number} Height of the image sample.
     *          @param [altConfig.altFoil.frames] {Array} Frame data array with items in the format: [{x: {Number}, y: {Number}, [w: {Number}], [h: {Number}]},...]
     *          @param [altConfig.altFoil.frameRate] {Number} Frame rate.
     *          @param [altConfig.altFoil.scratchArea] {String} Defines what must be uncovered before the symbol counts as being scratched. Can be set to "Value", "Prize" or "Foil"(default)
     *          @param [altConfig.altFoil.foilOpacity] {Number} Special foil opacity - allows partially transparent foil that does not reveal the values beneath.
     *      @param [altConfig.altScratchSprite] {Object} Additional foil config
     *          @param [altConfig.altScratchSprite.source] {String|HTMLCanvasElement} The image source
     *          @param [altConfig.altScratchSprite.sampleX] {Number} The image sample's x coordinate
     *          @param [altConfig.altScratchSprite.sampleY] {Number} The image sample's y coordinate
     *          @param [altConfig.altScratchSprite.sampleWidth] {Number} Width of the image sample.
     *          @param [altConfig.altScratchSprite.sampleHeight] {Number} Height of the image sample.
     *          @param [altConfig.altScratchSprite.frames] {Array} Frame data array with items in the format: [{x: {Number}, y: {Number}, [w: {Number}], [h: {Number}]},...]
     *          @param [altConfig.altScratchSprite.frameRate] {Number} Frame rate.
     *     @param [altConfig.special] {Object} Additional special config
     *          @param [altConfig.special.values = []] {Array} Array of symbol value strings that will trigger adding this sprite to the symbol. If this value doesn't exist, show the sprite on default symbols.
     *          @param [altConfig.special.source] {String|HTMLCanvasElement} The image source
     *          @param [altConfig.special.sampleX] {Number} The image sample's x coordinate
     *          @param [altConfig.special.sampleY] {Number} The image sample's y coordinate
     *          @param [altConfig.special.sampleWidth] {Number} Width of the image sample.
     *          @param [altConfig.special.sampleHeight] {Number} Height of the image sample.
     *          @param [altConfig.special.frames] {Array} Frame data array with items in the format: [{x: {Number}, y: {Number}, [w: {Number}], [h: {Number}]},...]
     *          @param [altConfig.special.frameRate = 100] {Number} Frame rate.
     *          @param [altConfig.special.sprite] {PGCImage} A previously made sprite to be added to the SymbolGroup as-is.
     *     @param [altConfig.specialText] {Object} Additional special text config
     *          @param [altConfig.values] {Array} Array of symbol value strings that will trigger adding this text sprite to the symbol. If config.values is undefined, show the sprite on default symbols.
     *          @param [...altConfig.strings] {Object} Config object detailing the strings that can be displayed by this symbol.
     *              @param [altConfig.strings.value] {String} Value that triggers the object to have the specific string.
     *              @param [altConfig.strings.string] {String} String to display when the symbol has the corresponding value and/or prize.
     *          @param [altConfig.offsetX = 0] {Number} Horizontal position of the text centre relative to the centre of the symbol.
     *          @param [altConfig.offsetY = 0] {Number} Vertical position of the text centre relative to the centre of the symbol.
     *          @param [altConfig.fontFamily = "arial"] {String} The font family to use
     *          @param [altConfig.fontSize = "10px"] {String} Text size / line height
     *          @param [altConfig.fontStyle = "normal"] {String} normal|italic|oblique
     *          @param [altConfig.fontWeight = "normal"] {String} normal|bold|bolder|lighter|100|200...
     *          @param [altConfig.fontVariant = "normal"] {String} normal|small-caps
     *          @param [altConfig.fillStyle = "black"] {String} Fill colour to apply to the characters
     *          @param [altConfig.strokeStyles = []] {Array} Fill colours to apply to strokes (i.e. text outlines). Listed in drawing order.
     *          @param [altConfig.lineWidths = []] {Array} Stroke widths in pixels. Listed in drawing order.
     *          @param [altConfig.shadowColour = null] {String} Fill colour to apply to text shadow. Null = no shadow.
     *          @param [altConfig.shadowBlur = 0] {Number} Gaussian shadow blur radius in px. Larger numbers = more blur.
     *          @param [altConfig.shadowOffsetX = 0] {Number} Horizontal distance between shadow and characters in px.
     *          @param [altConfig.shadowOffsetY = 0] {Number} Vertical distance between shadow and characters in px.
     *          @param [altConfig.maxWidth] {Number} Set a maximum width that the text sprite can have while the symbol is unscratched. The object will scale down to this size if required.
     * @returns {SymbolGroup} This SymbolGroup object, so functions can be chained.
     */
    this.addSkin = function addSkin(newDefaultConfig) {
        var i, j, si, alt, altAdded;

        if(_skinConfigs.length === 0) {
            //No skins exist yet. Create a skin for the default settings
            _skinConfigs.push({
                title:          _titleConfigs,
                background:     _backgroundConfigs,
                value:          _valueConfig,
                prize:          _prizeConfig,
                foil:           _foilConfigs,
                foilAnim:       _foilAnim,
                scratchSprite:  _scratchSpriteConfigs,
                specials:       _specialConfigs
            });
        }

        //Create the new skin
        si = _skinConfigs.length; //index of the new skin
        _skinConfigs.push({});
        //Only add properties that are included in the arguments
        if(newDefaultConfig.title) {
            _skinConfigs[si].title = [pgc.Game.ScratchController.multiplyConfig(newDefaultConfig.title)];
        }
        if(newDefaultConfig.background) {
            _skinConfigs[si].background = [pgc.Game.ScratchController.multiplyConfig(newDefaultConfig.background)];
        }
        if(newDefaultConfig.value) {
            _skinConfigs[si].value = pgc.Game.ScratchController.multiplyConfig(newDefaultConfig.value);
        }
        if(newDefaultConfig.prize) {
            _skinConfigs[si].prize = pgc.Game.ScratchController.multiplyConfig(newDefaultConfig.prize);
        }
        if(newDefaultConfig.foil) {
            _skinConfigs[si].foil = [pgc.Game.ScratchController.multiplyConfig(newDefaultConfig.foil)];
        }
        if(newDefaultConfig.foilAnim) {
            _skinConfigs[si].foilAnim = newDefaultConfig.foilAnim;
        }
        if(newDefaultConfig.scratchSprite) {
            _skinConfigs[si].scratchSprite = [pgc.Game.ScratchController.multiplyConfig(newDefaultConfig.scratchSprite)];
        }
        if(newDefaultConfig.prizeSymbol) {
            _skinConfigs[si].prizeSymbol = {};
            if(newDefaultConfig.prizeSymbol.prize) {
                _skinConfigs[si].prizeSymbol.prize = pgc.Game.ScratchController.multiplyConfig(newDefaultConfig.prizeSymbol.prize);
            }
            if(newDefaultConfig.prizeSymbol.foil) {
                _skinConfigs[si].prizeSymbol.foil = pgc.Game.ScratchController.multiplyConfig(newDefaultConfig.prizeSymbol.foil);
            }
            if(newDefaultConfig.prizeSymbol.scratchSprite) {
                _skinConfigs[si].prizeSymbol.scratchSprite = pgc.Game.ScratchController.multiplyConfig(newDefaultConfig.prizeSymbol.scratchSprite);
            }
        }

        //Add the altConfigs
        for(i = 1; i < arguments.length; i++) {
            alt = arguments[i];
            if(alt.altTitle) {
                if (!_skinConfigs[si].title) {
                    //new default title must be the same as on the old default skin
                    _skinConfigs[si].title = _skinConfigs[0].title.slice(0, 1);
                }
                _skinConfigs[si].title.push(pgc.Game.ScratchController.multiplyConfig(alt.altTitle));
            }

            if(alt.altBackground) {
                if(!_skinConfigs[si].background) {
                    //new default background must be the same as on the old default skin
                    _skinConfigs[si].background = _skinConfigs[0].background.slice(0, 1);
                }
                _skinConfigs[si].background.push(pgc.Game.ScratchController.multiplyConfig(alt.altBackground));
            }

            if(alt.altFoil) {
                if(!_skinConfigs[si].foil) {
                    //new default foil must be the same as on the old default skin
                    _skinConfigs[si].foil = _skinConfigs[0].foil.slice(0, 1);
                }
                _skinConfigs[si].foil.push(pgc.Game.ScratchController.multiplyConfig(alt.altFoil));
            }

            if(alt.altScratchSprite) {
                if(!_skinConfigs[si].scratchSprite) {
                    //new default foil must be the same as on the old default skin
                    _skinConfigs[si].scratchSprite = _skinConfigs[0].scratchSprite.slice(0, 1);
                }
                _skinConfigs[si].scratchSprite.push(pgc.Game.ScratchController.multiplyConfig(alt.altScratchSprite));
            }

            if(alt.special) {
                if(!_skinConfigs[si].specials) {
                    _skinConfigs[si].specials = [];
                }
                _skinConfigs[si].specials.push(pgc.Game.ScratchController.multiplyConfig(alt.special));
            }

            if(alt.specialText) {
                if(!_skinConfigs[si].specials) {
                    _skinConfigs[si].specials = [];
                }
                _skinConfigs[si].specials.push(pgc.Game.ScratchController.multiplyConfig(alt.specialText));
            }
        }

        return this;
    };
    // ----------------------------------------- //

    // ----------------------------------------- //
    //Public functions
    /**
     * Helper function. Gets an animated group sprite by name and performs the run operation on it.
     * @method animateGroupSprite
     * @param config
     *      @param config.spriteName {String} Name of the group sprite.
     *      @param [config.x] {Number} Optional X-position to move the sprite to before animating it.
     *      @param [config.y] {Number} Optional Y-position to move the sprite to before animating it.
     *      @param [config.visibleAfter = true] {Boolean} Whether or not the sprite remains visible once the animation is complete.
     *      @param [config.count = 1] {Number} Number of times to run the animation
     */
    this.animateGroupSprite = function animateGroupSprite(config) {
        if(!config.spriteName) {
            throw new Error("spriteName must be specified in animation functions!");
        }
        config.count = config.count || 1;
        config.visibleAfter = config.visibleAfter !== false;

        var sprite = _that.getGroupSpriteByName(config.spriteName);
        sprite.visible = true;
        if(!sprite.frames) {
            throw new Error("Trying to animate non-animated group sprite!");
        }

        if(config.x) {
            sprite.x = config.x * _texMult;
        }
        if(config.y) {
            sprite.y = config.y * _texMult;
        }

        var visibleAfter = config.visibleAfter,
            count = config.count;
        sprite.run(function(){
            sprite.visible = visibleAfter;
            _that.requestDraw();
        }, count, 0);
    };

    /**
     * Runs the animations with the given trigger value. High priority animations are played instead of lower priority ones. Animations with the same priority trigger simultaneously.
     * @method triggerAnimation
     * @param config
     *      @param config.trigger {ScratchAnimationTrigger} The trigger that, uh, triggered.
     *      @param [config.symbols] {Array} The Symbols that this trigger applies to.
     * @returns {Boolean} True if any symbol or group animation was triggered.
     */
    this.triggerAnimation = function triggerAnimation(config) {
        var i, j,
            symbolIndex,
            triggeredAnimations = [],
            triggeredSymbols = [],
            somethingTriggered = false;

        if(!config.trigger) {
            throw new Error("Call to trigger animation with no trigger provided!");
        }

        //Get the list of animation configs that were triggered
        for(i = 0; i < _animationConfigs.length; i++) {
            if(_animationConfigs[i].triggerCondition === config.trigger) {
                //Check for symbol timeLine
                if(_animationConfigs[i].timeLine) {
                    triggeredAnimations.push(_animationConfigs[i]);
                }
                //Check for group timeLine
                if(_animationConfigs[i].groupTimeLine) {
                    if(_currentGroupAnimation === null || _currentGroupAnimation.priority < _animationConfigs[i].priority) {
                        _currentGroupAnimation = _animationConfigs[i];
                        somethingTriggered = true;
                    } else if (_currentGroupAnimation !== _animationConfigs[i]) {
                        //An animation with the same priority is already triggered, and it's not the same animation getting triggered twice, so throw an error
                        throw new Error("Attempt to trigger two animations with same priority!\n\n" +
                        "Symbol:\n" + _symbols[symbolIndex].toString() +
                        "\n\nAnimation already triggered:\n" + _currentSymbolAnimations[symbolIndex].groupTimeLine.toString() +
                        "\n\nAnimation being triggered:\n" + triggeredAnimations[j].groupTimeLine.toString());
                    }
                }
            }
        }

        //Get a list of symbols to apply the symbol animations to
        if(config.symbols) {
            for(i = 0; i < config.symbols.length; i++) {
                //only include the symbol if it is part of this group
                if(_symbols.indexOf(config.symbols[i]) > -1) {
                    //Symbol is part of this group
                    triggeredSymbols.push(config.symbols[i]);
                }
            }
        } else {
            triggeredSymbols = _symbols;
        }

        //For each symbol, assign the highest priority animation that is applicable
        for(i = 0; i < triggeredSymbols.length; i++) {
            for(j = 0; j < triggeredAnimations.length; j++) {
                if(triggeredAnimations[j].values.length === 0 || triggeredAnimations[j].values.indexOf(triggeredSymbols[i].getValue()) > -1) {
                    //Animation applies to every symbol, or animation applies to this symbol.
                    symbolIndex = _symbols.indexOf(triggeredSymbols[i]); //We know the symbol is part of this group as we filtered it earlier
                    if(_currentSymbolAnimations[symbolIndex] === null || _currentSymbolAnimations[symbolIndex].priority < triggeredAnimations[j].priority) {
                        //The symbol does not have an animation triggered, or the triggered animation is lower priority (so dump it)
                        _currentSymbolAnimations[symbolIndex] = triggeredAnimations[j];
                        somethingTriggered = true;
                    } else if (_currentSymbolAnimations[symbolIndex].priority === triggeredAnimations[j].priority && _currentSymbolAnimations[symbolIndex] !== triggeredAnimations[j]) {
                        //An animation with the same priority is already triggered, and it's not the same animation getting triggered twice, so throw an error
                        throw new Error("Attempt to trigger two animations with same priority!\n\n" +
                                        "Symbol:\n" + _symbols[symbolIndex].toString() +
                                        "\n\nAnimation already triggered:\n" + _currentSymbolAnimations[symbolIndex].timeLine.toString() +
                                        "\n\nAnimation being triggered:\n" + triggeredAnimations[j].timeLine.toString());
                    }
                }
            }
        }
        return somethingTriggered;
    };

    /** Automatically scratches the foil over the symbol at the given coordinates
     * @method tapReveal
     * @param x {Number} X-Coordinate of tap
     * @param y {Number} Y-Coordinate of tap
     * @returns {Number} Returns the index of the symbol that was scratched or null if no symbol was scratched
     */
    this.tapReveal = function tapReveal(x, y) {
        if(_disableScratch) {
            return null;
        }

        //Find which symbol (if any) was tapped
        var i;
        for(i = 0; i < _symbols.length; i++) {
            //get the bounding box coords
            var bBox = _symbols[i].getTouchBBox();

            if(x >= bBox.x && x <= bBox.x + bBox.w) {
                if(y >= bBox.y && y <= bBox.y + bBox.h) {
                    if(!_symbols[i].getScratched() && !_symbols[i].getScratchAnimating()) {
                        _symbols[i].setScratchAnimating(true);
                        var interrupted = _that.triggerAnimation({
                            trigger: pgc.ScratchAnimationTriggers.TAP_INTERRUPT,
                            symbols: [_symbols[i]]
                        });

                        if(!interrupted) {
                            //scratch off the foil
                            _symbols[i].animateScratch();
                        }
                        return i;
                    }
                    break;
                }
            }
        }

        return null;
    };

    /**
     * Automatically scratches the foil off of all remaining symbols
     * @method revealAll
     */
    this.revealAll = function revealAll() {
        var i;
        for(i = 0; i < _symbols.length; i++) {
            if(!_symbols[i].getScratched() && !_symbols[i].getScratchAnimating()) {
                _symbols[i].setScratchAnimating(true);
                var interrupted = _that.triggerAnimation({
                    trigger: pgc.ScratchAnimationTriggers.TAP_INTERRUPT,
                    symbols: [_symbols[i]]
                });

                if(!interrupted) {
                    //scratch off the foil
                    _symbols[i].animateScratch();
                }
            }
        }
    };

    /**
     * Scratches the symbol foils using the provided brushSprite
     * @param brushSprite {PGCImage}
     * @param x {Number}
     * @param y {Number}
     */
    this.scratch = function scratch(brushSprite, x, y) {
        if(_disableScratch) {
            return;
        }

        var brushRect = new PGCRect(x - brushSprite.width / 2, y - brushSprite.height / 2, x + brushSprite.width / 2, y + brushSprite.height / 2);
        for(var i = 0; i < _symbols.length; i++) {
            if(brushRect.collides(_symbols[i].getFoilRect())) {
                _symbols[i].scratch(brushSprite, brushRect, x, y);
            }
        }
    };

    /**
     * Returns true when all symbols are scratched
     * @method allScratched
     * @returns {boolean}
     */
    this.allScratched = function allScratched() {
        if(_allScratched) {
            return true;
        }

        var ss = 0;
        for(var i = 0; i < _symbols.length; i++) {
            if(_symbols[i].getScratched()) {
                ss++;
            }
        }
        if(ss === _symbols.length) {
            _allScratched = true;
            _that.triggerAnimation({trigger: pgc.ScratchAnimationTriggers.ALL_SCRATCHED});
            return true;
        }
    };

    /**
     * Puts all the scratched symbols into an array and returns a serialised version
     * @method save
     * @returns {String} a serialised array
     */
    this.save = function save() {
        var scratchedSymbols = [];
        for(var i = 0; i < _symbols.length; i++) {
            if(_symbols[i].getScratched()) {
                scratchedSymbols.push(i);
            }
        }
        return JSON.stringify(scratchedSymbols);
    };

    /**
     * Takes a serialised array string made using this.save() and parses it
     * @method load
     * @param data {String} The serialised array
     */
    this.load = function load(data) {
        var scratchedSymbols = data && JSON.parse(data),
            temp = _disableScratch;
        _disableScratch = false;
        for(var i = 0; i < scratchedSymbols.length; i++) {
            if(scratchedSymbols[i] < _symbols.length && scratchedSymbols[i] >= 0) {
                var index = parseInt(scratchedSymbols[i]);
                if(!isNaN(index) && index >= 0) {
                    _symbols[i].setScratchAnimating(true);
                    var interrupted = _that.triggerAnimation({
                        trigger: pgc.ScratchAnimationTriggers.TAP_INTERRUPT,
                        symbols: [_symbols[i]]
                    });

                    if(!interrupted) {
                        //scratch off the foil
                        _symbols[i].animateScratch();
                    }
                }
            }
        }
        _disableScratch = temp;
    };

    /**
     * Tells the SymbolGroup to redraw itself next frame
     * @method requestDraw
     */
    this.requestDraw = function requestDraw() {
        _drawRequired = [true, true];
    };

    /**
     * Performs update operations on the group that should be done every frame (regardless of _drawRequired state). Named "step" to avoid confusion with the PGCScene update function.
     * @method step
     */
    this.step = function step() {
        //Fit the scene in its container and realign as necessary
        fitToContainer();

        //Update the symbols
        var i, delta, currentTime;
        currentTime = new Date().getTime();
        delta = currentTime - _scene.lastUpdate;

        for(i = 0; i < _symbols.length; i++) {
            _symbols[i].step(delta);
        }

        //Fire all the triggered animations
        for(i = 0; i < _currentSymbolAnimations.length; i++) {
            if(_currentSymbolAnimations[i] !== null) {
                _symbols[i].setTimeLine(_currentSymbolAnimations[i].timeLine.clone(_symbols[i]));
                _drawRequired = [true, true];
                _currentSymbolAnimations[i] = null;
            }
        }
        if(_currentGroupAnimation !== null) {
            _that.setTimeLine(_currentGroupAnimation.groupTimeLine.setTarget(_that));
            _currentGroupAnimation = null;
        }

        //Update timeline
        if(_timeLine) {
            _timeLine.step(delta);
        }

        //Check to see if we need to redraw the scene
        for(i = 0; i < _scene.children.length; i++) {
            if(_scene.children[i].requestUpdate || _scene.children[i].runFrameAnimation) {
                _drawRequired = [true, true];
                break;
            }
        }
        if(_drawRequired[0] || _drawRequired[1]) {
            _that.render(delta);
        } else {
            //TODO: Hack to allow lazy repaint. This is fixed in canvas API, we should be using that.
            _scene.lastUpdate = currentTime;
        }
    };

    /**
     * Updates the state of the PGCContainer objects in the symbolGroup and draws them to the canvas. This is not normally called outside of SymbolGroup, but is made public for bugfixing reasons.
     * @method render
     * @public
     */
    this.render = function render(delta) {
        _scene.context.save();
        _scene.lastUpdate = Date.now() - delta; //Decouples the simulation and rendering
        _scene.update();

        _drawRequired[0] = _drawRequired[1];
        _drawRequired[1] = false;

        _scene.context.restore();
    };
    // ----------------------------------------- //

    // ----------------------------------------- //
    //Initialisation
    //Scene setup
    _gutterDoubled = _gutter * 2;
    _gutterDoubledScaled = _container ? (parseInt(getComputedStyle(_container).width, 10) / _width) * _gutterDoubled : _gutterDoubled;
    _scene = new PGCScene(_width + _gutterDoubled, _height + _gutterDoubled, _container);

    pgc.Game.scratchSceneReferences.push(_scene);
    pgc.Game.symbolGroupReferences.push(this);
    fitToContainer();
};