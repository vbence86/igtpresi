<?
header("Content-type: text/css");
header('Cache-control: public');
header('Expires: ' . gmdate('D, d M Y H:i:s', time() + 60 * 60 * 24) . ' GMT');

include $_SERVER["DOCUMENT_ROOT"] . "/porting.php";	

$releaseVer	= (isset($_GET["releaseVer"])) ? $_GET["releaseVer"] : 1;
$locale = isset($_GET["locale"]) ? ('/' . str_replace('_', '/', $_GET["locale"])) : '';
$multiplier = isset($_GET['multiplier']) ? ($_GET['multiplier'] > 1 ? 2 : 1) : 1;
$gameName = $_GET["gameName"];

$gamePath = $_SERVER["DOCUMENT_ROOT"] . "/lib/Games/" . $gameName;

function getImageURL() {
    global $_SERVER;
    global $_GET;
    global $media_multiplier;
    global $gameName;

    // Getting the converted part of the URL
    $_request_uri	= str_replace("480x800", "640x960", $_SERVER["REQUEST_URI"]);
    if ($media_multiplier > 1) {
        $_request_uri	= str_replace("320x480", "640x960", $_request_uri);
    }
    $parts			= explode( "/", $_request_uri);
    $neededParts	= array_slice($parts, 8, 5);
    $convertedPart	= implode("/", $neededParts);

    if (defined('GENIE_ACTIVATED')){
        $parts = explode('/', $_request_uri);
        $lastindex = 5;
        if($lastindex + 4 > (count($parts)-1)){
            $lastindex = (count($parts)-1);
        }
        $neededparts = array_slice($parts,8,$lastindex);
        // we need to clear the /layout part from the URL
        $parts = array_slice($parts, 0, count($parts) - 1);
        return implode('', array(
            GENIE_PROTOCOL,
            trim(GENIE_HOST, "/"),
            GENIE_WEBKIT_CORE_GAME_IMAGES,
            $gameName,
            '/',
            implode("/",$neededparts)
        ));
    }

    return rtrim(_cdnHost, "/") ."/lib/Games/". $gameName ."/images/". trim($convertedPart, "/") ."/";
}


function getImage($imageName) {
    global $releaseVer;

    $imageURL 		= getImageURL();
    return ( rtrim($imageURL, "/") ."/". trim($imageName, "/") ."?releaseVer=$releaseVer" );
};

?>

/**
 * =============================================================================
 * =============================================================================
 *
 * Copyright(C) Probability Games Corporation Limited 2010. All rights reserved.
 *
 * =============================================================================
 * =============================================================================
 */

/** Skin selection cards **/
.purchase-card.skin-1 { background-image: url('<?php echo getImage("lobby_img1.png"); ?>'); }
.purchase-card.skin-2 { background-image: url('<?php echo getImage("lobby_img2.png"); ?>'); }
.purchase-card.skin-3 { background-image: url('<?php echo getImage("lobby_img3.png"); ?>'); }

#game-menu-container .game-sprite { background-image: url('<?php echo getImage("game_sprites_all.png"); ?>'); }
.game-sprite-all { background-image: url('<?php echo getImage("game_sprites_all.png"); ?>'); }

/** Generic animation sprites **/
.winPopupCoinShower { background-image: url('<?php echo getImage("coin_shower.png"); ?>'); }

.sparkle-animation { background-image: url('<?php echo getImage("regular_win_loop.png"); ?>'); }

.howtoplay-title-text:before,
.paytable-title-text:before,
.info-page > .close-button{ background-image: url('<?php echo getImage("game_sprites_all.png"); ?>');}

.Desktop.selectedScratchTool-1 .CustomCursorArea { cursor: url('<?php echo getImage("coin.png") ?>') 18 39, url('<?php echo getImage("coin.cur") ?>'), auto; }
.Desktop.selectedScratchTool-2 .CustomCursorArea { cursor: url('<?php echo getImage("key.png") ?>') 10 50, url('<?php echo getImage("key.cur") ?>'), auto; }
.Desktop.selectedScratchTool-3 .CustomCursorArea { cursor: url('<?php echo getImage("wand.png") ?>') 20 20, url('<?php echo getImage("wand.cur") ?>'), auto; }

.IE11.selectedScratchTool-1 .CustomCursorArea { cursor: url('<?php echo getImage("coin.ico") ?>'), auto; }
.IE11.selectedScratchTool-2 .CustomCursorArea { cursor: url('<?php echo getImage("key.ico") ?>'), auto; }
.IE11.selectedScratchTool-3 .CustomCursorArea { cursor: url('<?php echo getImage("wand.ico") ?>'), auto; }

<?php
// Including generic CSS declarations
include_once realpath(dirname(__file__)) . "/layout.default.css";
include_once realpath(dirname(__file__)) . "/animations.default.css";

// Adding the default scaling options (deliberetaly to the end of this CSS)
include_once realpath(dirname(__file__)) . "/scale.default.css";

// Including the game specific CSS files if it exists
if (is_file($gameSpecificCSS = $gamePath . "/styles/main.css.php")){
    include_once $gameSpecificCSS;
}

?>
