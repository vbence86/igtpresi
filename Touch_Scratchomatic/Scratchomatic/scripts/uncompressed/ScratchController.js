/**
 * Enumeration type used to indicate the type of a scratch brush.
 * @class ScratchBrushTypes
 */
pgc.ScratchBrushTypes = {
    /**
     * Brushes of this type are drawn to the foil using the "destination-out" globalCompositeOperation, effectively erasing the foil.
     * @property SCRATCH
     * @final
     * @type Number
     */
    SCRATCH: 1,
    /**
     * Brushes of this type trigger the automatic scratch animation on any symbol they touch.
     * @property WAND
     * @final
     * @type Number
     */
    WAND: 2
};

/**
 * Enumberation type used to indicate the win condition for a scratch game
 * @class ScratchGameTypes
 */
pgc.ScratchGameTypes = {
    /**
     * Games of this type will trigger a win animation when EACH symbol in the combination is uncovered - BUT only if the lucky number is also uncovered.
     * @property LUCKY_NUMBERS
     * @final
     * @type Number
     */
    LUCKY_NUMBERS: 1,
    /**
     * Games of this type will trigger a win animation when ALL symbols in the combination are uncovered. Note that this includes instant win symbols - these are effectively a "match 1" game.
     * @propert MATCH_X
     * @final
     * @type Number
     */
    MATCH_X: 2,
    /**
     * Games of this type never trigger a win animation. Used to display completed games (e.g. Advent)
     * @propert DISPLAY
     * @final
     * @type Number
     */
    DISPLAY: 3
};

/**
 * Enumeration class of animation sequence trigger ids. When a particular condition is met, the controller will fire callbacks that share the condition's id.
 * @class ScratchAnimationTriggers
 */
pgc.ScratchAnimationTriggers = {
    /**
     * Met when the game starts.
     * @property START
     * @final
     * @type Number
     */
    START: 1,
    /**
     * Met when the
     * @property START
     * @final
     * @type Number
     */
    LAST_INTRO_ANIMATION: 1,
    /**
     * Met when a symbol is revealed.
     * @property SCRATCHED
     * @final
     * @type Number
     */
    SCRATCHED: 2,
    /**
     * Met when a symbol is revealed to be a winner.
     * @property WIN
     * @final
     * @type Number
     */
    WIN: 3,
    /**
     * Met when all the symbols of a group have been scratched.
     * @property ALL_SCRATCHED
     * @final
     * @type Number
     */
    ALL_SCRATCHED: 4,
    /**
     * Met when all the symbols are scratched in all the SymbolGroups in a game.
     * @property GAME_OVER
     * @final
     * @type Number
     */
    GAME_OVER: 5,
    /**
     * Copy of the GAME_OVER trigger. 11% saving on keystrokes!
     * @property GAMEOVER
     * @final
     * @type Number
     */
    GAMEOVER: 5,
    /**
     * Met when the user taps a foil. This blocks the normal {Symbol}.animateScratch() call.
     * @property TAP_INTERRUPT
     * @final
     * @type Number
     */
    TAP_INTERRUPT: 6,
    /**
     * Triggered explicitly by the user.
     * @property CUSTOM00, CUSTOM01, CUSTOM02
     * @final
     * @type Number
     */
    CUSTOM00:   100,
    CUSTOM01:   101,
    CUSTOM02:   102
};

/**
 * Enumeration type used to set the interaction between a SymbolGroup canvas and its containing element when the container is resized.
 * @type {Object}
 */
pgc.CanvasFitModes = {
    /**
     * With this mode, the canvas is scaled to fit into the container by setting the canvas.style.width and canvas.style.height. (Default)
     * @property SCALE
     * @final
     * @type {Number}
     */
    SCALE:  1,
    /**
     * With this mode, the canvas is resized to have the same dimensions as its container.
     * @property RESIZED
     * @final
     * @type {Number}
     */
    RESIZE: 2,
    /**
     * With this mode, the canvas is never scaled or resized to fit its container.
     * @property NONE
     * @final
     * @type {Number}
     */
    NONE:   3
};

/**
 * Stores any settings/constants used in scratchomatic
 * @type {Object}
 */
pgc.ScratchConstants = {
    /**
     * String used to separate the values in a multi-symbol(e.g. JackpotScratchCard).
     * @property MULTI_SYMBOL_DELIMITER
     * @final
     * @type {String}
     */
    MULTI_SYMBOL_DELIMITER : ":"
};

pgc.Priorities = {
    LOWEST:     1,
    LOW:        5,
    NORMAL:     10,
    HIGH:       15,
    HIGHER:     20,
    HIGHEST:    25
};

/**
 * A singleton class that manages active ScratchGames and their SymbolGroups
 * @class ScratchController
 * @author Bob Moir on 24/06/2015.
 */
