function writeText(a,b,c,d){var e;null!==document.getElementById(a)&&(void 0!==c&&c.length>0?e=getLocalisedStringWithDefaultText(b,c):b.length>0&&(e=getLocalisedString(b)),d&&(e=["&nbsp;",e,"&nbsp;"].join("")),document.getElementById(a).innerHTML=e)}!function(){for(var a=0,b=["webkit","moz"],c=0;c<b.length&&!window.requestAnimationFrame;++c)window.requestAnimationFrame=window[b[c]+"RequestAnimationFrame"],window.cancelAnimationFrame=window[b[c]+"CancelAnimationFrame"]||window[b[c]+"CancelRequestAnimationFrame"];window.requestAnimationFrame||(window.requestAnimationFrame=function(b,c){var d=(new Date).getTime(),e=Math.max(0,16-(d-a)),f=window.setTimeout(function(){b(d+e)},e);return a=d+e,f}),window.cancelAnimationFrame||(window.cancelAnimationFrame=function(a){clearTimeout(a)})}(),function(){"remove"in Element.prototype||(Element.prototype.remove=function(){this.parentNode.removeChild(this)})}(),function(a){"function"!=typeof a.isSafari&&(a.isSafari=function(){return-1!=navigator.userAgent.indexOf("Safari")&&-1==navigator.userAgent.indexOf("Chrome")})}(window.userAgent),function(a,b,c,d){var e=a.$,f=["animationend","webkitAnimationEnd","oanimationend","mozanimationend","MSanimationend"],g=function(){return"default"===userAgent.OS};this.game_main=function(a){if(userAgent.isAndroidStockBrowser()){var b=c.createElement("canvas"),d=c.getElementById("game-scene");b.width=10,b.height=10,b.style.position="fixed",d.insertBefore(b,d.childNodes[0]),c.body.classList.add("androidStockBrowser")}userAgent.isSafari()&&c.body.classList.add("Safari"),userAgent.isChrome()&&-1===userAgent.userAgentString.indexOf("SamsungBrowser")&&c.body.classList.add("Chrome"),pgc.Game.setupGameStateMachine(),pgc.Game.ScratchController=new ScratchController,pgc.Game.initAudio(),pgc.Game.trigger("ready"),pgc.Game.StateMachine.init(a)},this.initLocalisation=function(){writeText("bankTitle","toolbar.bankTitle"),writeText("betTitle","toolbar.betTitle"),writeText("winTitle","toolbar.winTitle"),writeText("purchase-button-text","purchase.button.purchase"),writeText("selection-title-text","selection.title"),writeText("scratch-all-button-text","ingame.button.scratch-all")},this.switchSceneTo=function(){var a;return function(b){b&&(a&&e("#"+a).removeClass("shown"),e("#"+b).addClass("shown"),a=b)}}(),function(a){var d=3,f="selected",g="unselected",h="selectionFinished",i=function(){var a,h=c.getElementsByClassName("purchase-card"),i=function(){e("#purchase-button").bind(DOMUtil.touchEvent,function(){e("#purchase-button").addClass("pressed"),"Intro"===pgc.Game.StateMachine.current&&b.initialise&&!b.initialise.hasItBeenCalled&&(pgc.Game.StateMachine.current="Purchase"),setChosenSkin(a||j()),pgc.Game.StateMachine.selection()})},j=function(){return Math.floor(Math.random()*d)+1},k=function(){for(var a=h.length-1;a>=0;a--)h[a].addEventListener(DOMUtil.touchEvent,function(){l(this),m(this)})},l=function(a){for(var b=h.length-1;b>=0;b--)e(h[b]).removeClass(f),e(h[b]).addClass(g);e(a).removeClass(g),e(a).addClass(f)},m=function(b){if(b){var c=/skin\-(\d)/.exec(b.className);c&&c[1]&&(a=parseInt(c[1]))}};i(),"default"===userAgent.OS&&pgc.Game.isOldSelectionFlow()&&k()},j=function(){var a,b=c.getElementsByClassName("selectionCardContainer"),d=e("#selection-scene"),g=function(){for(var a=b.length-1;a>=0;a--)b[a].addEventListener(DOMUtil.touchEvent,function(){i(this)})},i=function(a){e(d).hasClass(h)||(j(a),k(a),l(),m())},j=function(a){e(a).addClass(f),e(d).addClass(h)},k=function(b){if(b){var c=b.firstChild,d=/skin\-(\d)/.exec(c.className);d&&d[1]&&(a=parseInt(d[1]),setChosenSkin(a))}},l=function(){if(pgc.Game.isAudioEngineDelayedLoad())pgc.Game.preloadAudioMobileFallback();else try{pgc.Game.getAudioEngine().playSound(pgc.Game.ScratchController.skinSelect(pgc.Game.audio.names.main),pgc.Game.ScratchController.skinSelect(pgc.Game.audio.names.cardSelection))}catch(a){}pgc.Game.updateAmbientLastEventTime()},m=function(){e(c).wait(1e3).then(function(){pgc.Game.StateMachine.intro()})};g()},k=function(){var a=c.getElementsByClassName("selectionCardContainer"),b=e("#selection-scene"),d=function(){for(var b=a.length-1;b>=0;b--)e(a[b]).removeClass(f)},g=function(){e(b).removeClass(h)};d(),g()};a.initSelectionFlow=function(){i(),j()},a.resetSelectionFlow=function(){k()},a.MAX_SKINS=d}(b),this.setChosenSkin=function(a){if(a){pgc.Game.chosenTheme=a>0?a:1,pgc.Game.UserData&&pgc.Game.UserData.setUserData("chosenTheme",a);for(var b=0;b<MAX_SKINS;b++)e(c.body).removeClass(["Skin-",b+1].join(""));e(c.body).addClass("Skin-"+(a||pgc.Game.chosenTheme))}},this.initUserData=function(){var a=new UserData(StorageTypes.LOCAL_STORAGE),b=function(a){return[pgc.Game.userAppId,"-",pgc.Game.scardId,"_",a].join("")};a.setGameSpecificData=function(c,d){d&&c&&a.setUserData(b(c),d)},a.getGameSpecificData=function(c){return a.getUserData(b(c))},pgc.Game.UserData=a},this.loadUnfinishedGameData=function(){for(var a=0;a<pgc.Game.scratchSceneReferences.length;a++){var b;pgc.Game.scratchSceneReferences[a]&&(b=pgc.Game.UserData.getGameSpecificData(pgc.Game.scratchSceneReferences[a].id),null!==b&&"function"==typeof pgc.Game.scratchSceneReferences[a].load&&pgc.Game.scratchSceneReferences[a].load(b))}},this.resetSavedGameData=function(){for(var a=0;a<pgc.Game.scratchSceneReferences.length;a++)pgc.Game.UserData.setGameSpecificData(pgc.Game.scratchSceneReferences[a].id,JSON.stringify([]))},this.setScratchToolHandler=function(a){for(var d="selectedScratchTool",f=pgc.Game.UserData.getGameSpecificData(d)||1,g=e("#tool-button"),h=e(g).find(".selectableItemsContainer").getElementsByTagName("div"),i=e(g).find(".selectedItem"),j="data-value",k=function(a){return a.isIOS()||a.isAndroid()||a.isIEMobile()}(b.userAgent),l=function(a){a&&(e(c.body).removeClass("selectedScratchTool-"+pgc.Game.selectedScratchTool),pgc.Game.selectedScratchTool=parseInt(a.getAttribute(j))||1,i.setAttribute(j,pgc.Game.selectedScratchTool),pgc.Game.UserData.setGameSpecificData(d,pgc.Game.selectedScratchTool),e(c.body).addClass("selectedScratchTool-"+pgc.Game.selectedScratchTool),pgc.Game.idleManager&&pgc.Game.idleManager.reset())},m=function(a){a=parseInt(a);for(var b=h.length-1;b>=0;b--)if(a===parseInt(h[b].getAttribute(j)))return void l(h[b])},n=function(b){var c,d,e=k?1.75:1;pgc.Game.ScratchController&&a&&(b=parseInt(b)||1,c=a[b-1],d=3===b?pgc.ScratchBrushTypes.WAND:pgc.ScratchBrushTypes.SCRATCH,pgc.Game.ScratchController.setScratchBrush({brushType:d,brushSprite:c,scaling:e}),m(b))},o=h.length-1;o>=0;o--)h[o]&&(e(h[o]).hasClass("default")&&l(h[o]),h[o].addEventListener(DOMUtil.touchEvent,function(a){return function(){l(a),pgc.Game.trigger("scratchtoolchanged",pgc.Game.selectedScratchTool),n(pgc.Game.selectedScratchTool)}}(h[o])));pgc.Game.setScratchToolById=n,n(f)},this.addEventListeners=function(){var a=c.getElementById("tool-button"),b=c.getElementById("tool-button-box"),d=c.getElementById("tool-button-items"),f=c.getElementById("scratch-all-button-text");this.scratchEventListeners={toolButton:function(){e(b),e(b),e(d);a&&(a.hasClass("disabled")||(a.hasClass("opened")?(a.removeClass("opened"),b.removeClass("opened"),d.removeClass("opened")):(a.addClass("opened"),b.addClass("opened"),d.addClass("opened")),pgc.Game.idleManager.reset()))},scratchAll:function(){if("InGame"===pgc.Game.StateMachine.current&&!e(this).hasClass("disabled")){for(var a=pgc.Game.symbolGroupReferences.length-1;a>=0;a--)pgc.Game.symbolGroupReferences[a].revealAll();pgc.Game.updateAmbientLastEventTime(),pgc.Game.getAudioEngine().playSound(pgc.Game.ScratchController.skinSelect(pgc.Game.audio.names.main),pgc.Game.ScratchController.skinSelect(pgc.Game.audio.names.scratchAll)),pgc.Game.idleManager.reset()}}},a&&a.addEventListener(DOMUtil.touchEvent,this.scratchEventListeners.toolButton),f&&f.addEventListener(DOMUtil.touchEvent,this.scratchEventListeners.scratchAll),listenToLastAnimation(),["nowin-popup","win-popup","bigwin-popup","bonuswin-popup"].forEach(function(a){c.getElementById(a)&&PopupHelper.addPopupButtonListener(a).press(function(){pgc.Game.EndGamePopupConfirmed=!0,pgc.Game.StateMachine.finish()}).onHideAnimationEnd(function(){pgc.Game.StateMachine.finish()})}),PopupHelper.addPopupButtonListener("popup-scene-container").click(function(){pgc.Game.StateMachine.inGame()})},this.listenToLastAnimation=function(){var a=e(".last-intro-animation");if(null!==a){for(var c=f.length-1;c>=0;c--)a.unbind(f[c]);a.bind(f,function(a){var c=a||b.event;this.id==c.target.id&&"InGame"!==pgc.Game.StateMachine.current&&pgc.Game.StateMachine.inGame(),pgc.Game.trigger("lastintroanimation",a)})}},this.PopupHelper=function(a){var b=a.$,c={},d=!1;return{addPopupButtonListener:function(e){var g=b("#"+e),h=b("#sceneFader"),i=g&&b(g).find(".okButton"),j=b(".main-game-bar"),k=!1,l=new a.EventDispatcher,m=function(a){var c=b("#sceneFader"),e=b(".main-game-bar");d=a||!1,k=!0,b(g).addClass("shown"),c&&(c.addClass("shown"),e&&e.addClass("hideBehindFader"))},n=function(a,c){k&&b(g).addClass("simpleFadeOut").bind(f,function(){for(var e in f)b(g).unbind(f[e]);b(g).removeClass("shown"),k=!1,!h||d&&!c||h.removeClass("shown"),j&&j.removeClass("hideBehindFader"),i&&i.removeClass("pressed"),"function"==typeof a&&a(),b(g).removeClass("simpleFadeOut"),l.dispatch("hideAnimationEnd")})},o={click:function(a){return i?(i.bind(DOMUtil.touchEvent,function(){n(a),pgc.Game.getAudioEngine().playSound(pgc.Game.ScratchController.skinSelect(pgc.Game.audio.names.main),pgc.Game.ScratchController.skinSelect(pgc.Game.audio.names.control),function(){pgc.Game.getAudioEngine().playSound(pgc.Game.ScratchController.skinSelect(pgc.Game.audio.names.main),pgc.Game.ScratchController.skinSelect(pgc.Game.audio.names.close))})}),this):this},press:function(a){return i?(i.bind(DOMUtil.touchEvent,function(){i.addClass("pressed"),"function"==typeof a&&a(this),pgc.Game.getAudioEngine().playSound(pgc.Game.ScratchController.skinSelect(pgc.Game.audio.names.main),pgc.Game.ScratchController.skinSelect(pgc.Game.audio.names.control),function(){pgc.Game.getAudioEngine().playSound(pgc.Game.ScratchController.skinSelect(pgc.Game.audio.names.main),pgc.Game.ScratchController.skinSelect(pgc.Game.audio.names.close))})}),this):this},onHideAnimationEnd:function(a){return l.addEventListener("hideAnimationEnd",a),this},hide:function(a,b){return n(a,b),this},show:function(a){return m(a),this},isShown:function(){return!!k}};return c[e]=o,o},hideSceneFader:function(){var a=b("#sceneFader");a&&a.removeClass("shown")},showPopup:function(a,d){var e=c[a];e&&(b("body").addClass("onPopUp"),e.show(d))},hidePopup:function(a,d){var e=c[a];e&&(b("body").removeClass("onPopUp"),e.hide(null,d))},hideAll:function(a){if(c){for(var d in c)c[d]&&"function"==typeof c[d].hide&&c[d].hide(null,a);b("body").removeClass("onPopUp")}},isAllHidden:function(){if(!c)return!0;for(var a in c)if(c[a]&&"function"==typeof c[a].isShown&&c[a].isShown())return!1;return!0}}}(a),this.hasInstantWin=function(a){return getInstantWinAmount(a)>0},this.getInstantWinAmount=function(a){var b=a.winningCombinations;return b&&b[-1]&&parseInt(b[-1].winAmount)||0},this.hasWin=function(a){var b=a.winningCombinations;return b&&Object.keys(b).length},this.hasBigWin=function(a){return pgc.Game.isBigWin&&"true"==pgc.Game.isBigWin},this.refreshScratchSceneHack=function(a){if(a){var b=Array.prototype.concat.call(a);b.forEach(function(a){a.context.clearRect(0,0,1,1)})}},function(){pgc.Game.idle(function(){var a=e(".scratchAllButtonWrapper");a&&a.animateOnce("Idle")},5e3)}(),function(a){a&&pgc.Game.heartbeat(function(){var a=e(c.body),b="Heartbeat";a.addClass(b).wait(1e3).then(function(){a.removeClass(b)})},5e3)}("true"===__visualiseHeartbeat),function(a){function d(){try{return b.self!==b.top}catch(a){return!0}}function e(){return new RegExp(/C6603/).test(userAgent.userAgentString)}function f(){var a=!!navigator.userAgent.match(/Trident\/7\.0/),b=!!navigator.userAgent.match(/.NET4\.0E/),c=!!navigator.userAgent.match(/.rv\:11/);return a&&(b||c)}function h(){return userAgent.userAgentString.match(/Windows NT 6\.3/)}d()&&a.$(c.body).addClass("IFrame"),g()&&a.$(c.body).addClass("Desktop"),e()&&a.$(c.body).addClass("SonyXperiaZ"),userAgent.isIPhone()&&a.$(c.body).addClass("iPhone"),f()&&a.$(c.body).addClass("IE11"),h()&&a.$(c.body).addClass("Windows81"),userAgent.isChrome()&&!userAgent.isDesktop()&&userAgent.isAndroid()&&a.$(c.body).addClass("ChromeAndroid")}(a),b.touchCasinoBrandConf&&b.touchCasinoBrandConf.clientTimeout&&(pgc.Game.clientOptions={clientTimeout:touchCasinoBrandConf.clientTimeout})}(PGCUniverse.PGCToolkit,window,window.document);var WinPopupTable=PGCClass.extend({init:function(){this.$=PGCUniverse.PGCToolkit.$},createRow:function(a){var b,c,d,e,f;if(a){for(c=document.createElement("div"),c.setAttribute("class","wintable-row"),d=0,e=a.length;e>d;d++)b=document.createElement("div"),b.setAttribute("class","wintable-column"),f=document.createElement("p"),f.innerHTML=a[d],b.appendChild(f),c.appendChild(b);return c}},createContent:function(a,b){var c,d=b||pgc.Game.multiCurrenctManager,e=a.userFoils,f=a.winningCombinations,g=a.playFields,h=a.totalWin;if(!(a&&e&&f&&g))throw"Invalid object has been passed to update the WinPopup!";for(var i=this.$("#win-popup-wintable-container");i.firstChild;)i.removeChild(i.firstChild);for(c in f)if(!(isNaN(parseInt(c))||0>=c)){var j=[e[parseInt(c)-1],d.formatAmount(f[c].winAmount,!1,!0,2)+",-"];i.appendChild(this.createRow(j))}var k=d.formatAmount(h,!1,!0,2)+",-";totalRow=this.createRow([getLocalisedString("ingame.popup.total.text"),k]),i.appendChild(totalRow)}});