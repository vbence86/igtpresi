/*
.
.
. :::::,                   :?N.                ?8,       8M  +Z7 IM~                                  =$O
. MMMMMMMD                .8MN.                MM.       NM  MM7 $M=  ,NN                             MMO
. MMD   MMO                8MN                 MM            MM7      :MN                             MMO
. MMD   MMZ+MMMMM MMMMMMM  8MMMMMMM   MMMMMM8  MMMMMMMO  MM  MM7 MMZ MMMMMMM NMM   MMD      7MMMMMMM: MMO  MMMMMMM
. MMD   MMZ+MM:  7MM   MMN 8MN   8MM      :MM, MM    MM: MM  MM7 MMZ. ~MN    NMM   MMD      7MM   DMM MMO OMZ  .MM
. MMMMMMMM +MM.  IMM   MMN 8MN   8MM     8MMM, MM.   MM: MM  MM7 MMZ  ~MN    NMM   MMD      7MM   8MM.MMO OMZ
. MMN      +MM.  IMM   MMN 8MN   8MM  =MMMIMM, MM    MM: MM  MM7 MMZ. ~MN    NMM   MMD      7MM   8MM.MMO OMZ
. MMD      +MM.  IMM   MMN 8MN   8MM NMM   MM, MM    MM: MM  MM7 MMZ  ~MN    NMM   MMD      7MM   8MM.MMO OMZ
. MMD      +MM.  IMM   MMN 8MN   8MM MM:   MM, MM    MM: MM  MM7 MMZ. ~MN    NMM   MMD      7MM   8MM.MMO OMZ   $M
. MMD      +MM.  .MMNO8MM= 8MMNODMM+ NMM8OMMM, MMM8ONMM. MM  MM7 MMZ ..MMD8D =MMNODMMD      7MMNZDMMO MMO.,MMNONMM
.                                                                                  MMD      7MM,I7:
.                                                                                  MMD      7MM
.                                                                                  +?+      ~??.

 Probability PLC
 Scratch-O-Matic
 Reshma Pinto, Darren Beukes, Luca Borrione, Bence Varga, Robert Moir, Renjith Abby

 */
/** --------------------------------------------------------------------------------------------------- **/
/** requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel                **/
/** MIT License                                                                                         **/
/** --------------------------------------------------------------------------------------------------- **/
(function() {
    var lastTime = 0;
    var vendors = ['webkit', 'moz'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame =
            window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); },
                timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };

}());

/** --------------------------------------------------------------------------------------------------- **/
/** Element.remove() polyfill                                                                           **/
/** --------------------------------------------------------------------------------------------------- **/
(function() {
    if (!('remove' in Element.prototype)) {
        Element.prototype.remove = function () {
            this.parentNode.removeChild(this);
        };
    }
}());

/** --------------------------------------------------------------------------------------------------- **/
/** --------------------------------------------------------------------------------------------------- **/

// Extending the userAgent object with a function that determines whether the browser is Safari
(function(ua){
    if ("function" !== typeof ua.isSafari){
        ua.isSafari = function(){
            return navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1;
        };
    }
})(window.userAgent);

/** --------------------------------------------------------------------------------------------------- **/

/**
 * Main game logic to collect all the required hooks and callbacks to initialise the game
 *
 * @param  {[object Object]} window    global window object
 * @param  {[object Object]} document  reference to the top-most DOMElement object
 * @param  {[undefined]} undefined [description]
 * @return {none}
 */
