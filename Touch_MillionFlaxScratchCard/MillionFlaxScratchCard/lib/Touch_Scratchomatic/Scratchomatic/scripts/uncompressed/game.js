// Re-initialise the required namespace objects if they aren't introduced in the global scope
var pgc = window.pgc || {};

// Game namespace for accumulating game-flow related objects
(function(game, toolkit){

	var listener = new toolkit.EventDispatcher(),
        audioEngine,
        audioEngineDelayedLoad = false,
        ambience = {main: "", ambient: ""},
        ambiencePlaying = false,
        ambientLastEventTime,
        ambientIntervalHandle,
        matchSoundTriggered = false,
        scratchSoundTimeSinceLastEvent = -1,
        scratchSoundPaused = false,
        scratchSoundInterval = -1,
        scratchSoundPlaying = false,
        instantWinSoundTriggered = false,
        scratchBlockingSoundTriggered = false,
        loopAmbience,
        audioControlElm,

        // used by the idleManager object to set the interval between checking if the game is idling
        IDLE_CYCLE_TIME = 500;

	/**
	 * Adding listeners to the game's "ready" state
	 * @return {void}
	 */
	game.ready = (function(){
        return function(callback){
			listener.addEventListener("ready", callback);
		};
	})();

	/**
	 * Adding listeners to the game's "scratchtoolchanged" state 
	 * (it is triggered when the user changes the selected scratch tool)
	 * @return {void}
	 */
	game.scratchtoolchanged = (function(){
		return function(callback){
			listener.addEventListener("scratchtoolchanged", callback);
		};
	})();	

	/**
	 * Adding listeners to the game's "idle" state 
	 * (it is triggered when the user hasn't made any interaction in terms of gameplay for a certain amount of time)
	 * @return {void}
	 */
	game.idle = (function(){
        // if timing isn't omitted then we create an anonymous function to handle with repeation
		return function(callback, timing){
            if (timing){
                listener.addEventListener("repeatedidle", function(elapsed){
                    // if elapsed === 0 then this event is triggered just right when the idling starts
                    if (0 === elapsed || elapsed % timing >= timing - IDLE_CYCLE_TIME){
                        callback();
                    }
                });
            } else {
                listener.addEventListener("idle", callback);
            }
		};
	})();	


    /**
     * Adding listeners to the game's "idlefinish" state 
     * (it is triggered when idle state has been interrupted by any sort of user interaction)
     * @return {void}
     */
    game.idlefinish = (function(){
        return function(callback){
            listener.addEventListener("idlefinish", callback);
        };
    })();

    /**
     * Adding listeners to the game's "lastintroanimation" state 
     * (it is triggered when the element endowed by the "last-intro-animation" class has finished it's animation)
     * @return {void}
     */
    game.lastintroanimation = (function(){
        return function(callback){
            listener.addEventListener("lastintroanimation", callback);
        };
    })();

    /**
     * Adding listeners to the game's "lastintroanimation" state 
     * (it is triggered when the element endowed by the "last-intro-animation" class has finished it's animation)
     * @return {void}
     */
    game.heartbeat = (function(){
        return function(callback){
            listener.addEventListener("heartbeat", callback);
        };
    })();

    /**
     * Adding listeners to the game's "scratchtoolchanged" state
     * (it is triggered when the user changes the selected scratch tool)
     * @return {void}
     */
    game.updateBank = function(bank){
        var userBalance = document.getElementById("user-balance"),
            formattedCurrency = getLocalisedString("toolbar.bankTitle")+" "+this.multiCurrencyManager.formatAmount(bank,true,true,1);
        if (formattedCurrency.indexOf(',-') === -1){
            formattedCurrency += ',-';
        }
        userBalance.innerHTML = "<p>"+formattedCurrency+"</p>";
    };

    /**
     * Adding function to update the price label inside the game scene
     * @return {void}
     */
    game.updatePriceLabel = function(price){
        var priceLabel = document.getElementById("price-label");

        price = parseInt(price, 10);
        if (priceLabel && !isNaN(price) && price > 0) {
            // ise int value if price is correct
        } else if (game.defaultPrice > 0) {
            // if incorrect and a default price is set, use default
            price = game.defaultPrice;
        }
        // show price
        priceLabel.innerHTML = pgc.Game.multiCurrencyManager.formatAmount(price,false,true,1)+",-";
    };

    /**
	 * Triggering an specified event and delegating it to all the subscribed listeners
	 * @param  {string} type the event type we want to trigger
	 * @return {void}
	 */
	game.trigger = function(type){
		var args = Array.prototype.slice.call(arguments, 1);
		listener.dispatch.apply(listener, arguments);
	};

    /**
     * Initialises the game audio system.  Note about the versions.  Version 1 refering to the original Audio
     * Sprite implementation which is effectively a very elaborate wrapper around the <audio> tag.
     * Version 2 refers to the WebAudioAPI requires much less Javascript code to facilitate game audio.
     *
     */
    game.initAudio = function() {

        if (!game.audio){
            game.audio = {};
        }

        //set the default names for the different audio sprites here. These may need to be overwritten in some games (e.g. Grise)
        game.audio.names = {
            intro               : "intro",
            main                : "main",
            buy                 : "buy",
            cardSelection       : "cardSelection",
            match               : "match",
            win                 : "win",
            ambience            : "ambience",
            fallback_ambience   : "fallback_ambience",
            button              : "button",
            scratching          : "scratching",
            instant             : "instant",
            instantScratch      : "instantScratch",
            scratchAll_button   : "scratchAll_button",
            scratchAll          : "scratchAll",
            lose                : "lose",
            control             : "control",
            close               : "close"
        };

        audioEngine = new AudioController();
        audioEngine.init();

        // Force the fallback audio (useful for testing, comment it out for production)
        //audioEngine.webAudioFeatureOverride(true);

        // The iPhone simulator's WebAudioAPI is really buggy and it will make an awful sound if you try use it.
        // For the sanity of other developers I'm forcing the fallback if it detects the iPhone simulator is the client
        // platform.  Bizzarely it doesn't appear to affect the iPad.
        if ( navigator.platform === "iPhone Simulator" ) {
            audioEngine.webAudioFeatureOverride(true);
        }


        if ( typeof game.audio === "object" && game.audio.audioEnabled ) {

            if ( game.audio.variedAudio ) {
                audioEngine.setupVariedAudioFromConfig(game.audio, false, false);
            } else {
                audioEngine.setupAudioFromConfig(game.audio, false, false);
            }

            if ( audioEngine.version <= 1 ) {
                // Audio Fallback
                if ( !('ontouchstart' in window) ) {
                    audioEngine.getAudioSprite(pgc.Game.ScratchController.skinSelect(game.audio.names.main)).preloadSound(function() {
                        // Sound loaded successfully.  It might make sense to add some control code here.
                    });
                } else {
                    audioEngineDelayedLoad = true;
                }
            }

            // TODO: Link audioEngine to page audio controls
            audioControlElm = document.getElementById("sound-button");
            DOMUtil.appendClassName(audioControlElm, "", "hidden");


            if (pgc.Game.UserData){
                var userSoundFlag = pgc.Game.UserData.getUserData(gameName+"-audioEnabled");

                if ( userSoundFlag === null ) {
                    userSoundFlag = true;
                    pgc.Game.UserData.setUserData(gameName+"-audioEnabled", userSoundFlag);
                } else {
                    // The value is saved as a Boolean but it returns it as a string, so we need to convert it here.
                    // TODO: For 'expected' types, UserData should implement functions to return those types... I.E. getUserDataString(), getUserDataBoolean() etc
                    userSoundFlag = (userSoundFlag === "true") ? true : false;
                }

                audioEngine.toggleSound(userSoundFlag);

                // If Audio is disabled, toggle the icon
                if ( userSoundFlag ) {
                    DOMUtil.appendClassName(audioControlElm, "", "soundOff");
                } else {
                    DOMUtil.appendClassName(audioControlElm, "soundOff", "");
                }

            } else {
                // TODO: Really? Always true if UserData is not available.  That seems like it's asking for trouble
                audioEngine.toggleSound(true);
            }

            // Apply the event listener to the sound button so that the audio can be toggled
            audioControlElm.addEventListener(DOMUtil.touchEvent, pgc.Game.toggleSound);

            // check config if the audio should be looped
            loopAmbience = game.audio.loopAmbience || false;
        }
    };

    /**
     * Checks readyFunc every wait ms until it returns true, then fires callback
     */
    game.readyWait = function(readyFunc, callback, wait) {
        if(readyFunc()) {
            callback();
        } else {
            setTimeout(function(){game.readyWait(readyFunc, callback, wait);}, wait);
        }
    };

    /**
     *
     * @returns {Object} - Returns the shared audio engine object
     */
    game.getAudioEngine = function() {
        return audioEngine;
    };

    /**
     * returning the appropriate url to the sound resource regarding whether the m4a format is supported or not
     * @return {string} string contaning the URL to the resource
     */
    game.getAudioResourceURL = function(){
        // using the prototype object since the object hasn't been instantiated when we need this function
        var isSupported = AudioController.prototype.isExtensionSupported,
            ext = "m4a";

        // if the function exists, but the default format isn't supported (for avoiding to invoke non existed function) 
        if (isSupported && !isSupported(ext)){
            ext = "ogg";
        }

        return imageHostName + "/lib/Games/" + gameName + "/sounds/" + "sounds." + ext;
    };

    /**
     * Used to indicate if the Ambient music is playing.  The primary purpose of this is to prevent the audio engine
     * from starting playback if the music is already playing.
     * @returns {boolean} Flag indicating if the music is playing.  true: it's playing. false: it's not playing.  Simples!
     */
    game.isAmbiencePlaying = function() {
        return ambiencePlaying;
    };

    /**
     * Begins playback of the ambient music.
     */
    game.playAmbientSound = function() {

        if ( pgc.Game.getAudioEngine().version > 1) {

            pgc.Game.getAudioEngine().stopSound(ambience.main, ambience.ambient);

            //HACK: wait for track.playing to be false before starting ambient sound again
            ambience.main = pgc.Game.ScratchController.skinSelect(game.audio.names.main);
            ambience.ambient = pgc.Game.ScratchController.skinSelect(game.audio.names.ambience);
            game.readyWait(
                function() {
                    return !audioEngine.sounds_[ambience.main].tracks[ambience.ambient].playing;
                }, function() {
                    // start the ambient music
                    ambiencePlaying = true;
                    if( loopAmbience ) {
                        pgc.Game.getAudioEngine().playLoopedSound(ambience.main, ambience.ambient);
                    } else {
                        pgc.Game.getAudioEngine().playSound(ambience.main, ambience.ambient, function() {
                            // ambient audio playback complete.  Reset the flag so it can be started again
                            ambiencePlaying = false;
                        });
                    }
                },
                500
            );
        } else {
            ambientLastEventTime = Date.now();

            if (!ambiencePlaying ) {
                // start the interval which triggers the ambient music if the game has been idle for a while
                ambientIntervalHandle = window.setInterval(DOMUtil.bind(function() {
                    var now = Date.now();
                    // TODO: Externalize 20000 so it can be modified on a per game basis
                    if ( now  - ambientLastEventTime > 20000 ) {
                        ambience.main = pgc.Game.ScratchController.skinSelect(game.audio.names.main);
                        ambience.ambient = pgc.Game.ScratchController.skinSelect(game.audio.names.ambience);
                        pgc.Game.getAudioEngine().playSound(ambience.main, ambience.ambient, function() {
                            ambiencePlaying = false;
                        });
                        ambientLastEventTime = now;
                    }
                }, this), 1000);

                ambiencePlaying = true;
            }
        }

    };

    /**
     * Fades the ambient music out and ends the track
     * TODO: fix the easing
     */
    game.fadeAmbientSound = function(time) {
        if(ambiencePlaying) {
            if(!game.audio.fading) {
                game.audio.fading = true;
                game.audio.timer = time * 1000;
                game.audio.lastTime = new Date().getTime();
            }
            var current = new Date().getTime();
            var delta = current - game.audio.lastTime;
            game.audio.timer = Math.max(0, game.audio.timer - delta);
            var newVolume = game.audio.timer / (time * 1000);
            game.getAudioEngine().setMasterVolume(newVolume);
            if(newVolume > 0) {
                requestAnimationFrame(function(){game.fadeAmbientSound(time);});
            } else {
                game.audio.fading = false;
                pgc.Game.getAudioEngine().stopAll(false);
                game.getAudioEngine().setMasterVolume(1.0);
            }
        }
    };

    /**
     * Start the scratching sound.
     */
    game.startScratchSound = (function(){

        // if the version is 1 or older then the scratch sound shouldn't block the 
        // either the matching or the instant win sounds
        var isBlockingMatchingSound = function(){
                if (game.getAudioEngine().version > 1){
                    return false;
                }
                return matchSoundTriggered || instantWinSoundTriggered || scratchBlockingSoundTriggered;
            };

        return function(){
            if ( !scratchSoundPlaying && !isBlockingMatchingSound() && game.isAudioAvailable() ) {

                scratchSoundPlaying = true;

                if ( pgc.Game.getAudioEngine().version > 1 ) {
                    if ( scratchSoundPaused ) {
                        pgc.Game.getAudioEngine().resumeSound(pgc.Game.ScratchController.skinSelect(game.audio.names.main), pgc.Game.ScratchController.skinSelect(game.audio.names.scratching), "true");
                        scratchSoundPaused = false;
                    } else {
                        pgc.Game.getAudioEngine().playLoopedSound(pgc.Game.ScratchController.skinSelect(game.audio.names.main), pgc.Game.ScratchController.skinSelect(game.audio.names.scratching));
                    }
                } else {
                    pgc.Game.getAudioEngine().playLoopedSound(pgc.Game.ScratchController.skinSelect(game.audio.names.main), pgc.Game.ScratchController.skinSelect(game.audio.names.scratching));
                }

                scratchSoundInterval = window.setInterval(game.stopScratchSound, 50);
            }
        };

    })();

    /**
     * Called on each interval step started by startScratchSound.  Applies the logic to stop the scratching sound if
     * it appears as if there hasn't been a scratch for a while.
     * @param forceStop
     */
    game.stopScratchSound = function(forceStop) {
        if ( scratchSoundPlaying ) {
            // @TODO: Externalize 250 so it can be easily configured.  Also, Magic numbers are bad :-(
            if ( Date.now() - scratchSoundTimeSinceLastEvent > 250 || forceStop ) {
                if ( pgc.Game.getAudioEngine().version > 1 ) {
                    pgc.Game.getAudioEngine().pauseSound(pgc.Game.ScratchController.skinSelect(game.audio.names.main), pgc.Game.ScratchController.skinSelect(game.audio.names.scratching));
                    scratchSoundPaused = true;
                } else {
                    pgc.Game.getAudioEngine().stopSound(pgc.Game.ScratchController.skinSelect(game.audio.names.main), pgc.Game.ScratchController.skinSelect(game.audio.names.scratching));
                }
                window.clearInterval(scratchSoundInterval);
                scratchSoundInterval = -1;
                scratchSoundPlaying = false;
            }
            scratchSoundPaused = true;
        }
    };

    /**
     * Updates the time since the last 'scratch' event.  What happens is that the audio of the 'scratching' is looped
     * If it detects there have been no new scratches for 50 milliseconds it will pause the audio.
     *
     * See startScratchSound
     */
    game.updateTimeSinceLastScratchEvent = function() {
        scratchSoundTimeSinceLastEvent = Date.now();

        if ( scratchSoundInterval == -1 ) {
            game.startScratchSound();
        }

    };

    game.toggleSound = function(e) {

        var soundState = audioEngine.isSoundOn();
        soundState = !soundState;

        audioEngine.toggleSound(soundState);
        pgc.Game.UserData.setUserData(gameName+"-audioEnabled", soundState);

        if ( soundState ) {
            DOMUtil.appendClassName(audioControlElm, "", "soundOff");
            if ("InGame" === game.StateMachine.current || "Intro" === game.StateMachine.current ){
                game.playAmbientSound();
            }
        } else {
            DOMUtil.appendClassName(audioControlElm, "soundOff", "");
            audioEngine.stopAll(false);

            // reset all local control flags in case sound is renabled
            matchSoundTriggered = false;
            scratchSoundPlaying = false;
            instantWinSoundTriggered = false;
            ambiencePlaying = false;
        }

    };

    /**
     * Returns the flag which indicates if the Audio Engine has downloaded it's source audio.  Only used if Audio Engine
     * version is 1 and we're on a mobile device.  The reason for this is some mobile devices won't automatically buffer
     * <audio> or <video> sources to prevent wasting a User's mobile data plan.
     * @returns {boolean} Flag indicating if the load is delayed.  If it's true the audio still needs to be loaded
     */
    game.isAudioEngineDelayedLoad = function() {
        return audioEngineDelayedLoad;
    };

    /**
     * Toggles the state of the audio engine to indicate that the audio resource has been downloaded.
     * @param newValue Changes the state of the audio delayed load flag.  If it's true it would suggest the audio
     * resource needs to be downloaded.  If it's set to false it would imply the audio resource has been downloaded.
     */
    game.setAudioEngineDelayedLoad = function(newValue) {
        audioEngineDelayedLoad = newValue;
    };

    /**
     * For Audio Engine version 1.  The ambient sound is triggered after the game has been idle for some time.  By calling
     * this function we are hinting to that callback that user interaction has taken place and the ambient sound should
     * be further delayed.
     */
    game.updateAmbientLastEventTime = function() {
        // The ambientLastEventTime is only valid if AudioController.version <= 1
        ambientLastEventTime = Date.now();
    };



    /**
     * Plays the sound when a symbol in the field matches one of the payout symbols.  It flags itself so that multiple matches
     * will not trigger multiple playback events simultaneously.
     */
    game.playMatchSound = function() {
        if ( !matchSoundTriggered && game.isAudioAvailable() ) {

            // Matched sound has note been triggerd

            matchSoundTriggered = true;

            if ( pgc.Game.getAudioEngine().version <= 1 ) {
                if ( scratchSoundPlaying ) {
                    pgc.Game.stopScratchSound(true);
                }

                // for the older version we need to stop the sound manually since it won't override the current playing sound
                // if the flag is set to playback in full (which is does)
                pgc.Game.getAudioEngine().stopAll(false);

            }

            pgc.Game.getAudioEngine().playSound(pgc.Game.ScratchController.skinSelect(game.audio.names.main), pgc.Game.ScratchController.skinSelect(game.audio.names.match), function() {
                matchSoundTriggered = false;
            }, true, true);

        }
    };

    /**
     * Plays the sound for the instant win
     */
    game.playInstantWinSound = function() {
        if ( !instantWinSoundTriggered && game.isAudioAvailable() ) {
            instantWinSoundTriggered = true;

            if ( pgc.Game.getAudioEngine().version <= 1 ) {
                if ( scratchSoundPlaying ) {
                    pgc.Game.stopScratchSound(true);
                }

                pgc.Game.getAudioEngine().stopAll(false);
            }

            pgc.Game.getAudioEngine().playSound(pgc.Game.ScratchController.skinSelect(game.audio.names.main), pgc.Game.ScratchController.skinSelect(game.audio.names.instant), function() {
                instantWinSoundTriggered = false;
            }, true);
        }
    };

    /**
     * stops all the sounds and triggers the pointed sample
     */
    game.stopAllAndPlay = (function(){
        return function(key, subkey) {
            if ( game.isAudioAvailable() ) {
                pgc.Game.getAudioEngine().stopAll(false);
                pgc.Game.getAudioEngine().playSound(subkey ? key : pgc.Game.ScratchController.skinSelect(game.audio.names.main), subkey || key, function() {
                }, true);
            }
        };
    })();    

    /**
     * Plays the sound and prevents the game from triggering any scratch sounds
     */
    game.playSoundWithBlockingScratchSound = (function(){
        var hasSoundTriggered = false;
        return function(key, subkey) {
            if ( !hasSoundTriggered && game.isAudioAvailable() ) {
                hasSoundTriggered = true;
                scratchBlockingSoundTriggered = true;

                if ( pgc.Game.getAudioEngine().version <= 1 ) {
                    if ( scratchSoundPlaying ) {
                        pgc.Game.stopScratchSound(true);
                    }

                    pgc.Game.getAudioEngine().stopAll(false);
                }

                pgc.Game.getAudioEngine().playSound(subkey ? key : pgc.Game.ScratchController.skinSelect(game.audio.names.main), subkey || key, function() {
                    hasSoundTriggered = false;
                    scratchBlockingSoundTriggered = false;
                }, true);
            }
        };
    })();

    /**
     * Convenience method to tell us if the Audio resource has been loaded.
     * @returns {boolean} True if the audio resource has loaded (or technically if canPlayThrough event was received),
     * otherwise false.
     */
    game.isAudioAvailable = function() {
        return audioEngine.getAudioSprite(pgc.Game.ScratchController.skinSelect(game.audio.names.main)) && audioEngine.getAudioSprite(pgc.Game.ScratchController.skinSelect(game.audio.names.main)).ready && audioEngine.isSoundOn();
    };

    /**
     * Fallback for mobile device that use the legacy Audio sprite.  A user action is required to trigger the buffer
     * of the resource defined by the <audio> tag.
     */
    game.preloadAudioMobileFallback = function() {
        pgc.Game.getAudioEngine().getAudioSprite(pgc.Game.ScratchController.skinSelect(game.audio.names.main)).audioScrollEvent(null, null, function() {
            // TODO: Enable the audio control
            // TODO: Prevent any of the audio routines (especially the ones that apply control flags) from executing until we're ready in here
        });

        pgc.Game.setAudioEngineDelayedLoad(false);
    };

	/**
	 * array that stores references to each of the scratchzones
	 * @type {Array}
	 */
	game.scratchSceneReferences = [];

    /**
     * array that stores references to the symbolgroups
     * @type {Array}
     */
    game.symbolGroupReferences = [];


    /** --------------------------------------------------------------------------------------------------- **/
    /** Adding handling of the idle state 																	**/
    /** --------------------------------------------------------------------------------------------------- **/
    (function(toolkit){

    	// time when the last user interaction happened
        var lastInteraction = new Date(),
        	timer = null,

        	body = toolkit.$(document.body),

        	idling = false,

        	idlingKey = "Idling",

        	// resetting the last time when any sort of user interaction occured 
        	resetLastInteraction = function(delay){
        		lastInteraction = new Date();
                if (delay > 0){
                    lastInteraction.setMilliseconds(delay);
                }
        		idling = false;
        	},

        	addBodyTag = function(){
        		body.addClass(idlingKey);
        	},

        	removeBodyTag = function(){
        		body.removeClass(idlingKey);
        	},

            // default delay between checking whether or not we need to trigger the idle animations
            interval = IDLE_CYCLE_TIME,

            // invoking a checker timeout to determine whether the game should be idling or not
	        tick = function tick(){

	            var limit = game.idleTimeLimit || 5000,
                    elapsed = new Date() - lastInteraction;

	            // calling the registered listeners when the game has been idleing for a certain amount of time
	            if (elapsed > limit){
                    if (!idling){
    	            	idling = true;
    	            	game.trigger("idle");
                        // triggering callbacks even if they have been subscribed to the repeated idle hook
                        game.trigger("repeatedidle", 0);
    	            	addBodyTag();
                    } else {
                        game.trigger("repeatedidle", elapsed - limit);
                    }
	            }

	            timer = setTimeout(tick, interval);
	        },

	        stopTicking = function(){
	        	clearTimeout(timer);
	        	timer = null;
	        },

            emitIdleFinishEventOnce = function(){
                if (idling){
                    game.trigger("idlefinish");
                }
            };

	    // exposing an object that can handle the idling and can be acess accross other modules as well
	    game.idleManager = {

	    	// start to listening for idle activity
	    	listen: function(){
                if (!timer){
                    resetLastInteraction();
                    tick();
                }
			},

			// suspending the listening for idling
        	stop: function(){
        		this.reset();
        		stopTicking();
        	},

        	// exposing a function to reset the timer used between idle animations
        	reset: function(delay){
                // to invoke the listeners for the "idlefinish" event only once it's really important
                // to keep the "emitIdleFinishEventOnce" function ahead of "resetLastInteraction"
                emitIdleFinishEventOnce();
	        	resetLastInteraction(delay);
	        	removeBodyTag();
        	}

        };

    })(toolkit);


    /** --------------------------------------------------------------------------------------------------- **/
    /** Heart beat handler                                                                                  **/
    /** --------------------------------------------------------------------------------------------------- **/
    (function(toolkit){

        // time when the last user interaction happened
        var lastInteraction = new Date(),
            timer = null,

            // resetting the last time when any sort of user interaction occured 
            resetLastInteraction = function(delay){
                lastInteraction = new Date();
                if (delay > 0){
                    lastInteraction.setMilliseconds(delay);
                }
            },

            // default delay between checking whether or not we need to send the heart beat
            interval = 500,

            // invoking a checker timeout to determine whether the game should be heartbeating or not
            tick = function tick(){
                var elapsed = new Date() - lastInteraction,
                    delayBetweenHeartBeats =  window.touchCasinoBrandConf && window.touchCasinoBrandConf.timeBetweenHeartbeats || 60000;

                // calling the registered listeners when the game has been idleing for a certain amount of time
                if (elapsed > delayBetweenHeartBeats){
                    game.Client.sendHeartbeatMessage();
                    game.trigger("heartbeat");
                    resetLastInteraction();
                }
                
                timer = setTimeout(tick, interval);
            },

            stopTicking = function(){
                clearTimeout(timer);
                timer = null;
            };

        // exposing an object that can handle the heartbeating and can be acess accross other modules as well
        game.heartbeatManager = {

            // start to listening for idle activity
            start: function(){
                if (!timer){
                    resetLastInteraction();
                    tick();
                }
            },

            // suspending the listening for heartbeating
            stop: function(){
                this.reset();
                stopTicking();
            },

            // exposing a function to reset the timer used between idle animations
            reset: function(delay){
                resetLastInteraction(delay);
            }

        };

    })(toolkit);


    /** --------------------------------------------------------------------------------------------------- **/
    /** Applying facilities for the selection flow                                                          **/
    /** --------------------------------------------------------------------------------------------------- **/
    (function(toolkit){

        game.applyOldSelectionFlow = function(){
            toolkit.$(document.body).addClass("OldSelectionFlow");
            game.oldSelectionFlow = true;
        };

        game.isOldSelectionFlow = function(){
            return !!game.oldSelectionFlow;
        };

        game.hasSelectionScene = function(){
            // the selection scene needs to be part of the flow only on desktop and if it's supported at all
            return "default" === userAgent.OS && !game.isOldSelectionFlow();
        };

    })(toolkit);


	// overwriting or setting up the game object with this extended one
	pgc.Game = game;

})(pgc.Game || {}, PGCUniverse.PGCToolkit);