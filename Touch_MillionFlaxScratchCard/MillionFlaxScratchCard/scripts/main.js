pgc.Game.ready(function(){

    //The skinSelect function will pick the correct string from the array when you use the sound functions
    if (pgc.Game.hasSelectionScene()){
        pgc.Game.audio.names.buy = "control";
        pgc.Game.audio.names.cardSelection = "buy";
    }

    /** --------------------------------------------------------------------------------------------------- **/
    /** Game specific localisation setup                                                                    **/
    /** --------------------------------------------------------------------------------------------------- **/
    (function(w){

        // popups
        // no-win popup
        w("nowin-popup-button-text", "ingame.button.ok", "Ok");
        w("nowin-popup-title-container-outline", "ingame.popup.nowin.title", "", true);
        w("nowin-popup-title-container-fill", "ingame.popup.nowin.title", "", true);
        w("nowin-popup-text-container-outline", "ingame.popup.nowin.text");
        w("nowin-popup-text-container-fill", "ingame.popup.nowin.text");

        // win popup
        w("win-popup-button-text", "ingame.button.ok", "Ok");
        w("win-popup-title-container-outline", "ingame.popup.win.title", "", true);
        w("win-popup-title-container-fill", "ingame.popup.win.title", "", true);
        w("win-popup-text-container-outline", "ingame.popup.win.text");
        w("win-popup-text-container-fill", "ingame.popup.win.text");

        //bonus win popup
        w("bigwin-popup-button-text", "ingame.button.ok", "Ok");
        w("bigwin-popup-title-container-outline", "ingame.popup.win.title", "", true);
        w("bigwin-popup-title-container-fill", "ingame.popup.win.title", "", true);
        w("bigwin-popup-text-container-outline", "ingame.popup.win.text");
        w("bigwin-popup-text-container-fill", "ingame.popup.win.text");
        w("bigwin-popup-subtext-container", "ingame.popup.win.subtext");

    })(writeText);

    /** --------------------------------------------------------------------------------- **/
    /** Check for specific browsers **/
    /** --------------------------------------------------------------------------------- **/
    if (userAgent.isIPad()) {
        document.body.classList.add("iPad");
    }

    if (userAgent.isAndroidStockBrowser()) {
        document.body.classList.add("androidStockBrowser");
    }

    if (userAgent.isSafari()) {
        document.body.classList.add("Safari");
    }

    if (userAgent.isChrome()) {
        document.body.classList.add("Chrome");
    }

    /** --------------------------------------------------------------------------------------------------- **/
    /** Game specific logic                                                                                 **/
    /** --------------------------------------------------------------------------------------------------- **/
    (function(toolkit){

        /** --------------------------------------------------------------------------------- **/
        /** Persistent Variables                                                              **/
        /** --------------------------------------------------------------------------------- **/
        var $ = toolkit.$;

        var mainZone,
            mainGroup,
            bonusZone,
            bonusGroup,
            isDesktop;


        /** --------------------------------------------------------------------------------------------------- **/
        /** Initialisation                                                                                      **/
        /** --------------------------------------------------------------------------------------------------- **/
        /**
         * Initialise all the required game components
         * @return {none}
         */
        this.initialise = function(scratchZoneConfig){
            //Get the containers for the SymbolGroups
            mainZone = document.getElementById("scratch-zone-basic");
            bonusZone = document.getElementById("scratch-zone-bonus");
            isDesktop = document.body.classList.contains("Desktop");

            //Configure SymbolGroups
            //Use the 3G pixel amounts when setting up sprites etc.

            mainGroup = new SymbolGroup({
                container:      mainZone,
                width:          isDesktop ? 277 : 282,
                height:         isDesktop ? 206 : 208
            }).setTitleConfig({
                string:         "Spill 1",
                offsetX:        0,
                offsetY:        0,
                fontFamily:     "FuturaBoldCondensedBT",
                fontWeight:     "lighter",
                fontSize:       "9.5px",
                fillStyle:      "white",
                strokeStyles:   ["black"],
                lineWidths:     ["3.5px"]
            }).setBackgroundConfig({
                source:         isDesktop ? "game_scratch_symbols.png" : "game_scratch_symbols_mobile.png",
                sampleX:        isDesktop ? 107 : 104,
                sampleY:        isDesktop ? 51 : 50,
                sampleWidth:    isDesktop ? 81 : 86,
                sampleHeight:   isDesktop ? 57 : 61
            }).setPrizeConfig({
                fontFamily:     "FuturaBoldCondensedBT",
                fontSize:       "16px",
                fillStyle:      "white"
            }).setFoilConfig({
                source:         isDesktop ? "game_scratch_symbols.png" : "game_scratch_symbols_mobile.png",
                sampleX:        isDesktop ? 7 : 5,
                sampleY:        isDesktop ? 51 : 50,
                sampleWidth:    isDesktop ? 81 : 85,
                sampleHeight:   isDesktop ? 57 : 61
            }).setScratchSpriteConfig({
                source:         "scratch_off.png",
                sampleX:        0,
                sampleY:        0,
                sampleWidth:    98,
                sampleHeight:   69,
                frames:         [{x: 294, y: 69}, {x: 196, y: 69}, {x: 98, y: 69}, {x: 0, y: 69},
                    {x: 294, y: 0}, {x: 196, y: 0}, {x: 98, y: 0}, {x: 0, y: 0}],
                frameRate:      75
            }).addSpecialConfig({
                nameVal:        "winParticles",
                source:         "particles.png",
                sampleX:        0,
                sampleY:        0,
                sampleWidth:    126,
                sampleHeight:   133,
                frames:         [{x: 0, y: 0}, {x: 126, y: 0}, {x: 252, y: 0}, {x: 378, y: 0}, {x: 504, y: 0}, {x: 630, y: 0}, {x: 756, y: 0},
                    {x: 0, y: 133}, {x: 126, y: 133}, {x: 252, y: 133}, {x: 378, y: 133}, {x: 504, y: 133}, {x: 630, y: 133}, {x: 756, y: 133}],
                frameRate:      100,
                visible:        false
            }).addAnimation({
                triggerCondition:   pgc.ScratchAnimationTriggers.WIN,
                timeLine:       new TimeLine()
                    .add(0, function() {
                        this.animatePart({
                            partName:   "winParticles",
                            fadeTime:   250
                        });
                        this.pulse({
                            partName:   "Prize",
                            firstScale: 1.2,
                            lastScale:  1,
                            totalTime:  500
                        });
                        pgc.Game.getAudioEngine().playSound("main", "match");
                    }).add(1000, function() {
                        this.getGroup().revealAll();
                    })
            }).addAnimation({
                triggerCondition:   pgc.ScratchAnimationTriggers.START,
                groupTimeLine:      new TimeLine()
                    .add(0, function() {
                        //Put the symbols in initial positions for the intro animation
                        var symbols = this.getSymbols();
                        for(var i = 0; i < symbols.length; i++) {
                            symbols[i].forEachSprite(function(sprite) {
                                sprite.setOpacity(0.0);
                                sprite.setScaling(0.7);
                            });
                        }
                    })
                    .add(567, function() {
                        this.triggerAnimation({
                            trigger:    pgc.ScratchAnimationTriggers.CUSTOM00,
                            symbols:    this.getSymbols().slice(0, 3)
                        });
                    })
                    .add(650, function() {
                        this.triggerAnimation({
                            trigger: pgc.ScratchAnimationTriggers.CUSTOM00,
                            symbols: this.getSymbols().slice(3, 6)
                        });
                    })
                    .add(733, function() {
                        this.triggerAnimation({
                            trigger: pgc.ScratchAnimationTriggers.CUSTOM00,
                            symbols: this.getSymbols().slice(6, 9)
                        });
                    })
            }).addAnimation({
                triggerCondition:   pgc.ScratchAnimationTriggers.CUSTOM00,
                    priority: pgc.Priorities.HIGHER,
                timeLine:           new TimeLine()
                    .add(0, function() {
                        this.forEachSprite(function(sprite) {
                            sprite.fadeTo({
                                opacity: 1,
                                time: 0.208
                            });
                            sprite.growTo({
                                scale: 1,
                                time: 0.208
                            });
                        });
                    })
            }).setSymbolPositions(isDesktop ? [ {x: 41, y: 49},     {x: 134, y: 49},    {x: 227, y: 49},
                                    {x: 41, y: 109},    {x: 134, y: 109},   {x: 227, y: 109},
                                    {x: 41, y: 169},    {x: 134, y: 169},   {x: 227, y: 169} ] :
                                              [ {x: 42, y: 49},     {x: 140, y: 49},    {x: 238, y: 49},
                                    {x: 42, y: 113},    {x: 140, y: 113},   {x: 238, y: 113},
                                    {x: 42, y: 176},    {x: 140, y: 176},   {x: 238, y: 176} ]);

            bonusGroup = new SymbolGroup({
                container:      bonusZone,
                width:          isDesktop ? 70 : 277,
                height:         isDesktop ? 206 : 120
            }).setTitleConfig({
                string:         "Spill 2",
                offsetX:        6,
                offsetY:        0,
                fontFamily:     "FuturaBoldCondensedBT",
                fontSize:       "9.5px",
                fillStyle:      "white",
                strokeStyles:   ["black"],
                lineWidths:     ["2px"]
            }).setBackgroundConfig({
                source:         isDesktop ? "game_scratch_symbols.png" : "game_scratch_symbols_mobile.png",
                sampleX:        isDesktop ? 80 : 107,
                sampleY:        isDesktop ? 120 : 125,
                sampleWidth:    isDesktop ? 60 : 82,
                sampleHeight:   isDesktop ? 30 : 50
            }).setPrizeConfig({
                fontFamily:     "FuturaBoldCondensedBT",
                fontSize:       "13.5px",
                fillStyle:      "white"
            }).setFoilConfig({
                source:         isDesktop ? "game_scratch_symbols.png" : "game_scratch_symbols_mobile.png",
                sampleX:        isDesktop ? 5 : 5,
                sampleY:        isDesktop ? 120 : 124,
                sampleWidth:    isDesktop ? 60 : 85,
                sampleHeight:   isDesktop ? 30 : 52
            }).setScratchSpriteConfig({
                source:         isDesktop ? "scratch_off_bonus_desktop.png" : "scratch_off_bonus_mobile.png",
                sampleX:        isDesktop ? 0 : 0,
                sampleY:        isDesktop ? 0 : 0,
                sampleWidth:    isDesktop ? 65 : 110,
                sampleHeight:   isDesktop ? 35 : 70,
                frames:         isDesktop ? [{x: 195, y: 35}, {x: 130, y:35}, {x: 65, y: 35}, {x: 0, y: 35},
                    {x: 195, y: 0}, {x: 130, y: 0}, {x: 65, y: 0}, {x: 0, y: 0}] :
                                            [{x: 330, y: 70}, {x: 220, y: 70}, {x: 110, y: 70}, {x: 0, y: 70},
                    {x: 330, y: 0}, {x: 220, y: 0}, {x: 110, y: 0}, {x: 0, y: 0}],
                frameRate:      75
            }).addSpecialConfig({
                nameVal:        "winParticles",
                source:         "particles.png",
                sampleX:        0,
                sampleY:        0,
                sampleWidth:    126,
                sampleHeight:   133,
                frames:         [{x: 0, y: 0}, {x: 126, y: 0}, {x: 252, y: 0}, {x: 378, y: 0}, {x: 504, y: 0}, {x: 630, y: 0}, {x: 756, y: 0},
                    {x: 0, y: 133}, {x: 126, y: 133}, {x: 252, y: 133}, {x: 378, y: 133}, {x: 504, y: 133}, {x: 630, y: 133}, {x: 756, y: 133}],
                frameRate:      100,
                visible:        false
            }).addAnimation({
                triggerCondition:   pgc.ScratchAnimationTriggers.WIN,
                priority        :   pgc.Priorities.HIGHER,
                timeLine        :   new TimeLine()
                    .add(0, function() {
                        this.animatePart({
                            partName:   "winParticles",
                            fadeTime:   250
                        });
                        this.pulse({
                            partName:   "Prize",
                            firstScale: 1.2,
                            lastScale:  1,
                            totalTime:  500
                        });
                        pgc.Game.getAudioEngine().playSound("main", "match");
                    }).add(1000, function() {
                        this.getGroup().revealAll();
                    })
            }).addAnimation({
                triggerCondition:   pgc.ScratchAnimationTriggers.START,
                groupTimeLine:      new TimeLine()
                    .add(0, function() {
                        //Put the symbols in initial positions for the intro animation
                        var symbols = this.getSymbols();
                        for(var i = 0; i < symbols.length; i++) {
                            symbols[i].forEachSprite(function(sprite) {
                                sprite.setOpacity(0.0);
                                sprite.setScaling(0.7);
                            });
                        }
                    })
                    .add(617, function() {
                        this.triggerAnimation({
                            trigger:    pgc.ScratchAnimationTriggers.CUSTOM00,
                            symbols:    this.getSymbols().slice(0, 3)
                        });
                    })
                    .add(700, function() {
                        this.triggerAnimation({
                            trigger: pgc.ScratchAnimationTriggers.CUSTOM00,
                            symbols: this.getSymbols().slice(3, 6)
                        });
                    })
            }).addAnimation({
                triggerCondition:   pgc.ScratchAnimationTriggers.CUSTOM00,
                timeLine:           new TimeLine()
                    .add(0, function() {
                        this.forEachSprite(function(sprite) {
                            sprite.fadeTo({
                                opacity: 1,
                                time: 0.208
                            });
                            sprite.growTo({
                                scale: 1,
                                time: 0.208
                            });
                        });
                    })
            }).setSymbolPositions(isDesktop ? [{x: 35, y: 30},
                {x: 35, y: 62},
                {x: 35, y: 94},
                {x: 35, y: 126},
                {x: 35, y: 158},
                {x: 35, y: 190}] :
                                              [{x: 47, y: 40}, {x: 139, y: 40}, {x: 230, y: 40},
                {x: 47, y: 94}, {x: 139, y: 94}, {x: 230, y: 94}]);


            //Configure brushes and event handling
            this.addEventListeners();
            //pgc.Game.ScratchController.setAutoGameOver(false);
            this.setScratchToolHandler(pgc.Game.ScratchController.createBrushMasks(["coin_brush.png", "key_brush.png"]));

            //Initialise games
            pgc.Game.ScratchController.initialiseGame({
                gameType:           pgc.ScratchGameTypes.MATCH_X,
                playFieldsGroups:   mainGroup
            });

            pgc.Game.ScratchController.initialiseGame({
                gameType:           pgc.ScratchGameTypes.MATCH_X,
                gameIndex:          1,
                playFieldsGroups:    bonusGroup
            });

            //Begin game
            pgc.Game.ScratchController.startNewGame();

        };


        /** --------------------------------------------------------------------------------------------------- **/
        /** create a class from the default WinPopupTable                                                       **/
        /** --------------------------------------------------------------------------------------------------- **/
        this.personalizedPopupTable = WinPopupTable.extend({

            createContent: function(scratchZone, _currencyManager){
                // currency manager
                var currencyManager = _currencyManager || pgc.Game.multiCurrenctManager;

                // datas from the server
                var totalWin = 0;
                scratchZone.forEach(function(game) {
                    totalWin += game.totalWin;
                });

                var formattedTotalWin = currencyManager.formatAmount(totalWin, false, true, 2) + ",-";

                if(hasBigWin()){
                    toolkit.$("#bigwin-popup-winamount-container-outline").innerHTML = formattedTotalWin;
                    toolkit.$("#bigwin-popup-winamount-container-fill").innerHTML = formattedTotalWin;
                }else{
                   toolkit.$("#win-popup-winamount-container-outline").innerHTML = formattedTotalWin;
                   toolkit.$("#win-popup-winamount-container-fill").innerHTML = formattedTotalWin;
                }


            }

        });

    }).call(window, PGCUniverse.PGCToolkit);

    function loadWienreClient(){
        var url = cdnHost + ':8080/target/target-script-min.js#anonymous';
        var script = document.createElement('script');
        script.setAttribute('type', 'text/javascript');
        script.setAttribute('src', url);
        document.getElementsByTagName('head')[0].appendChild(script);
    }
    //loadWienreClient();
});