(function(toolkit, window, document, undefined){

    // Helper functions and variables
    // DOM grabber
    var $ = toolkit.$,

    // list of cross browser "animationend" eventlisteners
        EVENT_ANIMATIONEND = [
            'animationend',
            'webkitAnimationEnd',
            'oanimationend',
            'mozanimationend',
            'MSanimationend'
        ],

        EVENT_TRANSITIONEND = [
            'webkitTransitionEnd',
            'transitionend',
            'oTransitionEnd',
            'otransitionend',
            'transitionend'
        ],

        isDesktop = function(){
            return "default" === userAgent.OS;
        };

    // this function is being called by the framework after the preloading process has finished
    this.game_main = function(resp){

        /** --------------------------------------------------------------------------------- **/
        /** Check for specific browsers **/
        /** --------------------------------------------------------------------------------- **/
        if(userAgent.isAndroidStockBrowser()) {
            // There is a bug on some versions of the android browser which breaks the rendering on the first canvas added to the page.
            // This can be worked around by adding an invisible, sacrificial canvas to the top of the page
            // (see https://jira.probability.co.uk/browse/SCRAT-569 and others)
            var decoy = document.createElement("canvas"),
                container = document.getElementById("game-scene");
            decoy.width = 10;
            decoy.height  = 10;
            decoy.style.position = "fixed";
            container.insertBefore(decoy, container.childNodes[0]);
            document.body.classList.add("androidStockBrowser");
        }

        if (userAgent.isSafari()) {
            document.body.classList.add("Safari");
        }

        if (userAgent.isChrome() && userAgent.userAgentString.indexOf("SamsungBrowser") === -1) {
            document.body.classList.add("Chrome");
        }
        /** --------------------------------------------------------------------------------- **/

        // Setting up states and event transitions
        // The established StateMachine object is being introduced in the pgc.Game.StateMachine variable
        // @link https://wiki.probability.co.uk/display/DEV/Getting+started+with+pgc.GameStateMachine+library
        pgc.Game.setupGameStateMachine();

        // starting the scratch controller
        pgc.Game.ScratchController = new ScratchController();

        // Initialise the game audio
        pgc.Game.initAudio();

        // calling the game specific business logic if it has been implemented
        pgc.Game.trigger("ready");

        // entering to the Init state
        pgc.Game.StateMachine.init(resp);        
    };


    /** --------------------------------------------------------------------------------------------------- **/
    /** Localisation setup                                                                                  **/
    /** --------------------------------------------------------------------------------------------------- **/
    this.initLocalisation = function(){

        //toolbar
        writeText("bankTitle", "toolbar.bankTitle");
        writeText("betTitle", "toolbar.betTitle");
        writeText("winTitle", "toolbar.winTitle");

        // purchase scene
        writeText("purchase-button-text", "purchase.button.purchase");

        // selection scene
        writeText("selection-title-text", "selection.title");
        
        //main screen
        writeText("scratch-all-button-text", "ingame.button.scratch-all");

    };

    /** --------------------------------------------------------------------------------------------------- **/
    /** Function to switch between Purchase and Game scenes                                                 **/
    /** --------------------------------------------------------------------------------------------------- **/
    this.switchSceneTo = (function() {
        var current;

        return function (sceneId) {
            if (!sceneId) {
                return;
            }

            if (current) {
                $("#" + current).removeClass("shown");
            }
            $("#" + sceneId).addClass("shown");
            current = sceneId;
        };

    })();


    /** --------------------------------------------------------------------------------------------------- **/
    /** --                                          SELECTION FLOW                                          **/
    /** --------------------------------------------------------------------------------------------------- **/
    (function(module){

        var MAX_SKINS = 3,
            selectedClass = "selected",
            unSelectedClass = "unselected",
            blockerClass = "selectionFinished",

            /** --------------------------------------------------------------------------------------------------- **/
            /** Setting up the Purchase scene                                                                       **/
            /** --------------------------------------------------------------------------------------------------- **/
            initPurchaseScene = function(){

                var purchaseCards = document.getElementsByClassName("purchase-card"),
                    selectedSkinId,

                    addClickListenerToPurchaseButton = function(){

                        $("#purchase-button").bind(DOMUtil.touchEvent, function(){
                            $("#purchase-button").addClass("pressed");
                            // @TODO "unresponsible Kjop" button bugfix - find out why that bug occurs and remove this hack
                            if (pgc.Game.StateMachine.current === "Intro" && window.initialise && !window.initialise.hasItBeenCalled){
                                pgc.Game.StateMachine.current = "Purchase";
                            }
                            //selectedSkinId = 2;
                            setChosenSkin(selectedSkinId || getRandomizedChosenTheme());
                            pgc.Game.StateMachine.selection();
                        });

                    },

                    getRandomizedChosenTheme = function(){
                        return Math.floor(Math.random() * MAX_SKINS) + 1;
                    },

                    addClicklistenerToPurchaseCards = function(){
                        for (var i = purchaseCards.length - 1; i >= 0; i--) {
                            // add click listeners for each of the cards
                            purchaseCards[i].addEventListener(DOMUtil.touchEvent, function(){
                                selectPurchaseCard(this);
                                setChosenThemeBySelectedPurchaseCard(this);
                            });
                        }
                    },

                    selectPurchaseCard = function(card){
                        for (var i = purchaseCards.length - 1; i >= 0; i--) {
                            $(purchaseCards[i]).removeClass(selectedClass);
                            $(purchaseCards[i]).addClass(unSelectedClass);
                        }
                        $(card).removeClass(unSelectedClass);
                        $(card).addClass(selectedClass);
                    },

                    setChosenThemeBySelectedPurchaseCard = function(card){
                        if (!card){
                            return;
                        }
                        // storing the chosen theme in the pgc.Game object for further usage
                        var match = /skin\-(\d)/.exec(card.className);
                        if (match && match[1]){
                            selectedSkinId = parseInt(match[1]);
                        }
                    };

                addClickListenerToPurchaseButton();
                // adding listeners to the cards on desktop browsers so that the user can choose between cards
                if ("default" === userAgent.OS && pgc.Game.isOldSelectionFlow()){
                    addClicklistenerToPurchaseCards();
                }

            },


            /** --------------------------------------------------------------------------------------------------- **/
            /** Setting up the Purchase scene                                                                       **/
            /** --------------------------------------------------------------------------------------------------- **/
            initSelectionScene = function(){

                var selectionCards = document.getElementsByClassName("selectionCardContainer"),
                    selectionScene = $("#selection-scene"),
                    selectedSkinId,

                    addClicklistenerToSelectionCards = function(){
                        for (var i = selectionCards.length - 1; i >= 0; i--){
                            selectionCards[i].addEventListener(DOMUtil.touchEvent, function(){
                                handleSelection(this);
                            });
                        }
                    },

                    handleSelection = function(card){
                        if ($(selectionScene).hasClass(blockerClass)){
                            return;
                        }
                        selectSelectionCard(card);
                        setChosenThemeBySelectedSelectionCard(card);
                        playClickSound();
                        enterToIntro();
                    },

                    selectSelectionCard = function(card){
                        $(card).addClass(selectedClass);
                        $(selectionScene).addClass(blockerClass);
                    },

                    setChosenThemeBySelectedSelectionCard = function(card){
                        if (!card){
                            return;
                        }
                        // storing the chosen theme in the pgc.Game object for further usage
                        var selectionCardChild = card.firstChild,
                            match = /skin\-(\d)/.exec(selectionCardChild.className);
                        if (match && match[1]){
                            selectedSkinId = parseInt(match[1]);
                            setChosenSkin(selectedSkinId);
                        }
                    },

                    playClickSound = function(){
                        if ( pgc.Game.isAudioEngineDelayedLoad() ) {
                            pgc.Game.preloadAudioMobileFallback();
                        } else {
                            // @TODO the AudioEngine should handle the exceptions triggered by native code
                            try {
                                pgc.Game.getAudioEngine().playSound(pgc.Game.ScratchController.skinSelect(pgc.Game.audio.names.main), pgc.Game.ScratchController.skinSelect(pgc.Game.audio.names.cardSelection));
                            } catch (ex) {}
                        }
                        pgc.Game.updateAmbientLastEventTime();
                    },

                    enterToIntro = function(){
                        $(document).wait(1000).then(function(){
                            pgc.Game.StateMachine.intro();
                        });                        
                    };

                addClicklistenerToSelectionCards();

            },

            resetSelectionScene = function(){

                var selectionCards = document.getElementsByClassName("selectionCardContainer"),
                    selectionScene = $("#selection-scene"),

                    unselectAllCards = function(){
                        for (var i = selectionCards.length - 1; i >= 0; i--){
                            $(selectionCards[i]).removeClass(selectedClass);
                        }
                    },

                    removeSelectionBlocker = function(){
                        $(selectionScene).removeClass(blockerClass);
                    };

                unselectAllCards();
                removeSelectionBlocker();

            };

        module.initSelectionFlow = function(){
            initPurchaseScene();
            initSelectionScene();
        };

        module.resetSelectionFlow = function(){
            resetSelectionScene();
        };

        module.MAX_SKINS = MAX_SKINS;

    })(window);    

    /** --------------------------------------------------------------------------------------------------- **/
    /** Exposing a function to global scope to set the Chosen skin                                          **/
    /** --------------------------------------------------------------------------------------------------- **/
    this.setChosenSkin = function(chosenSkinId){
        if (!chosenSkinId){
            return;
        }
        pgc.Game.chosenTheme = chosenSkinId > 0 ? chosenSkinId : 1;
        if (pgc.Game.UserData){
            pgc.Game.UserData.setUserData("chosenTheme", chosenSkinId);
        }
        // adding body tag depending on the chosen skin
        for (var i = 0; i < MAX_SKINS; i++){
            $(document.body).removeClass(["Skin-", i + 1].join(""));
        }
        $(document.body).addClass("Skin-" + (chosenSkinId || pgc.Game.chosenTheme));
    };

    /** --------------------------------------------------------------------------------------------------- **/
    /** Initialising UserData (helper for localStorage)                                                     **/
    /** --------------------------------------------------------------------------------------------------- **/
    this.initUserData = function(){
        var userData = new UserData(StorageTypes.LOCAL_STORAGE),
            getUniqueKey = function(key){
                return [pgc.Game.userAppId, "-", pgc.Game.scardId, "_", key].join("");
            };


        userData.setGameSpecificData = function(key, value){
            if (!value || !key){
                return;
            }
            userData.setUserData(getUniqueKey(key), value);
        };

        userData.getGameSpecificData = function(key){
            return userData.getUserData(getUniqueKey(key));
        };

        pgc.Game.UserData = userData;
    };

    /** --------------------------------------------------------------------------------------------------- **/
    /** Loading function for resuming unfinished games                                                      **/
    /** --------------------------------------------------------------------------------------------------- **/
    this.loadUnfinishedGameData = function(){
        for(var i = 0; i < pgc.Game.scratchSceneReferences.length; i++) {
            var data;
            if (!pgc.Game.scratchSceneReferences[i]){
                continue;
            }
            data = pgc.Game.UserData.getGameSpecificData(pgc.Game.scratchSceneReferences[i].id);
            if(data !== null && "function" === typeof pgc.Game.scratchSceneReferences[i].load) {
                pgc.Game.scratchSceneReferences[i].load(data);
            }
        }
    };

    /** --------------------------------------------------------------------------------------------------- **/
    /** Resetting the unfinished game data                                                                  **/
    /** --------------------------------------------------------------------------------------------------- **/
    this.resetSavedGameData = function(){
        for (var i = 0; i < pgc.Game.scratchSceneReferences.length; i++) {
            pgc.Game.UserData.setGameSpecificData(pgc.Game.scratchSceneReferences[i].id, JSON.stringify([]));
        }
    };

    /** --------------------------------------------------------------------------------------------------- **/
    /** Initialising the function for changing the current scratch tool                                     **/
    /** --------------------------------------------------------------------------------------------------- **/
    /**
     * Generating and exposing a function that can set the current scratching tool on the ScratchController
     * @method setScratchToolHandler
     * @param scratchBrushSprites {Array} Array of PGCSprites
     */
    this.setScratchToolHandler = function(scratchBrushSprites){

        var dataKey = "selectedScratchTool",
            // load the save tool ID to set it up accordingly or use the default one
            currentScratchToolId = pgc.Game.UserData.getGameSpecificData(dataKey) || 1,
            toolButton = $("#tool-button"),

            // Building up the required listeners for the ToolButton and determining which should be the default value
            toolItems = $(toolButton).find(".selectableItemsContainer").getElementsByTagName("div"),
            toolSelected = $(toolButton).find(".selectedItem"),
            attrKey = "data-value",
            isMobile = (function(userAgent){
                return userAgent.isIOS() || userAgent.isAndroid() || userAgent.isIEMobile();
            })(window.userAgent);

            var selectScratchToolByElement = function(elm){
                if (!elm){
                    return;
                }

                // removing the current body tag that indicates the selected tool ID
                $(document.body).removeClass("selectedScratchTool-" + pgc.Game.selectedScratchTool);

                // expsoing the selected value for later usage
                pgc.Game.selectedScratchTool = parseInt(elm.getAttribute(attrKey)) || 1;

                // setting the DOM element to reflect the selected tool
                toolSelected.setAttribute(attrKey, pgc.Game.selectedScratchTool);

                // persisting the selected ID
                pgc.Game.UserData.setGameSpecificData(dataKey, pgc.Game.selectedScratchTool);

                // setting up a a body tag that indicates the selected tool's ID
                $(document.body).addClass("selectedScratchTool-" + pgc.Game.selectedScratchTool);

                // resetting the idle timer since it's a kind of a user-interaction 
                if (pgc.Game.idleManager){
                    pgc.Game.idleManager.reset();
                }
            };

            var selectScratchToolById = function(id){
                id = parseInt(id);
                for (var i = toolItems.length - 1; i >= 0; i--) {
                    if (id === parseInt(toolItems[i].getAttribute(attrKey))){
                        selectScratchToolByElement(toolItems[i]);
                        return;
                    }
                }
            };

            var setScratchToolById = function(toolId){

                var sprite, type,
                    // @TODO: setting the default scaling percentage on mobiles should be somewhere 
                    // outside this function, I bealive
                    scaling = isMobile ? 1.75 : 1;

                if (!pgc.Game.ScratchController || !scratchBrushSprites){
                    return;
                }

                toolId = parseInt(toolId) || 1;
                sprite = scratchBrushSprites[toolId - 1];
                type = toolId === 3 ? pgc.ScratchBrushTypes.WAND : pgc.ScratchBrushTypes.SCRATCH;

                pgc.Game.ScratchController.setScratchBrush({
                    brushType: type,
                    brushSprite: sprite,
                    scaling: scaling
                });
                selectScratchToolById(toolId);

            };

        // linking click listeners to the selectable items
        for (var i = toolItems.length - 1; i >= 0; i--){

            if (!toolItems[i]){
                continue;
            }

            // determining if the current element is the default and set the default value accordingly
            if ($(toolItems[i]).hasClass("default")){
                selectScratchToolByElement(toolItems[i]);
            }

            // adding event listeners on click for each of the selectable items
            toolItems[i].addEventListener(DOMUtil.touchEvent, (function(item){
                return function(){
                    selectScratchToolByElement(item);
                    pgc.Game.trigger("scratchtoolchanged", pgc.Game.selectedScratchTool);
                    setScratchToolById(pgc.Game.selectedScratchTool);
                };
            })(toolItems[i]));
        }

        // exposing a function to the global scope to have the ability to change the selected tool from outside
        pgc.Game.setScratchToolById = setScratchToolById;

        // set the current tool which is either the saved or the default one
        setScratchToolById(currentScratchToolId);

    };

    /** --------------------------------------------------------------------------------------------------- **/
    /** Adding event listeners for controls                                                                 **/
    /** --------------------------------------------------------------------------------------------------- **/
    this.addEventListeners = function() {

        var toolButton = document.getElementById("tool-button"),
            toolButtonBox = document.getElementById("tool-button-box"),
            toolButtonMenu = document.getElementById("tool-button-items"),
            scratchAllButton = document.getElementById("scratch-all-button-text");

        // set up event listeners. save here so they can be moved / reused
        this.scratchEventListeners = {

            // Tool Button
            toolButton: function() {
                var button = $(toolButtonBox),
                    buttonBox = $(toolButtonBox),
                    buttonItems = $(toolButtonMenu);
                if (!toolButton){
                    return;
                }
                if (toolButton.hasClass("disabled")){
                    return;
                }
                if (toolButton.hasClass("opened")){
                    toolButton.removeClass("opened");
                    toolButtonBox.removeClass("opened");
                    toolButtonMenu.removeClass("opened");
                } else {
                    toolButton.addClass("opened");
                    toolButtonBox.addClass("opened");
                    toolButtonMenu.addClass("opened");
                }

                pgc.Game.idleManager.reset();
            },

            // Scratch-All button - might be excluded on a game-by-game basis
            scratchAll: function() {
                // the button is not allowed to use in any state, but "InGame"
                if (pgc.Game.StateMachine.current !== "InGame"){
                    return;
                }

                if ($(this).hasClass("disabled")){
                    return;
                }

                //Cycle through all symbols and reveal them
                for (var i = pgc.Game.symbolGroupReferences.length - 1; i >= 0; i--) {
                    pgc.Game.symbolGroupReferences[i].revealAll();
                }

                pgc.Game.updateAmbientLastEventTime();
                pgc.Game.getAudioEngine().playSound(pgc.Game.ScratchController.skinSelect(pgc.Game.audio.names.main), pgc.Game.ScratchController.skinSelect(pgc.Game.audio.names.scratchAll));

                // scratchScenes_Dirty = true;
                pgc.Game.idleManager.reset();
            }

        };

        // add event listeners
        if (toolButton) {
            toolButton.addEventListener( DOMUtil.touchEvent, this.scratchEventListeners.toolButton );
        }
        if (scratchAllButton) {
            scratchAllButton.addEventListener( DOMUtil.touchEvent, this.scratchEventListeners.scratchAll );
        }

        // setting up a listener to check if the last animation for the intro has been finished
        listenToLastAnimation();

        //setting up Popups handlers
        ["nowin-popup", "win-popup", "bigwin-popup", "bonuswin-popup"].forEach(function(popupId){

            if (!document.getElementById(popupId)){
                return;
            }

            PopupHelper
                .addPopupButtonListener(popupId)
                .press(function(){
                    // we need to indicate that the user has pressed the OK button in order to
                    // hold up getting back to the buy screen until the "finish" message has been processed
                    pgc.Game.EndGamePopupConfirmed = true;
                    pgc.Game.StateMachine.finish();
                })
                .onHideAnimationEnd(function(){
                    pgc.Game.StateMachine.finish();
                });

        });

        PopupHelper
            .addPopupButtonListener("popup-scene-container")
            .click(function(){
                pgc.Game.StateMachine.inGame();
            });

    };


    /** --------------------------------------------------------------------------------------------------- **/
    /** Checking if the last animation for the intro has been finished                                      **/
    /** --------------------------------------------------------------------------------------------------- **/
    this.listenToLastAnimation = function(){
        /**
         * If there are no intro popups you can make any one animated element a member of the last-
         * intro-animation class
         */
        var temp = $(".last-intro-animation");
        if(temp !== null) {
            for (var i = EVENT_ANIMATIONEND.length - 1; i >= 0; i--) {
                temp.unbind(EVENT_ANIMATIONEND[i]);
            }
            temp.bind(EVENT_ANIMATIONEND, function(evt) {
                var event = evt || window.event;
                if(this.id == event.target.id){
                    if (pgc.Game.StateMachine.current !== "InGame"){
                        pgc.Game.StateMachine.inGame();
                    }
                }
                // invoking all the registered callbacks for this event
                pgc.Game.trigger("lastintroanimation", evt);
            });
        }
    };

    /** --------------------------------------------------------------------------------------------------- **/
    /** Popup helper object                                                                                 **/
    /** provides unified function to register callbacks on the ingame popups                                **/
    /** --------------------------------------------------------------------------------------------------- **/
    this.PopupHelper = (function(toolkit){

        var $ = toolkit.$,

            // key value set to store all the generated popup helper objects
            popups = {},

            // -- Added this parameter to keep the scene faded even after the popup is closed
            sceneFaderOn = false;

        return {

            addPopupButtonListener: function(popupId){
                var popupContainer = $("#" + popupId),
                    fader = $("#sceneFader"),
                    okButton = popupContainer && $(popupContainer).find('.okButton'),
                    mainbar = $(".main-game-bar"),
                    visible = false,

                    events = new toolkit.EventDispatcher(),

                    // showing the popup
                    show = function(keepSceneFaded){
                        var fader = $("#sceneFader"),
                            mainbar = $(".main-game-bar");

                        sceneFaderOn = keepSceneFaded || false;

                        visible = true;

                        $(popupContainer).addClass("shown");


                         if (fader){
                            fader.addClass("shown");
                            if(mainbar) {
                                mainbar.addClass("hideBehindFader");
                            }
                         }

                    },

                    // making the popup disappear gracefully
                    hide = function(callback, forceHide){

                        if (!visible){
                            return;
                        }

                        /* [NOTE] : shown class defines a transition on opacity.
                        * It conflicts with the simplaefade out animation hence modified it to
                        * be set to visibility : hidden at end of animation */
                        $(popupContainer)
                            .addClass("simpleFadeOut")
                            .bind(EVENT_ANIMATIONEND, function(){

                                // the object can have multiple animations thus we remove this callback straightaway
                                for (var key in EVENT_ANIMATIONEND){
                                    $(popupContainer).unbind(EVENT_ANIMATIONEND[key]);
                                }

                                $(popupContainer).removeClass("shown");

                                visible = false;

                                /* ==  IN Summary state we want the game stays faded out, hence introduced a new flag to manage this === */
                                if (fader && (!sceneFaderOn || forceHide)){
                                    fader.removeClass("shown");
                                }
                                if(mainbar) {
                                    mainbar.removeClass("hideBehindFader");
                                }

                                if (okButton){
                                    okButton.removeClass("pressed");
                                }

                                if ("function" === typeof callback){
                                    callback();
                                }

                                // ADDING THE REMOVE CLASS IN HERE INSTEAD OF IN THE SHOW FUNCTION, as prev caused Issue on SAFARI in WINDOWS OS. TICKET: SCRAT-938
                                $(popupContainer).removeClass("simpleFadeOut");

                                events.dispatch("hideAnimationEnd");

                            });
                    },

                    popup = {
                        // exposing a function for adding business logic to the OK button
                        click: function(callback){
                            if (!okButton){
                                return this;
                            }
                            okButton.bind(DOMUtil.touchEvent, function(){

                                // hiding the popup and invoking the passed callback
                                hide(callback);

                                // playing sound for clicking the ok button
                                pgc.Game.getAudioEngine().playSound(pgc.Game.ScratchController.skinSelect(pgc.Game.audio.names.main), pgc.Game.ScratchController.skinSelect(pgc.Game.audio.names.control), function(){
                                    // playing sound for closing the popup once playing the click sound has finished
                                    pgc.Game.getAudioEngine().playSound(pgc.Game.ScratchController.skinSelect(pgc.Game.audio.names.main), pgc.Game.ScratchController.skinSelect(pgc.Game.audio.names.close));
                                });

                            });

                            return this;
                        },

                        // the "press" event merely applies the "pressed" class on the corresponding button element
                        press: function(callback){
                            if (!okButton){
                                return this;
                            }
                            okButton.bind(DOMUtil.touchEvent, function(){

                                okButton.addClass("pressed");

                                if ("function" === typeof callback){
                                    // passing 'this' as a reference to the popup helper object
                                    callback(this);

                                }

                                // playing sound for clicking the ok button
                                pgc.Game.getAudioEngine().playSound(pgc.Game.ScratchController.skinSelect(pgc.Game.audio.names.main), pgc.Game.ScratchController.skinSelect(pgc.Game.audio.names.control), function(){
                                    // playing sound for closing the popup once playing the click sound has finished
                                    pgc.Game.getAudioEngine().playSound(pgc.Game.ScratchController.skinSelect(pgc.Game.audio.names.main), pgc.Game.ScratchController.skinSelect(pgc.Game.audio.names.close));
                                });

                            });
                            return this;
                        },

                        // onHideAnimationEnd event is triggered when hiding the popup has been finished off
                        onHideAnimationEnd: function(callback){
                            events.addEventListener("hideAnimationEnd", callback);
                            return this;
                        },

                        // exposing the hide function as it's required to be used from outside
                        hide: function(callback, forceHide){
                            hide(callback, forceHide);
                            return this;
                        },

                        // exposing the show function as it's required to be used from outside
                        show: function(keepSceneFaded){
                            show(keepSceneFaded);
                            return this;
                        },

                        isShown: function(){
                            return !!visible;
                        }

                    };

                // saving the reference to the newly created helper popup
                popups[popupId] = popup;

                return popup;

            },
            /* == Added this if we need to disable the fader later on === */
            hideSceneFader : function(){
                var fader = $("#sceneFader");
                if (fader){
                    fader.removeClass("shown");
                }
            },

            showPopup: function(popupId, keepSceneFaded){
                var popup = popups[popupId];

                if (!popup){
                    return;
                }
                $("body").addClass("onPopUp");
                popup.show(keepSceneFaded);
            },

            hidePopup: function(popupId, forceHide){
                var popup = popups[popupId];

                if (!popup){
                    return;
                }
                $("body").removeClass("onPopUp");
                popup.hide(null, forceHide);
            },

            hideAll: function(forceHide){
                if (!popups){
                    return;
                }
                for (var i in popups){
                    if (!popups[i] || "function" !== typeof popups[i].hide){
                        continue;
                    }
                    popups[i].hide(null, forceHide);
                }
                $("body").removeClass("onPopUp");
            },

            isAllHidden: function(){
                if (!popups){
                    return true;
                }
                for (var i in popups){
                    if (popups[i] && "function" === typeof popups[i].isShown && popups[i].isShown()){
                        return false;
                    }
                }
                return true;
            }

        };

    })(toolkit);

    /** --------------------------------------------------------------------------------------------------- **/
    /** Determine if there is any kind of winning-combination on the scratch-card                           **/
    /** --------------------------------------------------------------------------------------------------- **/
    this.hasInstantWin = function(scratchZone){
        return getInstantWinAmount(scratchZone) > 0;
    };

   this.getInstantWinAmount = function(scratchZone){
        var winningCombinations = scratchZone.winningCombinations;
        return winningCombinations && winningCombinations["-1"] && parseInt(winningCombinations["-1"].winAmount) || 0;
    };

    this.hasWin = function(scratchZone){
        var winningCombinations = scratchZone.winningCombinations;
        return winningCombinations && Object.keys(winningCombinations).length;
    };

    this.hasBigWin = function(response){
        return (pgc.Game.isBigWin && pgc.Game.isBigWin == "true");
    };

    /** --------------------------------------------------------------------------------------------------- **/
    /** Adding a helper function that forces the canvas attached to a SratchScene to get refreshed          **/
    /** --------------------------------------------------------------------------------------------------- **/
    this.refreshScratchSceneHack = function(scratchScene){
        if (!scratchScene){
            return;
        }
        var scenes = Array.prototype.concat.call(scratchScene);
        scenes.forEach(function(scene){
            scene.context.clearRect(0, 0, 1, 1);
        });
    };

    /** --------------------------------------------------------------------------------------------------- **/
    /** Subscribing commonly used callbacks to idle                                                         **/
    /** --------------------------------------------------------------------------------------------------- **/
    (function(){
        pgc.Game.idle(function(){
            var wrapper = $(".scratchAllButtonWrapper");
            if (wrapper) {
                wrapper.animateOnce("Idle");
            }
        }, 5000);
    })();

    /** --------------------------------------------------------------------------------------------------- **/
    /** Subscribing commonly used callbacks to heartbeating                                                 **/
    /** --------------------------------------------------------------------------------------------------- **/
    (function(showHeartbeat){
        // allow the visualisation of the heartbeat
        if (!showHeartbeat){
            return;
        }
        // Adding visual representation for the heartbeat for testing purposes
        pgc.Game.heartbeat(function(){
            var body = $(document.body),
                heartbeatClass = "Heartbeat";

            body.addClass(heartbeatClass)
                .wait(1000)
                .then(function(){
                    body.removeClass(heartbeatClass);
                });
        }, 5000);
    })(__visualiseHeartbeat === "true");    

    /** --------------------------------------------------------------------------------------------------- **/
    /** adding BODY TAGS                                                                                    **/
    /** --------------------------------------------------------------------------------------------------- **/
    (function(toolkit){
        function inIframe () {
            try {
                return window.self !== window.top;
            } catch (e) {
                return true;
            }
        }

        function isSonyXperiaZ(){
            return new RegExp(/C6603/).test(userAgent.userAgentString);
        }

        function isIE11(){
            var trident = !!navigator.userAgent.match(/Trident\/7\.0/),
                net = !!navigator.userAgent.match(/.NET4\.0E/),
                version = !!navigator.userAgent.match(/.rv\:11/);
            return trident && (net || version);
        }

        function isWindows81(){
            return userAgent.userAgentString.match(/Windows NT 6\.3/);
        }

        if (inIframe()){
            toolkit.$(document.body).addClass("IFrame");
        }

        if(isDesktop()){
            toolkit.$(document.body).addClass("Desktop");
        }

        if (isSonyXperiaZ()) {
            toolkit.$(document.body).addClass("SonyXperiaZ");
        }

        if (userAgent.isIPhone()) {
            toolkit.$(document.body).addClass("iPhone");
        }

        if (isIE11()){
            toolkit.$(document.body).addClass("IE11");
        }

        if (isWindows81()){
            toolkit.$(document.body).addClass("Windows81");   
        }

        if(userAgent.isChrome() && !userAgent.isDesktop() && userAgent.isAndroid()){
            toolkit.$(document.body).addClass("ChromeAndroid");
        }

    })(toolkit);

    //-- Adding the client config for setting the timeout
    if(window.touchCasinoBrandConf && window.touchCasinoBrandConf.clientTimeout){
        pgc.Game.clientOptions = {
            clientTimeout : touchCasinoBrandConf.clientTimeout
         };
    }

})(PGCUniverse.PGCToolkit, window, window.document);

