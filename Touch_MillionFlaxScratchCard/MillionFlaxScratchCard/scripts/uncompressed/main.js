pgc.Game.ready(function(){

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
        w("bonuswin-popup-button-text", "ingame.button.ok", "Ok");
        w("bonuswin-popup-title-container-outline", "ingame.popup.bonuswin.title", "", true);
        w("bonuswin-popup-title-container-fill", "ingame.popup.bonuswin.title", "", true);
        w("bonuswin-popup-text-container-outline", "ingame.popup.bonuswin.text");
        w("bonuswin-popup-text-container-fill", "ingame.popup.bonuswin.text");
        w("bonuswin-popup-subtext-container", "ingame.popup.bonuswin.subtext");

    })(writeText);

    /** --------------------------------------------------------------------------------- **/
    /** Check for specific browsers **/
    /** --------------------------------------------------------------------------------- **/
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

            var introMask = (function() {
                var source = document.createElement("canvas"),
                    ctx = source.getContext("2d");
                source.width = 277;
                source.height = 69;
                ctx.fillStyle = "black";
                ctx.fillRect(0, 0, 277, 206);
                return source;
            })();

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
                fontSize:       "7pt",
                fillStyle:      "white",
                strokeStyles:   ["black"],
                lineWidths:     ["2.5pt"]
            }).setBackgroundConfig({
                source:         isDesktop ? "game_scratch_symbols.png" : "game_scratch_symbols_mobile.png",
                sampleX:        isDesktop ? 107 : 104,
                sampleY:        isDesktop ? 51 : 50,
                sampleWidth:    isDesktop ? 81 : 86,
                sampleHeight:   isDesktop ? 57 : 61
            }).setPrizeConfig({
                fontFamily:     "FuturaBoldCondensedBT",
                fontSize:       "12pt",
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
                frames:         [{x: 294, y: 138}, {x: 196, y:138}, {x: 98, y: 138}, {x: 0, y: 138},
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
                frameRate:      84,
                visible:        false
            }).addAnimation({
                triggerCondition:   pgc.ScratchAnimationTriggers.WIN,
                timeLine:       new TimeLine()
                    .add(0, function() {
                        this.animatePart({
                            partName:       "winParticles",
                            visibleAfter:   false
                        });
                        this.pulse({
                            partName: "Prize",
                            firstScale: 1.2,
                            lastScale: 1,
                            totalTime: 500
                        });
                    })
            }).addAnimation({
                triggerCondition:   pgc.ScratchAnimationTriggers.START,
                groupTimeLine:      new TimeLine()
                    .add(0, function() {
                        //Put the symbols in initial positions for the intro animation
                        var symbols = this.getSymbols();
                        for(var i = 0; i < symbols.length; i++) {
                            symbols[i].forEachSprite(function(sprite) {
                                sprite.opacity = 0.0;
                                sprite.setScaling(0.7);
                            });
                        }
                    })
                    .add(367, function() {
                        this.triggerAnimation({
                            trigger:    pgc.ScratchAnimationTriggers.CUSTOM00,
                            symbols:    this.getSymbols().slice(0, 3)
                        });
                    })
                    .add(450, function() {
                        this.triggerAnimation({
                            trigger: pgc.ScratchAnimationTriggers.CUSTOM00,
                            symbols: this.getSymbols().slice(3, 6)
                        });
                    })
                    .add(533, function() {
                        this.triggerAnimation({
                            trigger: pgc.ScratchAnimationTriggers.CUSTOM00,
                            symbols: this.getSymbols().slice(6, 9)
                        });
                    })
            }).addAnimation({
                triggerCondition:   pgc.ScratchAnimationTriggers.CUSTOM00,
                timeLine:           new TimeLine()
                    .add(0, function() {
                        this.forEachSprite(function(sprite) {
                            sprite.fadeTo(1, 0.208);
                            sprite.growTo(1, 0.208);
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
                fontSize:       "7pt",
                fillStyle:      "white",
                strokeStyles:   ["black"],
                lineWidths:     ["1.5pt"]
            }).setBackgroundConfig({
                source:         isDesktop ? "game_scratch_symbols.png" : "game_scratch_symbols_mobile.png",
                sampleX:        isDesktop ? 80 : 107,
                sampleY:        isDesktop ? 120 : 125,
                sampleWidth:    isDesktop ? 60 : 82,
                sampleHeight:   isDesktop ? 30 : 50
            }).setPrizeConfig({
                fontFamily:     "FuturaBoldCondensedBT",
                fontSize:       "12pt",
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
                frameRate:      84,
                visible:        false
            }).addAnimation({
                triggerCondition:   pgc.ScratchAnimationTriggers.WIN,
                timeLine:       new TimeLine()
                    .add(0, function() {
                        this.animatePart({
                            partName:       "winParticles",
                            visibleAfter:   false
                        });
                        this.pulse({
                            partName: "Prize",
                            firstScale: 1.2,
                            lastScale: 1,
                            totalTime: 500
                        });
                    })
            }).addAnimation({
                triggerCondition:   pgc.ScratchAnimationTriggers.START,
                groupTimeLine:      new TimeLine()
                    .add(0, function() {
                        //Put the symbols in initial positions for the intro animation
                        var symbols = this.getSymbols();
                        for(var i = 0; i < symbols.length; i++) {
                            symbols[i].forEachSprite(function(sprite) {
                                sprite.opacity = 0.0;
                                sprite.setScaling(0.7);
                            });
                        }
                    })
                    .add(417, function() {
                        this.triggerAnimation({
                            trigger:    pgc.ScratchAnimationTriggers.CUSTOM00,
                            symbols:    this.getSymbols().slice(0, 3)
                        });
                    })
                    .add(500, function() {
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
                            sprite.fadeTo(1, 0.208);
                            sprite.growTo(1, 0.208);
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

                toolkit.$("#win-popup-winamount-container-outline").innerHTML = formattedTotalWin;
                toolkit.$("#win-popup-winamount-container-fill").innerHTML = formattedTotalWin;
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