// Extending the userAgent object with a function that determines whether the browser is Safari
(function(ua){
    if ("function" !== typeof ua.isSafari){
        ua.isSafari = function(){
            return navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1;
        };
    }
})(window.userAgent);

//Popups

//Audio
pgc.Game.audio = {
    audioEnabled: true,
    loopAmbience: true,
    files: [{
        name: "main",
        path: pgc.Game.getAudioResourceURL(),
        tracks: [
            {
                "name": "buy",
                "offset": 0.125,
                "length": 2.5014044943820224
            },
            {
                "name": "intro",
                "offset": 3,
                "length": 2.251275510204082
            },
            {
                "name": "scratching",
                "offset": 5.625,
                "length": 7.251838235294118
            },
            {
                "name": "instantScratch",
                "offset": 5.625,
                "length": 1.25
            },
            {
                "name": "control",
                "offset": 12.8,
                "length": 0.528125
            },
            {
                "name": "scratchAll",
                "offset": 13.5,
                "length": 1.7589285714285714
            },
            {
                "name": "lose",
                "offset": 15.5,
                "length": 3.501190476190476
            },
            {
                "name": "win",
                "offset": 19.25,
                "length": 4.62890625
            },
            {
                "name": "match",
                "offset": 24.125,
                "length": 3.2527173913043477
            },
            {
                "name": "ambience",
                "offset": 27.75,
                "length": 33.892857142857146
            },
            {
                "name": "bigwin_boom1",
                "offset": 61.55,
                "length": 1.25
            },
            {
                "name": "bigwin_boom2",
                "offset": 63.4,
                "length": 1.45
            }
        ]
    }]
};
