
/**
 * Whether the Debugging Mode should be enabled.
 * @type {boolean}
 * @see {@link https://wiki.probability.co.uk/display/DEV/Debugging+Mode}
 */
var DEBUG_THIS_GAME = false;

// List all the game specific files that are requied
// preloadingConfig.getGameScriptURL points to the appropriate "scripts" folder belongs to the game
// preloadingConfig.getGameImageURL points to the appropriate "images" folder belongs to the game
preloadingConfig

	// images
	// @TODO please put the loading of the "selection_img*.png" resources into Scratchomatic 
	// once every of the scratchgames supports the new selection flow
	.addImage(preloadingConfig.getGameImageURL() + "selection_img1.jpg")
	.addImage(preloadingConfig.getGameImageURL() + "lobby_img1.jpg")

    .addImage(preloadingConfig.getGameImageURL() + "game_scratch_symbols.png", true)
	.addImage(preloadingConfig.getGameImageURL() + "game_scratch_symbols_mobile.png", true)
	.addImage(preloadingConfig.getGameImageURL() + "particles.png", true)

	.addImage(preloadingConfig.getGameImageURL() + "scratch_off.png", true)
    .addImage(preloadingConfig.getGameImageURL() + "scratch_off_bonus.png", true)
    .addImage(preloadingConfig.getGameImageURL() + "scratch_off_bonus_desktop.png", true)
    .addImage(preloadingConfig.getGameImageURL() + "scratch_off_bonus_mobile.png", true)

	.addImage(preloadingConfig.getGameImageURL() + "coin_brush.png", true)
	.addImage(preloadingConfig.getGameImageURL() + "key_brush.png", true)

	.addImage(preloadingConfig.getGameImageURL() + "game_sprites_all.png")
	.addImage(preloadingConfig.getGameImageURL() + "coin_shower.png")	
	.addImage(preloadingConfig.getGameImageURL() + "game_splash.png")

	// scripts
	.addScript(preloadingConfig.getGameScriptURL() + "game_client.js")
	.addScript(preloadingConfig.getGameScriptURL() + "game_states.js")
	.addScript(preloadingConfig.getGameScriptURL() + "main.js");
