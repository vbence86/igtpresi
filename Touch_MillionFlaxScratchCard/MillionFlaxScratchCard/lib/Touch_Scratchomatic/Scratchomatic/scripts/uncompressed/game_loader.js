
GAME.family	= GAME.getFamily("SCRATCHOMATIC");
GAME.name	= gameName;

//-- similar to the main.html
GAME.mainLaunchFile = "/lib/Games/" + gameName + "/lib/Touch_Scratchomatic/Scratchomatic/templates/main.tpl.php";
var gameVersion			= "1.0",
	FRAMEWORK_VERSION	= "1.0",
	portingVersion		= "2.0",
	imageHostName		= cdnHost,
	scriptHostName		= cdnHost,

	// global arrays for the resources to be preloaded
	aImg = [],
	aScriptList = [],

	// creating an object to have a standarized way to extend the list of resource to be preloaded
	preloadingConfig = (function(imgList, scriptList){

		var scriptGameURLPrefix = scriptHostName + "/lib/Games/" + gameName + "/scripts/" + jsDir,
			CDN_Host = urlConverter.CDN.host.replace(/\/$/, "") + "/",
			WebkitCoreGameImages = CDN_Host + urlConverter.CDN.url.WebkitCoreGameImages,
			ScratchoMatchGameImages = scriptHostName + "/lib/Games/" + gameName + "/lib/Touch_Scratchomatic/Scratchomatic/images" + urlConverter.CDN.device,
			scriptScratchomaticURLPrefix = scriptHostName + "/lib/Games/" + gameName + "/lib/Touch_Scratchomatic/Scratchomatic/scripts/" + jsDir;

		if (!imgList){
			throw "An array of images should be preloaded must be used as the first parameter!";
		}

		if (!scriptList){
			throw "An array of scripts should be preloaded must be used as the second parameter!";
		}

		return {

			/**
			 * Extending the list of images are being preloaded during the initialisation process.
			 * The object uses the cascade pattern so that you can chain the functions together.
			 * @param {[string]} img 			url pointing to the desired image         
			 * @param {[boolean]} crossOrigin	true if Origin header should be sent to the server
			 */
			addImage: function(url, crossOrigin){
				imgList.push( { src: url, crossOrigin: !!crossOrigin } );
				return this;
			},

			/**
			 * Extending the list of scripts are being preloaded during the initialisation process.
			 * The object uses the cascade pattern so that you can chain the functions together.
			 * @param {[type]} script URL pointing to the desired image
			 */
			addScript: function(script){
				scriptList.push(script);
				return this;
			},

			/**
			 * Returning with the game specific URL to access the javascript resources
			 * @return {[type]} [description]
			 */
			getGameScriptURL: function(){
				return scriptGameURLPrefix;
			},

			/**
			 * Returning with the URL pointing to the Scratchomatic javascript resources
			 * @return {[type]} [description]
			 */
			getScratchomaticScriptURL: function(){
				return scriptScratchomaticURLPrefix;
			},

			/**
			 * Returning with the game specific URL to access the image resources
			 * @return {[type]} [description]
			 */
			getGameImageURL: function(){
				return WebkitCoreGameImages;
			},

			/**
			 * Returning with the game specific URL to access the image resources
			 * @return {[type]} [description]
			 */
			getScratchomaticImageURL: function(){
				return ScratchoMatchGameImages;
			}
		};

	})(aImg, aScriptList);



// setting up the list of deafult resources 
preloadingConfig

	// ---------------------------------------------------------------------------------
	// images
	// ---------------------------------------------------------------------------------
	/* TODO: Generic PNGs should be loaded here. CDN reconfig required.*/
    /*.addImage(preloadingConfig.getScratchomaticImageURL() + "coin_brush.png", true);
preloadingConfig
    .addImage(preloadingConfig.getScratchomaticImageURL() + "key_brush.png", true)
    .addImage(preloadingConfig.getScratchomaticImageURL() + "coin.png")
    .addImage(preloadingConfig.getScratchomaticImageURL() + "key.png")
    .addImage(preloadingConfig.getScratchomaticImageURL() + "wand.png")
	*/
	// ---------------------------------------------------------------------------------
	// scripts 
	// ---------------------------------------------------------------------------------
	.addScript(scriptHostName + "/lib/util/PGCCanvas/scripts/" + jsDir + "PGCCanvas.js")
    .addScript(scriptHostName + "/lib/util/" + jsDir + "AudioController.js")

    // Please keep the loading precedence clean
    // pgc.GameStateMachine object is depended on StateMachine object and PGCUniverse.PGCToolkit
    // which declarations can be found in state-machine.js and PGCToolkit.js
    .addScript(scriptHostName + "/lib/util/PGCToolkit/scripts/" + jsDir + "PGCToolkit.js")
    .addScript(scriptHostName + "/lib/util/PGCGameStateMachine/scripts/" + jsDir + "state-machine.js")
    .addScript(scriptHostName + "/lib/util/PGCGameStateMachine/scripts/" + jsDir + "PGCGameStateMachine.js")
    .addScript(scriptHostName + "/lib/util/PGCCollision/scripts/" + jsDir + "PGCCollision.js")

    //custom code that uses the above libraries
    .addScript(preloadingConfig.getScratchomaticScriptURL() + "game.js")
    .addScript(preloadingConfig.getScratchomaticScriptURL() + "game_client.js")
    .addScript(preloadingConfig.getScratchomaticScriptURL() + "game_states.js")
    .addScript(preloadingConfig.getScratchomaticScriptURL() + "main.js")
    .addScript(preloadingConfig.getScratchomaticScriptURL() + "ScratchController.js")
	.addScript(preloadingConfig.getScratchomaticScriptURL() + "TimeLine.js")
    .addScript(preloadingConfig.getScratchomaticScriptURL() + "CanvasText.js")
    .addScript(preloadingConfig.getScratchomaticScriptURL() + "CanvasToolkit.js")
    .addScript(preloadingConfig.getScratchomaticScriptURL() + "ScratchMask.js")
    .addScript(preloadingConfig.getScratchomaticScriptURL() + "Symbol.js")
    .addScript(preloadingConfig.getScratchomaticScriptURL() + "SymbolGroup.js");