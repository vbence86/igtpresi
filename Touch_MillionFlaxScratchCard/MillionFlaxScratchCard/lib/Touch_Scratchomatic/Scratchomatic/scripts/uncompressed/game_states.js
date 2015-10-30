// Re-initialise the required namespace objects if they aren't introduced in the global scope
pgc = window.pgc || {};
// Game object that describes the used events and states
pgc.Game = pgc.Game || {};

/** --------------------------------------------------------------------------------------------------- **/
/** Establishing the required states, events and transaction for the game loop                          **/
/** --------------------------------------------------------------------------------------------------- **/

/**
 * Defining the default game states and events
 * @param  {object} game    pgc.Game - namespace for the game
 * @param  {object} toolkit PGCUniverse.PGCToolkit - Toolkit for mostly DOM manipulating
 * @return {void}
 */
(function(game, toolkit){

    var $ = toolkit.$,

        events = {},
        states = {},

        SAVED_STATE_FIELD = gameName+"-currentState",

        // checking if the Heartbeat is enabled using the merchant configuration
        heartbeatEnabled = window.touchCasinoBrandConf && window.touchCasinoBrandConf.enableHeartbeat || false,

        // helper function to store reference for the old function and make it available to
        // get invoked in the new function by using the this.deafult() signature
        defaultify = function(old, callback){
            var isFunc = function(func){
                    return "function" === typeof func;
                },
                handler = {
                    default: function(){
                        if (isFunc(old)){
                            return old.apply(null, Array.prototype.slice(arguments));
                        }
                    }
                };
            return function(){
                var args = Array.prototype.slice.call(arguments);
                if (isFunc(callback)){
                    return callback.apply(handler, args);
                }
            };
        },

        startOrResumeGame = function(){
            // triggering the initialisations (implementation can be found in main.js)
            if (window.initialise){
                if (!initialise.itHasBeenCalled){

                    initialise(game.ScratchZone);
                    initialise.itHasBeenCalled = true;

                } else {

                    // reseting the animationEnd listeners in case some inGame interaction has removed them.
                    listenToLastAnimation();
                    pgc.Game.ScratchController.startNewGame();

                }
            }

            // stopping the heartbeating from being sent during the gameplay
            stopHeartbeating();

            game.updateBank(game.Server.Response.bank);
            game.updatePriceLabel(game.price);

            $(document.body).addClass("gameStarted");
            switchSceneTo('game-scene');

        },

        startHeartbeating = function(){
            if (!heartbeatEnabled){
                return;
            }
            game.heartbeatManager.start();
        },

        stopHeartbeating = function(){
            if (!heartbeatEnabled){
                return;
            }
            game.heartbeatManager.stop();
        },

        playIntroSound = function(callback){

            var introSoundName = pgc.Game.ScratchController.skinSelect(pgc.Game.audio.names.intro),
                mainSprite;

            // for the intro animation sound
            if (game.getAudioEngine() && game.getAudioEngine().version > 1) {

                mainSprite = game.getAudioEngine().getAudioSprite(pgc.Game.ScratchController.skinSelect(pgc.Game.audio.names.main));

                // determine if there are multiple intro sounds for the different themes
                if (mainSprite && !mainSprite.hasTrack(introSoundName)){
                    introSoundName += ["-", game.chosenTheme].join("");
                }

                // If the intro track isn't available we will not invoke the timeout as the ambient sound 
                // should be triggered only when the intro finishes 
                if (mainSprite && !mainSprite.hasTrack(introSoundName)){
                    return;
                }

                // The fallback won't allow playback of multiple sounds so let's skip the intro sound if we know WebAudioAPI is not present
                setTimeout(function() {
                    game.getAudioEngine().playSound(pgc.Game.ScratchController.skinSelect(pgc.Game.audio.names.main), introSoundName, function() {
                        if ("function" !== typeof callback){
                            return;
                        }
                        callback();
                    });
                }, 500);

            }
        },

        playAmbientSound = function(){
            game.playAmbientSound();
        };

    /** --------------------------------------------------------------- **/
    /** STATES                                                          **/
    /** --------------------------------------------------------------- **/

    // essential initialisation
    states.Init = {

        enter: function(event, from, to, args){

            // obtaining the first object from the args parameter either it's an array or an object
            var responseObject = args || {};
            game.Client.processResponse(responseObject);

            initUserData();
            initLocalisation();
            initSelectionFlow();

            var helpButton = $("#help-button-wrapper");
            helpButton.addEventListener(DOMUtil.touchEvent, function() {
                if ($("#help-button").hasClass("disabled")){
                    return;
                }
                pgc.Game.StateMachine.loadinfo();
            });

            // start the heartbeating
            startHeartbeating();

            game.updateBank(game.Server.Response.bank);
        },
        leave: function(){
            // ...
        }

    };

    // Required reinitialisation logic
    states.Reset = {

        enter: function(){
            // ...
        },
        leave: function(){
            // ...
        }

    };

    states.Unfinished = {

        enter: function(){

            var storedChosenTheme = game.UserData && parseInt(game.UserData.getUserData("chosenTheme")) || 1;

            $(document.body).addClass("NoIntroAnimations");

            setChosenSkin(storedChosenTheme);

            game.StateMachine.inGame();

        },
        leave: function(){

            startOrResumeGame();
            loadUnfinishedGameData();

            // waiting for a while to hold up playing the ambience music so that the initial noises 
            // can be played through when it comes to an unfinieshed game
            setTimeout(function(){
                if (pgc.Game.audio && pgc.Game.audio.audioEnabled){
                    playAmbientSound();
                }
            }, 3000);

        }

    };

    // Selecting and purchasing the desired scratch card
    states.Purchase = {

        enter: function(){

            var dots = "",
                spaces = "   ";
            var checkTicketPrice = function () {
                var ticketPrice = $('#purchase-ticket-price');
                if(pgc.Game.Server && pgc.Game.Server.Response.price){
                    ticketPrice.innerHTML = "<p>"+pgc.Game.multiCurrencyManager.formatAmount(pgc.Game.Server.Response.price,false,true,1)+",-</p>";
                } else {
                    dots += ".";
                    spaces = spaces.substr(0, spaces.length - 1);
                    if(dots === "....") {
                        dots = "";
                        spaces = "   ";
                    }
                    ticketPrice.innerHTML = "<p>"+spaces+dots+",-</p>";
                    setTimeout(checkTicketPrice, 1000);
                }
            };
            checkTicketPrice();

            game.updateBank(game.Server.Response.bank);
            // showing the skin selection scene
            switchSceneTo('purchase-scene');

            // removing the dedicated BODY TAG so that we could restart the intro sequence if it's required
            $("body").removeClass("gameStarted");

            // removeing the NoIntroAnimations body tag as this point we can make sure that
            // this isn't an unfinished game
            $(document.body).removeClass("NoIntroAnimations");

            var fader = $("#sceneFader"),
                mainbar = $(".main-game-bar");
            if(fader){
                fader.removeClass("shown");
                if(mainbar) {
                    mainbar.removeClass("hideBehindFader");
                }
            }
        },
        leave: function(event, from, to, args){

            if ("Info" !== to){

                if ( pgc.Game.isAudioEngineDelayedLoad() ) {
                    pgc.Game.preloadAudioMobileFallback();
                } else {
                    // @TODO the AudioEngine should handle the exceptions triggered by native code
                    try {
                        pgc.Game.getAudioEngine().playSound(pgc.Game.ScratchController.skinSelect(pgc.Game.audio.names.main), pgc.Game.ScratchController.skinSelect(pgc.Game.audio.names.buy));
                    } catch (ex) {
                        // just absorbing the exception ...
                    }
                }

                pgc.Game.updateAmbientLastEventTime();

            }

            // we can leave the purchase screen for the info page therefore we have to 
            // limit this logic only for the selection
            if(to == "Selection" || to == "Intro"){
                game.Client.sendBuyMessage(function(){
                    game.updateBank(game.Server.Response.bank);
                    game.StateMachine.transition();
                });
                return StateMachine.ASYNC;
            }
        }

    };

    // Showing the selection page on desktops and handling with the selection flow
    states.Selection = {

        enter: function(){
            // showing the skin selection scene
            switchSceneTo('selection-scene');
        },

        leave: function(){
            resetSelectionFlow();
            pgc.Game.updateAmbientLastEventTime();            
        }
    };

    // Showing the game scene and starting the intro sequence
    states.Intro = {

        enter: function(){

            startOrResumeGame();
            playIntroSound(function(){
                playAmbientSound();
            });

        },
        leave: function(){
            // ...
        }

    };

    // Default state during play
    states.InGame = {

        enter: function(){
            var mainbar = $(".main-game-bar");
            if($("#purchase-button")){
                $("#purchase-button").removeClass("pressed");
            }

            if(mainbar){
                mainbar.removeClass("hideBehindFader");
            }
            game.idleManager.listen();

            game.updateBank(game.Server.Response.bank);
        },
        leave: function(event, from, to){
            game.idleManager.stop();
        }

    };

    // All the scratch zones have been revealed
    states.Summary = {

        enter: function(){
            
            // sending the "finish" message and registering the showing of the popup 
            // when the request has been processed
            setTimeout(function(){

                if (hasWin(game.ScratchZone) && !hasInstantWin(game.ScratchZone)){
                    // showing and updating the win texts on the regular win popup

                    pgc.Game.getAudioEngine().playSound(pgc.Game.ScratchController.skinSelect(pgc.Game.audio.names.main), pgc.Game.ScratchController.skinSelect(pgc.Game.audio.names.win));

                    var updateWinPopupTable = new WinPopupTable();
                    updateWinPopupTable.createContent(game.ScratchZone, game.multiCurrencyManager);
                    PopupHelper.showPopup("win-popup",true);
                } else if(hasInstantWin(game.ScratchZone)) {
                    //clover win
                    PopupHelper.showPopup("bonuswin-popup",true);
                } else {
                    //no win
                    PopupHelper.showPopup("nowin-popup",true);
                }

            }, 2000);

        },
        leave: function(){
            if(game.particleSystem) {
                game.particleSystem.reset();
            }

            game.fadeAmbientSound(5); //TODO: this takes less than 5s, I need to fix the function
        }

    };

    // All the scratch zones have been revealed
    states.GameFinished = {

        enter: function(){

            game.EndGamePopupConfirmed = false;
            resetSavedGameData();
            game.StateMachine.init();

        },
        leave: function(){
            // ...
        }

    };

    // All the scratch zones have been revealed
    states.Info = {

        enter: function(){
            var chosentheme = game.chosenTheme || 1;
            setChosenSkin(chosentheme);
            // loading the info scene
            switchSceneTo('info-scene');

        },
        leave: function(){
            // ...
        }

    };

    /** --------------------------------------------------------------- **/
    /** EVENTS and TRANSACTIONS                                         **/
    /** --------------------------------------------------------------- **/
    // As following a proposed naming convention, the events should be
    // called after the state which the flow enters

    events.init = {

        from: ["none", "GameFinished", "result"],
        to: ["Init", "Reset"],
        before: function(){
            // ...
        },
        after: function(){

            // determining if whether is an unfinished game or not
            if (game.Server.Response.gameState == "result"){
                // if the last saved state was the selection then we have to push the game back to that state
                if (game.UserData.getUserData(SAVED_STATE_FIELD) === "Selection"){
                    game.StateMachine.selection();
                } else {
                    game.StateMachine.unfinished();
                }
            } else {
                game.StateMachine.purchase();
            }

        }

    };

    events.purchase = {

        from: ["none", "GameFinished", "Init", "Reset"],
        to: "Purchase",
        before: function(){
            // ...
        },
        after: function(){
            // ...
        }

    };

    events.selection = {

        from: ["Purchase", "Info", "Init"],
        to: "Selection",
        before: function(){
            // if the selection scene isn't supported according the curcumstences we simply skip it
            // by going to the Intro state right away
            if (!game.hasSelectionScene()){
                game.StateMachine.intro();
                // StateMachine needs to terminate the original flow as we skip the Selection state
                return false;
            }
        },
        after: function(){
            // ...
        }

    };    

    events.intro = {

        from: ["Purchase", "Selection"],
        to: "Intro",
        before: function(){
            // ...
        },
        after: function(){
            // ...
        }

    };

    events.unfinished = {

        from: ["Init"],
        to: "Unfinished",
        before: function(){
            // ...
        },
        after: function(){
            // ...
        }

    };    

    events.inGame = {

        from: ["Intro", "Unfinished", "Summary"],
        to: "InGame",
        before: function(){
            // ...
        },
        after: function(){
            // ...
        }

    };

    events.summary = {

        from: ["InGame"],
        to: "Summary",
        before: function(){

            game.Client.sendFinishMessage(function(){
                // invoking the finish event after the request has been processed
                game.StateMachine.finish();
                // restarting to hit the server with the heartbeat messages
                startHeartbeating();
            });

        },
        after: function(){
            // ...
        }

    };

    events.finish = {

        from: ["Summary"],
        to: "GameFinished",
        before: function(){

            if (game.Client.isFinishMessageProcessed() && game.EndGamePopupConfirmed){
                if (!PopupHelper.isAllHidden()){
                    PopupHelper.hideAll();
                    return false;
                }
            } else {
                return false;
            }
            
        },
        after: function(){
            // ...
        }

    };

    //paytable Decorator is used to create dom element for each paytable line.
    game.paytableDecorator = function(prize, payouts){
        var payoutItem = document.createElement("div");
        var prizeName = document.createElement("div");
        prizeName.innerHTML = prize;
        prizeName.className = "prize-name";

        var value = document.createElement("div");
        value.innerHTML =  "1:"+payouts[prize];
        value.className = "prize-desc";
        payoutItem.className = "payoutItem";
        payoutItem.appendChild(prizeName);
        payoutItem.appendChild(value);

        return payoutItem;

        //payoutTable.appendChild(payoutItem);
    };

    events.loadinfo = {

        from: ["Purchase","Selection","InGame"],
        to: "Info",
        before: function(){


            // markup templates
            var templates = {
                // Add key-value pairs for defining new templates
                "{symbol:w}": "<span class=\"symbol WildSymbol\"></span>",
                "{symbol:x}": "<span class=\"symbol WildSymbol2\"></span>",
                "{symbol:y}": "<span class=\"symbol WildSymbol3\"></span>"
            };

            writeText("infoPageTitle","info.page.title","Informajosn");
            writeText("howToPlayItemTitle","info.howtoplay.title","Slik spiller du");
            writeText("paytableItemTitle","info.paytable.title","Premieoversikt");

            var howToPlayContent,
                howToPlayTop,
                howToPlayBottom,
                howToPlayTitle = getLocalisedStringWithDefaultText("info.howtoscratch.title");

            // desktop
            if ("default" === userAgent.OS){
                howToPlayTop = getLocalisedStringWithDefaultText("info.howtoplay.top.desktop") || getLocalisedStringWithDefaultText("info.howtoplay.top");
                howToPlayBottom = getLocalisedStringWithDefaultText("info.howtoplay.bottom.desktop");
                howToPlayContent = howToPlayTop + "<h1 id='paytable-header'>"+howToPlayTitle+"</h1>" + howToPlayBottom;
            } else {
                howToPlayTop = getLocalisedStringWithDefaultText("info.howtoplay.top.mobile") || getLocalisedStringWithDefaultText("info.howtoplay.top");
                howToPlayBottom = getLocalisedStringWithDefaultText("info.howtoplay.bottom.mobile");
                howToPlayContent = howToPlayTop + "<h1 id='paytable-header'>"+howToPlayTitle+"</h1>" + howToPlayBottom;
            }

            // replaceing the placeholders throughout the text with the defined markup
            for (var key in templates){
                howToPlayContent = howToPlayContent.replace(new RegExp(key, "g"), templates[key]);
            }
            howtoplayContent.innerHTML = howToPlayContent;

            var infoCloseButton = $('#info-page-close-wrapper');

            infoCloseButton.addEventListener(DOMUtil.touchEvent,function(){

                pgc.Game.getAudioEngine().playSound(pgc.Game.ScratchController.skinSelect(pgc.Game.audio.names.main), pgc.Game.ScratchController.skinSelect(pgc.Game.audio.names.control));

                if(game.StateMachine.previous == 'InGame'){
                    game.StateMachine.closeingameinfo();
                }else if(game.StateMachine.previous == 'Purchase'){
                    game.StateMachine.closepurchaseinfo();
                }else if(game.StateMachine.previous == 'Selection'){
                    game.StateMachine.selection();
                }

            },false);
            var payoutTable = document.getElementById("payoutTable");

            var titleHTML = '<div class="payoutItem title"><div >'+getLocalisedStringWithDefaultText("info.paytable.prizetitle", "Premie")+'</div><div>'+getLocalisedStringWithDefaultText("info.paytable.oddstitle", "Odds")+'</div>';
            titleHTML = (titleHTML.replace("{prize.amount}","")).replace("{odds}","Odds");

            payoutTable.innerHTML = titleHTML;

            var paytable = game.Paytable || {};
            var payouts = paytable && paytable.payouts || {};
            var keys = [];

            if (payouts){
                for(var prize in payouts){
                    var payoutItem = game.paytableDecorator(prize, payouts);
                    if (payoutItem) {
                        payoutTable.appendChild(payoutItem);
                    }
                }
            }

            var mathsElm = $("#infopage-maths");

            var prizeinfo = pgc.Game.prizeInfo || {
                "winningOdds" : "1:4,17",
                "prizeRatio" : "57.51 %"
            };

            var mathsText = ["<p>",getLocalisedStringWithDefaultText("maths.winning.odds", "winning Probability")," : ",paytable.winningOdds,"</p>",
                             "<p>",getLocalisedStringWithDefaultText("maths.rtp", "Prize ratio")," : ",paytable.prizeRatio,"</p>",
                             "<p>",getLocalisedStringWithDefaultText("maths.regulation", "Regulated as eSkrapespill"),"</p>"];
            mathsElm.innerHTML = mathsText.join("");

            // playing the click sound
            pgc.Game.getAudioEngine().playSound(pgc.Game.ScratchController.skinSelect(pgc.Game.audio.names.main), pgc.Game.ScratchController.skinSelect(pgc.Game.audio.names.control));

        },
        after: function(){
            // ...
        }

    };

    events.closepurchaseinfo = {
        from: ["Info"],
        to: ["Purchase"],
        before: function(){
            // ...
        },
        after: function(){
            // ...
        }
    };
    events.closeingameinfo = {
        from: "Info",
        to: ["InGame"],
        before: function(){
            // ...
        },
        after: function(){
            // ...
            switchSceneTo('game-scene');
        }
    };

    /**
     * Exposing a function into the window global object to initialise the GameStateMachine
     * and to populate it with the desired game logic
     */
    game.setupGameStateMachine = function(){

        // set up the StateMachine's reference in the pgc.Game namespace
        game.StateMachine = pgc.GameStateMachine.create({

            // using the current state as a body tag whenever the state has been changed
            useBodyTag: true,

            // pre-declared events and states
            events: events,
            states: states

        });

        // overwriting the default error handling to avoid throwing uncaugth exceptions
        game.StateMachine.error = function(){ console.log([].slice.call(arguments)); };
        
        // capturing 
        game.StateMachine.onenterstate = defaultify(game.StateMachine.onenterstate, function(evt, from, to){
            // if the onenterstate function has already been defined 
            this.default();

            // from === "none" means that statemachine is being pushed to the Init state when the game loads,
            // we therefore have to ignore this state and avoid saving this in order to not rewrite 
            // the actually saved state 
            if (game.UserData && from !== "none"){
                game.UserData.setUserData(SAVED_STATE_FIELD, to);
            }
        });

    };

    /**
     * Adding new states or overwriting default states
     * @param  {string} state    idintifier for the state it is desired to access
     * @param  {object} stateObj Object for declaring the "enter" and "leave" callbacks
     * @return void
     * @example
     * pgc.Game.state("Init", {
     *     enter: function(){
     *         this.default();
     *         someSpecificThingsToDo();
     *     }
     * });
     */
    game.state = function(state, stateObj){

        var createHandler = function(type){
                var handler = stateObj[type];
                if (!handler){
                    // use the old handler and leave it untouched
                    if (states[state][type]){
                        return states[state][type];
                    } else {
                        // neither the old handler nor the new one has been declared
                        return function(){};
                    }
                }
                return states[state][type] ? defaultify(states[state][type], handler) : handler;
            };


        if (!state || !stateObj){
            throw "Invalid parameter has been passed!";
        }

        if (!states[state]){
            states[state] = stateObj;
        } else {
            states[state] = {
                enter: createHandler("enter"),
                leave: createHandler("leave")
            };
        }

    };

    /**
     * Adding new events or overwriting default events
     * @param  {string} event    idintifier for the state it is desired to access
     * @param  {object} eventObj Object for declaring the "before" and "after" callbacks and define the transition
     * @return void
     */
    game.event = function(event, eventObj){

        var createHandler = function(type){
                var handler = eventObj[type] || function(){};
                return events[event][type] ? defaultify(events[event][type], handler) : handler;
            };


        if (!event || !eventObj || !eventObj.to){
            throw "Invalid parameter has been passed!";
        }

        if (!events[event]){
            events[event] = eventObj;
        } else {
            events[event] = {
                before: createHandler("before"),
                after: createHandler("after"),
                to: eventObj.to || "UnregisteredState",
                from: eventObj.from || "*"
            };
        }

    };


})(pgc.Game, PGCUniverse.PGCToolkit);

