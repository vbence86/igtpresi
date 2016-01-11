/**
 * =============================================================================
 * =============================================================================
 *
 * Copyright(C) Probability Games Corporation Limited 2010. All rights reserved.
 *
 * =============================================================================
 * =============================================================================
 */
 .purchase-card.skin-1 { background-image: url('<?php echo getImage("lobby_img1.jpg"); ?>'); }
 .purchase-card.skin-2 { background-image: url('<?php echo getImage("lobby_img1.jpg"); ?>'); }
 .purchase-card.skin-3 { background-image: url('<?php echo getImage("lobby_img1.jpg"); ?>'); }

.Desktop .purchase-card.skin-1, .selection-card.skin-1 { background-image: url('<?php echo getImage("selection_img1.jpg"); ?>'); }
.Desktop .purchase-card.skin-2, .selection-card.skin-2 { background-image: url('<?php echo getImage("selection_img1.jpg"); ?>'); }
.Desktop .purchase-card.skin-3, .selection-card.skin-3 { background-image: url('<?php echo getImage("selection_img1.jpg"); ?>'); }

/** Backgrounds **/
#purchase-scene,
#selection-scene { background-image: url('<?php echo getImage("background1_crest.png"); ?>'); }

.scratchZoneBasicContainer,
.scratchZoneBonusContainer { background-image: url('<?php echo getImage("symbolgroup_background1_mobile.png"); ?>'); }

.Desktop .scratchZoneBasicContainer,
.Desktop .scratchZoneBonusContainer { background-image: url('<?php echo getImage("symbolgroup_background1_desktop.png"); ?>'); }

/** Sprites **/
.symbol-group-sprites { background-image: url('<?php echo getImage("game_scratch_symbols.png"); ?>'); }

.selectionLogo { background-image: url('<?php echo getImage("purchase_logo.png"); ?>'); }

/** Shadowed logo **/
.flaxLogoShadowed,
.selectionFlaxLogo { background-image: url('<?php echo getImage("flax_logo.png"); ?>'); }

/** Popup background **/
#bonuswin-popup.popupDefault { background-image: url('<?php echo getImage("pop_up.png"); ?>'); }
.popupDefault { background-image: url('<?php echo getImage("pop_up_lose.png"); ?>'); }

#win-popup { background-image: url('<?php echo getImage("pop_up_win.png"); ?>'); }
.sunburst { background-image: url('<?php echo getImage("sunburst.png"); ?>'); }
.particles { background-image: url('<?php echo getImage("particles.png"); ?>'); }
<!--#bigwin-popup-coin-shower-container.winPopupCoinShower { background-image: url('--><?php //echo getImage("coin_shower_1.png"); ?><!--'); }-->

<?php include_once realpath(dirname(__file__)) . '/fonts.css'; ?>
<?php include_once realpath(dirname(__file__)) . '/layout.css'; ?>
<?php include_once realpath(dirname(__file__)) . '/animations.css'; ?>