/** wrapper function to put text in an element using the i18n utilities
 * @param {String} elemName DOM element to add text to
 * @param {String} stringName localised string key
 * @param {String} defaultString default string to use if no localised string is available
 * @param {String} surroundWithSpaces flag to wrap the string with &nbsp; characters
 */
function writeText(elemName, stringName, defaultString, surroundWithSpaces) {
    var str;
//    console.debug(stringName);
    if(document.getElementById(elemName) !== null) {
        if(defaultString !== undefined && defaultString.length > 0)
        {
            str = getLocalisedStringWithDefaultText(stringName, defaultString);
        }
        else if(stringName.length > 0) {
            str = getLocalisedString(stringName);
        }
        if (surroundWithSpaces){
            str = ["&nbsp;", str, "&nbsp;"].join('');
        }
        document.getElementById(elemName).innerHTML = str;
    }
}

/** --------------------------------------------------------------------------------------------------- **/
/** updates the win popup winning-combinations-table                                                    **/
/** --------------------------------------------------------------------------------------------------- **/
var WinPopupTable = PGCClass.extend({
	init : function(){
		this.$ = PGCUniverse.PGCToolkit.$;
	},

	createRow: function(columns){
		var column, row, i, l, p;

		if (!columns){
			return;
		}

		row = document.createElement("div");
		row.setAttribute("class", "wintable-row");

		for (i = 0, l = columns.length; i < l; i++) {

			column = document.createElement("div");
			column.setAttribute("class", "wintable-column");

			p = document.createElement("p");

			//-- Commented the use of createTextNode, as this would not parse the &pound; sign
	//                  p.appendChild(document.createTextNode(columns[i]));
			p.innerHTML = columns[i];

			column.appendChild(p);
			row.appendChild(column);

		}
		return row;
	},

	createContent: function(scratchZone, _currencyManager){

		// currency manager
		var currencyManager = _currencyManager || pgc.Game.multiCurrenctManager,

		// datas from the server
			userFoils = scratchZone.userFoils,
			winningCombinations = scratchZone.winningCombinations,
			playFields = scratchZone.playFields,
			totalWin = scratchZone.totalWin,

		// Total win amount


		// helper variables
			key;

		if (!scratchZone || !userFoils || !winningCombinations || !playFields){
			throw "Invalid object has been passed to update the WinPopup!";
		}
		var winPopupWinTableContainer = this.$("#win-popup-wintable-container");

		while(winPopupWinTableContainer.firstChild){
			winPopupWinTableContainer.removeChild(winPopupWinTableContainer.firstChild);
		}

		for (key in winningCombinations){

			// here we have to deal with the normal winning combinations only
			// -1 means
			if (isNaN(parseInt(key)) || key <= 0){
				continue;
			}

			var columns = [
				userFoils[parseInt(key) - 1],
				currencyManager.formatAmount(winningCombinations[key].winAmount, false, true, 2) + ",-"
			];

			winPopupWinTableContainer.appendChild(this.createRow(columns));
		}

		// Total row
		var totalWinAmount = currencyManager.formatAmount(totalWin, false, true, 2) + ",-";
		totalRow = this.createRow([getLocalisedString("ingame.popup.total.text"), totalWinAmount]);

		winPopupWinTableContainer.appendChild(totalRow);
	}
});