var ScratchController = function() {
    // ----------------------------------------- //
    //Constasts
    var SCRATCH_LERP_DIST = 5; //During a touchmove/mousemove event on foil, draw the brush sprite every x pixels (i.e. lower numbers = more scratching)

    // ----------------------------------------- //
    //Private properties
    var _that = this,
        _tapTime = 300,                         //Setting denoting the maximum duration(ms) a screen touch can last and still count as a tap
        _touchStarted = false,
        _touchStartTime,
        _lastTouch = null,                      //Stores the location of the touch/mouse event last tick (if any)
        _brushSprite,                           //The sprite currently being used as the scratching brush
        _brushType,                             //The brush type - not all brushes scratch, some do other things (e.g. wand)
        _symbolGroupList = [],                  //Array of SymbolGroup references. Each SymbolGroup that the controller knows about appears in the array exactly once.
        _extraSceneList = [],                   //Array of PGCScene references. Scenes in this list will be rendered each step.
        _extraSceneRemovalQueue = [],           //Array of PGCScene references. Scenes in this list will be removed from _extraSceneList at the end of the next step.
        _gameConfigs = [],                      //Array of scratch games that the controller is presiding over. A single SymbolGroup can be part of more than one game.
        _winningSymbols = [],                   //Stores the winning combinations of symbols for each game config.
        _requestId,                             //Reference to the requestAnimationFrame request ID.
        _texMult,                               //Texture multiplier. Multiplies the sampling values for sprites when using retina graphics.
        _gameOverWait = false,                  //True when waiting for the game to end.
        _autoGameOver = true,                   //Set to false to disable automatically ending finished games.
        _gameOverWaitTime = 0;                  //Number of milliseconds to wait before ending a game once all symbols are scratched.

    // Sound Control
    var _scratchSoundInterval = -1,
        _scratchSoundTimeSinceLastEvent = -1,
        _scratchSoundPaused = false;

    // ----------------------------------------- //
    //Private functions
    var getSSMultiplier = function getSSMultiplier() {
        //Calculate sprite size multiplier
        var imgUrl = urlConverter.device;
        if ((imgUrl.search("/x[^1]") > 0 && imgUrl.search("/x[^0]") > 0) || imgUrl.search("640x960") > 0) {
            return 2;
        } else {
            return 1;
        }
    };

    /**
     * Calls the step function on each SymbolGroup in the list. Handles the requestAnimationFrame call
     * @method step
     * @private
     */
    var step = function step() {
        var i, j, allScratched;

        //Test for the end of the game
        allScratched = true;
        for(i = 0; i < _symbolGroupList.length; i++) {
            _symbolGroupList[i].step();
            if(!_symbolGroupList[i].allScratched()) {
                allScratched = false;
            }
        }
        if(allScratched) {
            if(_autoGameOver && !_gameOverWait) {
                _that.gameOver();
            }
        }

        //Test for wins
        for(i = 0; i < _winningSymbols.length; i++) {
            //Test each winning symbol combination to see if all the symbols are scratched.
            allScratched = _winningSymbols[i].length > 0;
            for(j = 0; j < _winningSymbols[i].length; j++) {
                if(!_winningSymbols[i][j].getScratched()) {
                    //Sequence has already played or not all symbols are scratched
                    allScratched = false;
                    break;
                }
            }
            if(allScratched) {
                //Winning combination is uncovered. Trigger their win animations in the symbolgroups.
                _symbolGroupList.forEach(function(group){
                    group.triggerAnimation({
                        trigger:    pgc.ScratchAnimationTriggers.WIN,
                        symbols:    _winningSymbols[i]
                    });
                });
                _winningSymbols[i] = []; //Empty the array so it won't fire again, but keep the slot so it doesn't screw up the for loop.
            }
        }

        //Animate any extra scenes
        for(i = 0; i < _extraSceneList.length; i++) {
            _extraSceneList[i].update();
        }
        //Remove any scenes scheduled for removal
        for(i = 0; i < _extraSceneRemovalQueue.length; i++) {
            var ind = _extraSceneList.indexOf(_extraSceneRemovalQueue[i]);
            if(ind > -1) {
                _extraSceneList.splice(ind, 1);
            } else {
                throw new Error("attempt to remove extra scene that doesn't exist in the render queue!");
            }
        }
        _extraSceneRemovalQueue = [];

        _requestId = requestAnimationFrame(step);
    };

    /**
     * Treats an array of SymbolGroups as one large group and returns the reference to the symbol that would have the provided index.
     * @method getSymbolRefsFromGroups
     * @param groupArray {Array} An array of SymbolGroups, ordered the same way as they were populated.
     * @param groupSettings {Array} An array of objects containing various settings
     * @param symbolIndex {Number} Index number that the symbol would have if all the symbols were n the same group.
     * @returns {[Symbol]}
     */
    var getSymbolRefsFromGroups = function getSymbolRefsFromGroups(groupArray, groupSettings, symbolIndex) {
        var i, j,
            count = 0,
            symInd = symbolIndex * groupSettings[0].multiSize,
            groupSymbols,
            returnVal = [];
        //We have to go through the symbols individually as we need to take into account multi-symbols and prize symbols
        for(i = 0; i < groupArray.length; i++) {
            //Get a list of the symbols that apply to the given groupSettings
            groupSymbols = groupArray[i].getSymbols(groupSettings[i]);

            //Count through the symbols, ignoring prize symbols
            for(j = 0; j < groupSymbols.length; j++) {
                if(groupSymbols[j].getValue() !== "PRIZE_SYMBOL") {
                    if(count >= symInd) {
                        //This symbol is one that corresponds to the symbolIndex value, so add it to the return object
                        returnVal.push(groupSymbols[j]);
                    }
                    //If we are dealing with multi-symbols, there will be more than one symbol to return.
                    if(returnVal.length === groupSettings[0].multiSize) {
                        //All multi-symbols have been collected, so return
                        return returnVal;
                    }
                    count++;
                }
            }
        }

        //If we get here, no symbol matches this reference
        throw new Error("Attempt to find non-existant symbol!");
    };

    /**
     * Checks a partially populated group for empty positions and returns the first empty index.
     * @method getNextPosition
     * @param group {SymbolGroup}
     * @returns {Number}
     */
    var getNextPosition = function getNextPosition(group) {
        var populated = group.getSymbols().length;
        var groupSize = group.getGroupSize();
        if(populated === groupSize) {
            throw new Error("Attempt to populate group with no free symbol positions!");
        }
        return populated;
    };

    /**
     * Populates a game with new symbol values from the server response
     * @method populate
     * @param config {Object} Game config object to use.
     *      @param config.gameType {ScratchGameTypes}
     *      @param [config.userFoilsGroups] {SymbolGroup} SymbolGroup to populate from the userFoils object
     *      @param [config.playFieldsGroups] {SymbolGroup} SymbolGroup to populate from the playFields object
     *      @param [config.bonusPrizesGroups] {SymbolGroup} SymbolGroup to populate from the bonusPrizes object
     *      @param [config.scardIndex = 0] {Number} Index of the "scards" array to use when populating from the server response
     *      @param [config.gameIndex = 0] {Number} Index of the "game" array to use when populating from the server response
     *      @param [config.userFoils = pgc.Game.Server.Response.scards[config.scardIndex].games[config.gameIndex].userFoils] {Array} Value data {Lucky numbers - format: [...String]). If defined, replaces the server response data with custom data.
     *      @param [config.playFields = pgc.Game.Server.Response.scards[config.scardIndex].games[config.gameIndex].playFields] {Array} Prize and value data (Most symbols - format: [...{value: String, prize: String}]). If defined, replaces the server response data with custom data.
     *      @param [config.bonusPrizes = pgc.Game.Server.Response.scards[config.scardIndex].games[config.gameIndex].bonusPrizes] {Array} Prize data {Bonus zone - format: [...String]). If defined, replaces the server response data with custom data.
     *      @param [config.winningCombinations = pgc.Game.Server.Response.scards[config.scardIndex].games[config.gameIndex].winningCombinations] {Object}. Symbols combinations that constitute a win. If defined, replaces the server response data with custom data.
     *      @param [config.userFoilsSettings] {Array} Settings from last population of this game. used by repopulate.
     *      @param [config.playFieldsSettings] {Array} Settings from last population of this game. used by repopulate.
     *      @param [config.bonusPrizesSettings] {Array} Settings from last population of this game. used by repopulate.
     * @private
     */
    var populate = function populate(config) {
        var i, j, keys,
            formattedPrize,
            symbolSettings = [],
            userFoils,
            playFields,
            bonusPrizes,
            winningCombinatons,
            startingIndex,
            settingSplice,
            newSymbolAmount,
            scardIndex = config.scardIndex || 0,
            gameIndex = config.gameIndex || 0;

        winningCombinatons = config.winningCombinations || pgc.Game.Server.Response.scards[scardIndex].games[gameIndex].winningCombinations || {};

        if(config.userFoilsGroups) {
            //Get the settings for the lucky numbers
            userFoils = config.userFoils ? config.userFoils : pgc.Game.Server.Response.scards[scardIndex].games[gameIndex].userFoils;
            for(i = 0; i < userFoils.length; i++) {
                symbolSettings.push({value: userFoils[i]});
            }
            //apply settings to SymbolGroups
            for(i = 0; i < config.userFoilsGroups.length; i++) {
                //Apply symbol settings to all available positions in the group, then move on to the next group
                if(_symbolGroupList.indexOf(config.userFoilsGroups[i]) < 0) {
                    //This is SymbolGroup hasn't been used yet(for this game), so clear it, populate it from the beginning and add it to the list
                    config.userFoilsGroups[i].clearSymbols();
                    settingSplice = symbolSettings.splice(0, config.userFoilsGroups[i].getGroupSize());
                    newSymbolAmount = config.userFoilsGroups[i].setSymbols(settingSplice);
                    config.userFoilsSettings = [{start: 0, length: newSymbolAmount, multiSize: settingSplice.length > 0 ? String(settingSplice[0].value).split(pgc.ScratchConstants.MULTI_SYMBOL_DELIMITER).length : 1}];
                    _symbolGroupList.push(config.userFoilsGroups[i]);
                } else {
                    //SymbolGroup has already been populated by another game, so only use the remaining positions and don't add it to the list
                    startingIndex = config.userFoilsSettings && config.userFoilsSettings[i] ? config.userFoilsSettings[i].start : getNextPosition(config.userFoilsGroups[i]);
                    settingSplice = symbolSettings.splice(0, config.userFoilsGroups[i].getGroupSize());
                    newSymbolAmount = config.userFoilsGroups[i].setSymbols(settingSplice, startingIndex);
                    config.userFoilsSettings[i] = {start: startingIndex, length: newSymbolAmount, multiSize: settingSplice.length > 0 ? String(settingSplice[0].value).split(pgc.ScratchConstants.MULTI_SYMBOL_DELIMITER).length : 1};
                }
            }
        }
        if(config.playFieldsGroups) {
            //Get the settings for the main game
            playFields = config.playFields ? config.playFields : pgc.Game.Server.Response.scards[scardIndex].games[gameIndex].playFields;
            for(i = 0; i < playFields.length; i++) {
                formattedPrize = pgc.Game.multiCurrencyManager.formatAmount(playFields[i].prize, false, true, 2) + ",-";
                symbolSettings.push({prize: formattedPrize, value: playFields[i].value});
            }

            //apply settings to SymbolGroups
            for(i = 0; i < config.playFieldsGroups.length; i++) {
                //Apply symbol settings to all available positions in the group, then move on to the next group
                if(_symbolGroupList.indexOf(config.playFieldsGroups[i]) < 0) {
                    //This is SymbolGroup hasn't been used yet(for this game), so clear it, populate it from the beginning and add it to the list
                    config.playFieldsGroups[i].clearSymbols();
                    settingSplice = symbolSettings.splice(0, config.playFieldsGroups[i].getGroupSize());
                    newSymbolAmount = config.playFieldsGroups[i].setSymbols(settingSplice);
                    config.playFieldsSettings = [{start: 0, length: newSymbolAmount, multiSize: settingSplice.length > 0 ? String(settingSplice[0].value).split(pgc.ScratchConstants.MULTI_SYMBOL_DELIMITER).length : 1}];
                    _symbolGroupList.push(config.playFieldsGroups[i]);
                } else {
                    //SymbolGroup has already been populated by another game, so only use the remaining positions and don't add it to the list
                    startingIndex = config.playFieldsSettings && config.playFieldsSettings[i] ? config.playFieldsSettings[i].start : getNextPosition(config.playFieldsGroups[i]);
                    settingSplice = symbolSettings.splice(0, config.playFieldsGroups[i].getGroupSize());
                    newSymbolAmount = config.playFieldsGroups[i].setSymbols(settingSplice, startingIndex);
                    config.playFieldsSettings[i] = {start: startingIndex, length: newSymbolAmount, multiSize: settingSplice.length > 0 ? String(settingSplice[0].value).split(pgc.ScratchConstants.MULTI_SYMBOL_DELIMITER).length : 1};
                }
            }

            //Populate winning symbols.
            if(config.gameType === pgc.ScratchGameTypes.LUCKY_NUMBERS) {
                Object.keys(winningCombinatons).forEach(function (key) {
                    var luckyNumber = parseInt(key, 10),
                        luckySymbols,
                        symbols;
                    if (luckyNumber > 0 && !isNaN(luckyNumber)) {
                        //This is a real lucky symbol, not an instant win or something
                        luckySymbols = getSymbolRefsFromGroups(config.userFoilsGroups, config.userFoilsSettings, luckyNumber - 1); //The lucky number key value is the symbol index plus one. TODO: Please stop 1-indexing things.

                        //Create a symbol combination for each matching playFields symbol and the lucky number(s)
                        for (i = 0; i < winningCombinatons[key].positions.length; i++) {
                            symbols = getSymbolRefsFromGroups(config.playFieldsGroups, config.playFieldsSettings, winningCombinatons[key].positions[i]);
                            _winningSymbols.push(luckySymbols.concat(symbols));
                        }
                    }

                });
            } else if(config.gameType === pgc.ScratchGameTypes.MATCH_X) {
                //Create an X-Symbol winning symbol combination for each winningCombination
                Object.keys(winningCombinatons).forEach(function(key) {
                    var symbolSet = [],
                        keyVal = parseInt(key, 10); //Match_X winning combinations *should* always have negative or non-numeric key values, but in some games they don't. I hate the response format....
                    //if(isNaN(keyVal) || keyVal < 0) {
                        for(var i = 0; i < winningCombinatons[key].positions.length; i++) {
                            symbolSet = symbolSet.concat(getSymbolRefsFromGroups(config.playFieldsGroups, config.playFieldsSettings, winningCombinatons[key].positions[i]));
                        }
                        _winningSymbols.push(symbolSet);
                    //}
                });
            } else {
                _winningSymbols = [];
            }
        }
        if(config.bonusPrizesGroups) {
            //Get the settings for the bonus area
            bonusPrizes = config.bonusPrizes ? config.bonusPrizes : pgc.Game.Server.Response.scards[scardIndex].games[gameIndex].bonusPrizes;
            for(i = 0; i < bonusPrizes.length; i++) {
                formattedPrize = pgc.Game.multiCurrencyManager.formatAmount(bonusPrizes[i], false, true, 2) + ",-";
                symbolSettings.push({value: bonusPrizes[i], prize: formattedPrize});
            }
            //apply settings to SymbolGroups
            for(i = 0; i < config.bonusPrizesGroups.length; i++) {
                //Apply symbol settings to all available positions in the group, then move on to the next group
                if(_symbolGroupList.indexOf(config.bonusPrizesGroups[i]) < 0) {
                    //This is SymbolGroup hasn't been used yet(for this game), so clear it, populate it from the beginning and add it to the list
                    config.bonusPrizesGroups[i].clearSymbols();
                    settingSplice = symbolSettings.splice(0, config.bonusPrizesGroups[i].getGroupSize());
                    newSymbolAmount = config.bonusPrizesGroups[i].setSymbols(settingSplice);
                    _symbolGroupList.push(config.bonusPrizesGroups[i]);
                    config.bonusPrizesSettings = [{start: 0, length: newSymbolAmount, multiSize: settingSplice.length > 0 ? String(settingSplice[0].value).split(pgc.ScratchConstants.MULTI_SYMBOL_DELIMITER).length : 1}];
                } else {
                    //SymbolGroup has already been populated by another game, so only use the remaining positions and don't add it to the list
                    startingIndex = config.bonusPrizesSettings && config.bonusPrizesSettings[i] ? config.bonusPrizesSettings[i].start : getNextPosition(config.bonusPrizesGroups[i]);
                    settingSplice = symbolSettings.splice(0, config.bonusPrizesGroups[i].getGroupSize());
                    newSymbolAmount = config.bonusPrizesGroups[i].setSymbols(settingSplice, startingIndex);
                    config.bonusPrizesSettings[i] = {start: startingIndex, length: newSymbolAmount, multiSize: settingSplice > 0 ? String(settingSplice[0].value).split(pgc.ScratchConstants.MULTI_SYMBOL_DELIMITER).length : 1};
                }
            }

            //Populate winning symbols from the bonusPrizes array
            //Create an X-Symbol winning symbol combination for each bonusPrize
            var symbolSet = [];
            for(i = 0; i < bonusPrizes.length; i++) {
                _winningSymbols.push(getSymbolRefsFromGroups(config.bonusPrizesGroups, config.bonusPrizesSettings, i));
            }
        }
    };

    /** event handler function to deal with scratch canvas touch & mouse events
     * @method eventHandler
     * @param {Object} event reference to the calling event
     * @private
     */
    var eventHandler = function eventHandler(event) {
        if(pgc.Game.StateMachine.current !== "InGame") {
            return;
        }

        if(!event){
            event = window.event;
        }

        var loc;
        switch(event.type){
            case "touchstart":
            case "touchmove":
            case "touchend":
                loc = {x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY};
                break;
            case "mousedown":
            case "mousemove":
            case "mouseup":
                loc = {x: event.clientX, y: event.clientY};
                break;
            default:
                return;
        }

        pgc.Game.updateAmbientLastEventTime();
        pgc.Game.idleManager.reset();

        event.preventDefault();
        event.stopPropagation();

        var i, j, dist, points, group, scenePoint;
        switch(event.type) {
            case "touchstart":
            case "mousedown":

                if ( pgc.Game.isAudioEngineDelayedLoad() ) {
                    pgc.Game.preloadAudioMobileFallback();
                }

                _touchStarted = true;
                _touchStartTime = new Date().getTime();
                pgc.Game.idleManager.reset();
                break;
            case "touchmove":
            case "mousemove":
                if(_touchStarted) {
                    points = [loc]; //Make a list of all the points to apply the scratch brush to
                    if(_lastTouch !== null) {
                        //simulate a finger drag from lastTouch to loc by adding some points between
                        dist = CanvasToolkit.pointDistance(_lastTouch, loc);
                        for(i = 0; i < dist; i += SCRATCH_LERP_DIST) {
                            points.push(CanvasToolkit.lerp(_lastTouch, loc, (i / dist)));
                        }
                    }

                    //Draw the brush sprite at all the points in the list
                    for(i = 0; i < points.length; i++) {
                        //Check if the point is within the bounds of a scratch scene
                        for(j = 0; j < pgc.Game.symbolGroupReferences.length; j++) {
                            group = pgc.Game.symbolGroupReferences[j];
                            scenePoint = windowToCanvas(group.getScene().canvas, points[i].x, points[i].y);
                            switch(_brushType) {
                                case pgc.ScratchBrushTypes.WAND:
                                    group.tapReveal(scenePoint.x, scenePoint.y);
                                    break;
                                default:
                                    group.scratch(_brushSprite, scenePoint.x, scenePoint.y);
                                    group.requestDraw();
                            }
                        }
                    }

                    pgc.Game.updateTimeSinceLastScratchEvent();

                    _lastTouch = loc;
                    pgc.Game.idleManager.reset();
                }
                break;
            case "touchend":
            case "mouseup" :
                var now = new Date().getTime();
                if(_touchStarted && (now - _touchStartTime) < _tapTime) {
                    for(j = 0; j < pgc.Game.symbolGroupReferences.length; j++) {
                        group = pgc.Game.symbolGroupReferences[j];
                        scenePoint = windowToCanvas(group.getScene().canvas, loc.x, loc.y);
                        var indexScratched = group.tapReveal(scenePoint.x, scenePoint.y);

                        if ( indexScratched !== null ) {
                            pgc.Game.getAudioEngine().playSound(pgc.Game.ScratchController.skinSelect(pgc.Game.audio.names.main), pgc.Game.ScratchController.skinSelect(pgc.Game.audio.names.instantScratch));
                        }

                    }
                }
                _lastTouch = null;
                _touchStarted = false;
                pgc.Game.idleManager.reset();
                break;
        }
    };
    // ----------------------------------------- //

    // ----------------------------------------- //
    //Public get/set functions
    /**
     * Returns the current texture multiplier value.
     * @method getTextureMultiplier
     * @returns {Number}
     */
    this.getTextureMultiplier = function getTextureMultiplier() {
        return _texMult;
    };

    /**
     * @method getWinningSymbols
     * @returns {Array}
     */
    this.getWinningSymbols = function getWinningSymbols() {
        return _winningSymbols;
    };


    /**
     * Sets the maximum time period between a touchstart/mousedown and a touchend/mouseup event that can be considered a "tap". Increasing the number will increase tap sensitivity.
     * @method setTapTime
     * @param tapTime {Number} Max time period in ms that counts as a "tap"
     * @returns {ScratchController}
     */
    this.setTapTime = function setTapTime(tapTime) {
        _tapTime = tapTime;
        return this;
    };

    /**
     * Sets the sprite used to erase the foil from Symbols during a scratch operation. Brushsprites erase the foil by being drawn to it using the "destination-out" globalCompositeOperation.
     * @param config {Object}
     *      @param config.brushType {ScratchBrushType} The type of brush to set this to
     *      @param [config.brushSprite] {PGCImage} Sprite/image used to erase the foil
     *      @param [config.scaling] {Number} Scratch brush scale. Can be useful if the brush sprite is too small or large, for example in cases where the SymbolGroup is zoomed in.
     * @returns {ScratchController}
     */
    this.setScratchBrush = function setScratchBrush(config) {
        _brushSprite = config.brushSprite;
        _brushType = config.brushType;

        if (config.scaling > 0 && config.scaling !== 1 && config.brushSprite){
            _brushSprite.setScaling(config.scaling);
        }
        return this;
    };

    /**
     * Sets the _autoGameOver internal flag. When this is true, games will end automatically when all symbols are scratched.
     * @method setAutoGameOver
     * @param autoGameOver {Boolean}
     * @returns {ScratchController}
     */
    this.setAutoGameOver = function setAutoGameOver(autoGameOver) {
        _autoGameOver = autoGameOver !== false; //Default to true on bad data input
        return this;
    };

    // ----------------------------------------- //

    // ----------------------------------------- //
    //Public functions
    /** Function that, given an array, returns an item from the array based on the current skin selection OR
     * given a single item, returns that item
     * @method skinSelect
     * @param {Object|Array|Number|string} sourceObj Either an array or a single item
     * @returns {Object} The selected item
     */
    this.skinSelect = function skinSelect(sourceObj) {
        if(typeof sourceObj == "object" && sourceObj.length) {
            var skinIndex = pgc.Game.chosenTheme - 1; //This is 1-indexed for some reason (ask Bence)
            if(sourceObj.length > skinIndex) {
                return sourceObj[skinIndex];
            } else {
                console.error("skinSelect failed on object " + sourceObj);
            }
        } else {
            return sourceObj;
        }
    };

    /**
     * Initialises a new scratch card game, adding the SymbolGroups to the web page, populating them with symbols and adding them to the render and update loops.
     * @method initialiseGame
     * @param config
     *      @param config.gameType {ScratchGameTypes}
     *      @param [config.scardIndex = 0] {Number} Index of the "scards" array that contains this game's response (pgc.Game.Server.Response.scards)
     *      @param [config.gameIndex = 0] {Number} Index of the "games" array that contains this game's response (pgc.Game.Server.Response.scards[scardIndex].games)
     *      @param [config.userFoilsGroups] {SymbolGroup|Array} Reference to the SymbolGroup that is populated by the userFoils (lucky numbers).
     *      @param [config.playFieldsGroups] {SymbolGroup|Array} Reference to the SymbolGroup that is populated by the playFields (main scratch zone).
     *      @param [config.bonusPrizesGroups] {SymbolGroup|Array} Reference to the SymbolGroup that is populated by the bonusPrizes (This only applies to the bonus game in Pengedryss Neon)
     * @returns {Object} The config object
     */
    this.initialiseGame = function initialiseGame(config) {
        //reconfigure the config so all the group parameters are expressed only as Arrays.
        var groups = [],
            winningCombinations,
            cfg = config;
        if(config.userFoilsGroups) {
            cfg.userFoilsGroups = config.userFoilsGroups.length ? config.userFoilsGroups : [config.userFoilsGroups];
            cfg.userFoilsSettings = []; //Used internally - stores various settings to apply to each group
        }
        if(config.playFieldsGroups) {
            cfg.playFieldsGroups = config.playFieldsGroups.length ? config.playFieldsGroups : [config.playFieldsGroups];
            cfg.playFieldsSettings = [];
        }
        if(config.bonusPrizesGroups) {
            cfg.bonusPrizesGroups = config.bonusPrizesGroups.length ? config.bonusPrizesGroups : [config.bonusPrizesGroups];
            cfg.bonusPrizesSettings = [];
        }

        //Add the config to the game list
        config.scardIndex = config.scardIndex || 0;
        config.gameIndex = config.gameIndex || 0;
        if(_gameConfigs.indexOf(config) === -1) {
            //Add the config to the list
            _gameConfigs.push(config);
        }

        return config;
    };

    /**
     * Ends the game. This can be used to end the game when the auto game over option is set.
     * @method gameOver
     * @param [noTrigger = false] {Boolean} Set true to skip triggering the gameover animation sequence
     * @returns {ScratchController}
     */
    this.gameOver = function gameOver(noTrigger) {
        if(!noTrigger) {
            _symbolGroupList.forEach(function (group) {
                group.triggerAnimation({
                    trigger: pgc.ScratchAnimationTriggers.GAMEOVER
                });
            });
        }

        if(!_gameOverWait) {
            setTimeout(function () {
                pgc.Game.StateMachine.summary();
                PGCUniverse.PGCToolkit.resetAnimation("winPopupCoinShower"); //Force a reset here to avoid the frozen coin shower issue
            }, _gameOverWaitTime);
        }
        _gameOverWait = true;

        return this;
    };

    /**
     * Searches the active scratch games for the game with the configuration matching oldConfig, and updates its settings using newConfig.
     * @method modifyGameConfig
     * @param oldConfig {Object} Configuration object for the game you wish to modify. This should be an Object reference that was returned by the initialiseGame function.
     * @param newConfig {Object} Configuration object containing the properties you wish to modify.
     *      @param [newConfig.scardIndex = 0] {Number} Index of the "scards" array that contains this game's response (pgc.Game.Server.Response.scards)
     *      @param [newConfig.gameIndex = 0] {Number} Index of the "games" array that contains this game's response (pgc.Game.Server.Response.scards[scardIndex].games)
     *      @param [newConfig.userFoilsGroups] {SymbolGroup|Array} Reference to the SymbolGroup that is populated by the userFoils (lucky numbers).
     *      @param [newConfig.playFieldsGroups] {SymbolGroup|Array} Reference to the SymbolGroup that is populated by the playFields (main scratch zone).
     *      @param [newConfig.bonusPrizesGroups] {SymbolGroup|Array} Reference to the SymbolGroup that is populated by the bonusPrizes (This only applies to the bonus game in Pengedryss Neon)
     * @returns {Object} The updated gameConfig object
     */
    this.modifyGameConfig = function modifyGameConfig(oldConfig, newConfig) {
        var ind = _gameConfigs.indexOf(oldConfig);
        if(ind < 0) {
            throw new Error ("Attempt to modify non-existant scratch game! Only attempt to modify game configs returned by initialiseGame!");
        }
        _gameConfigs[ind].scardIndex = typeof newConfig.scardIndex !== "undefined" ? newConfig.scardIndex : oldConfig.scardIndex;
        _gameConfigs[ind].gameIndex = typeof newConfig.gameIndex !== "undefined" ? newConfig.gameIndex : oldConfig.gameIndex;
        _gameConfigs[ind].userFoilsGroups = typeof newConfig.userFoilsGroups !== "undefined" ? newConfig.userFoilsGroups : oldConfig.userFoilsGroups;
        _gameConfigs[ind].playFieldsGroups = typeof newConfig.playFieldsGroups !== "undefined" ? newConfig.playFieldsGroups : oldConfig.playFieldsGroups;
        _gameConfigs[ind].bonusPrizesGroups = typeof newConfig.bonusPrizesGroups !== "undefined" ? newConfig.bonusPrizesGroups : oldConfig.bonusPrizesGroups;

        //Return the input config so the reference can be updated
        return _gameConfigs[ind];
    };

    /**
     * Removes all games from the game config list.
     */
    this.clearGameConfigs = function clearGameConfigs() {
        _gameConfigs = [];
    };

    /**
     * Populates all the games with new symbols from the server response
     * @method startNewGame
     */
    this.startNewGame = function startNewGame() {
        //Clear the group list before populating the groups.
        _symbolGroupList = [];
        for(var i = 0; i < _gameConfigs.length; i++) {
            populate(_gameConfigs[i], _winningSymbols[i]);
        }

        //Set the max wait time for the end of the game
        for(i = 0; i < _symbolGroupList.length; i++) {
            _gameOverWaitTime = Math.max(_gameOverWaitTime, _symbolGroupList[i].getMaxAnimationDuration());
            _symbolGroupList[i].render();
        }
        _gameOverWait = false;

        //Start the update loop if required
        if(!_requestId) {
            step();
        }

        //Fire the START animation trigger
        _symbolGroupList.forEach(function (group) {
            group.triggerAnimation({
                trigger: pgc.ScratchAnimationTriggers.START
            });
        });
    };

    this.getGameConfigs = function getGameConfigs() {
        return _gameConfigs.slice();
    };
    
    /**
     * Helper function to partially overwrite a scratchCard's content and/or refresh the scratchcard to its initial state.
     * @method repopulate
     * @param config
     *      @param [config.gameConfig] {Object} The config for the game that you want to repopulate
     *      @param [config.scardIndex] {Number} Scratch Card index to set the game to
     *      @param [config.gameIndex] {Number} Game index to set the game to
     *      @param [config.userFoils] {Array} Value data {Lucky numbers - format: [...String]).
     *      @param [config.playFields] {Array} Prize and value data (Most symbols - format: [...{value: String, prize: String}]).
     *      @param [config.bonusPrizes] {Array} Prize data {Bonus zone - format: [...String]).
     *      @param [config.winningCombinations] {Object}. Symbols combinations that constitute a win.
     * @public
     */
    this.repopulate = function repopulate(config) {
        if (config.gameConfig) {
            //Modify one specific game
            var gc = _gameConfigs.indexOf(config.gameConfig);
            if (gc > -1) {
                //Replace the overwritten elements of the game config object
                _that.modifyGameConfig(_gameConfigs[gc], {
                    scardIndex: config.scardIndex || _gameConfigs[gc].scardIndex,
                    gameIndex: config.gameIndex || _gameConfigs[gc].gameIndex
                });

                populate({
                    userFoilsGroups: _gameConfigs[gc].userFoilsGroups,
                    playFieldsGroups: _gameConfigs[gc].playFieldsGroups,
                    bonusPrizesGroups: _gameConfigs[gc].bonusPrizesGroups,
                    scardIndex: _gameConfigs[gc].scardIndex,
                    gameIndex: _gameConfigs[gc].gameIndex,
                    userFoils: config.userFoils,
                    playFields: config.playFields,
                    bonusPrizes: config.bonusPrizes,
                    winningCombinations: config.winningCombinations,
                    userFoilsSettings: _gameConfigs[gc].userFoilsSettings,
                    playFieldsSettings: _gameConfigs[gc].playFieldsSettings,
                    bonusPrizesSettings: _gameConfigs[gc].bonusPrizesSettings
                });
            }
        } else {
            //Refresh all games
            for(var i = 0; i < _gameConfigs.length; i++) {
                populate(_gameConfigs[i]);
            }
        }
    };

    /**
     * Helper function. Given an array of file names, returns an array of PGCImages to use as scratching masks.
     * @param toolSources {Array} The filenames of the brush masks
     */
    this.createBrushMasks = function createBrushSprites(toolSources) {
        var mask,
            ret = [];
        for(var i = 0; i < toolSources.length; i++) {
            mask = new PGCImage(ip.getPreloadedImage(toolSources[i]));
            if(mask === null) {
                throw new Error("Scratch mask not found: " + toolSources[i]);
            }
            mask.setGlobalCompositeOperation("destination-out");
            mask.anchor = PGCAnchors.CENTRE;
            ret.push(mask);
        }
        return ret;
    };

    /**
     * Adds a PGCScene to the render queue
     * @method addExtraScene
     * @param scene {PGCScene} The scene to add to the render queue
     */
    this.addExtraScene = function addExtraScene(scene) {
        _extraSceneList.push(scene);
        return this;
    };

    /**
     * Removes a PGCScene from the render queue
     * @method removeExtraScene
     * @param scene {PGCScene} The scene to remove from the render queue
     */
    this.removeExtraScene = function removeExtraScene(scene) {
        _extraSceneRemovalQueue.push(scene);
        return this;
    };

    /**
     * Utility function. Takes any config object (text or sprite), makes a copy and returns the copy with the texture multiplier applied to any properties that relate to texture coordinates.
     * @method multiplyConfig
     * @param config {Object}
     * @returns {Object}
     */
    this.multiplyConfig = function multiplyConfig(config) {
        var ret = {},
            texKeys = ["sampleX", "sampleY", "sampleWidth", "sampleHeight", "x", "y", "offsetX", "offsetY", "spriteWidth", "spriteHeight", "spriteX", "spriteY", "shadowOffsetX", "shadowOffsetY", "lineWidth", "maxWidth"]; //Sprite config keys related to textures

        //Cycle through every property in the list
        Object.keys(config).forEach(function(key) {
            if(typeof config[key] === "undefined") {
                return;
            }
            ret[key] = config[key];
            if(texKeys.indexOf(key) > -1) {
                //Key is in the list of texture releated number properties
                ret[key] *= _texMult;
            }
            //Special cases
            if(key === "fontSize") {
                ret[key] = (parseFloat(ret[key]) * _texMult) + ret[key].match(/[^\d\.]*$/)[0];
            }
            if(key === "lineWidths") {
                ret[key] = [];
                config[key].forEach(function(lineWidth) {
                    var rr = (parseFloat(lineWidth) * _texMult) + String(lineWidth).match(/[^\d\.]*$/)[0]; //Sometimes lineWidth is just a number, so cast to string just in case
                    ret[key].push(rr);
                });
            }
            if(key === "frames") {
                ret[key] = [];
                config[key].forEach(function(frame) {
                    var rr = pgc.Game.ScratchController.multiplyConfig(frame);
                    ret[key].push(rr);
                });
            }
        });
        return ret;
    };

    /**
     * Helper function. Creates a PGCSprite to add to any extra scenes, applying the texture multiplier to the input values
     * @method createSprite
     * @param config
     *      @param [config.source] {String|HTMLCanvasElement} The image source
     *      @param [config.x = 0] {Number} Horizontal position of the sprite.
     *      @param [config.y = 0] {Number} Vertical position of the sprite.
     *      @param [config.sampleX = 0] {Number} The image sample's x coordinate
     *      @param [config.sampleY = 0] {Number} The image sample's y coordinate
     *      @param [config.sampleWidth] {Number} Width of the image sample.
     *      @param [config.sampleHeight] {Number} Height of the image sample.
     *      @param [config.frames] {Array} Frame data array with items in the format: [{x: {Number}, y: {Number}, [w: {Number}], [h: {Number}]},...]
     *      @param [config.frameRate = 100] {Number} Frame rate.
     *      @param [config.visible = true] {Boolean} Starting visibility.
     *      @param [config.zIndex = SymbolZIndices.SPRITE] {Number} Z-Index of the sprite on the symbol
     * @returns {PGCSprite}
     */
    this.createSprite = function createSprite(config) {
        var cfg = this.multiplyConfig(config),
            img;

        if(typeof cfg.source === "string") {
            img = ip.getPreloadedImage(cfg.source);
        } else {
            img = cfg.source;
        }

        var spr = new PGCSprite(img, cfg.x, cfg.y, cfg.sampleX, cfg.sampleY, cfg.sampleWidth, cfg.sampleHeight);
        if(cfg.frames) {
            spr.setFrames(cfg.frames, cfg.frameRate);
        }

        spr.visible = cfg.visible;
        spr.zIndex = cfg.zIndex;

        return spr;
    };
    // ----------------------------------------- //

    // ----------------------------------------- //
    //Initialisation

    //Set texture multiplier
    _texMult = getSSMultiplier();

    //Singleton initialiser
    if ( ScratchController.prototype._singletonInstance ) {
        return ScratchController.prototype._singletonInstance;
    }
    ScratchController.prototype._singletonInstance = this;

    //Add the event listeners
    document.addEventListener("touchstart", eventHandler, false);
    document.addEventListener("touchmove", eventHandler, false);
    document.addEventListener("touchend", eventHandler, false);
    document.addEventListener("mousedown", eventHandler, false);
    document.addEventListener("mousemove", eventHandler, false);
    document.addEventListener("mouseup", eventHandler, false);
};