<!--
/**
 * =============================================================================
 * =============================================================================
 *
 * Copyright(C) Probability Games Corporation Limited 2010. All rights reserved.
 *
 * =============================================================================
 * =============================================================================
 */


-->
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN"
		"http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<? 
    include("../conf/conf.php");

    include_once("ClientReleaseVersion.php");


    $version		= getReleaseVersion(array($gameName, "Slottomatic"));
    $scratchomaticURL = "/lib/Games/$gameName/lib/Touch_Scratchomatic/Scratchomatic/"

?>
<html xmlns="http://www.w3.org/1999/xhtml" >
<head>
<title>&nbsp;</title>
<script  type="text/javascript">

// set up pgc namespace
var pgc = window.pgc || {};
pgc.config = pgc.config || {};

var gameName="<?=$gameName?>";
var portingVersion = "2.0";
var __visualiseHeartbeat ="<?php echo $_GET["showHeartbeat"] ? 'true' : 'false'; ?>";
<?
	 include("gameConf.php");

    /** -- To override for testing */
    $useUncompressed = $_GET["uncompressed"];
    if($useUncompressed){
        $jsDir = "uncompressed/";
    }
    echo	'var jsDir	= "'. $jsDir .'";';
?>
</script>
<script src="<?=_touchPortingHost?>/ClientReleaseVersion.php?paths=<?=$gameName?>,Scratchomatic" type="application/x-javascript" charset="utf-8"></script>
<script src="<?=_touchPortingHost.$scratchomaticURL?>scripts/util_js.php" type="application/x-javascript" charset="utf-8"></script>
<script src="<?=_touchPortingHost?>/i18n_Messages.php?merchantLocale=<?=$brandConf["".strtolower($brand)]["locale"]?>&paths=lib/Games/<?=$gameName?>/lib/Touch_Scratchomatic/Scratchomatic/translations,lib/Games/<?=$gameName?>/translations&singleDeploy=true" type="application/x-javascript" charset="utf-8"></script>
<script src="<?=_wapServer?>/tracking/trackme.php?t=<?=$t?>" type="application/x-javascript" charset="utf-8"></script>
<script type="text/javascript">
  var _trackingData = {"pageName" : "touchCasino/"+gameName};
</script>

<script type="text/javascript">
(function(){
	document.write('<style type="text/css" media="screen">@import "<?=_touchPortingHost?>/lib/jqtouch/jqtouch/styles' + urlConverter.device + 'jqtouch_css.php";</st'+'yle>');
	document.write('<style type="text/css" media="screen">@import "<?=_touchPortingHost?>/lib/jqtouch/themes/jqt/styles' + urlConverter.device + 'theme_css.php";</st'+'yle>');

	var scratchomaticURL = "<?=  $scratchomaticURL ?>",
		mainCSSURL = [scratchomaticURL, "styles", urlConverter.device, "main.css.php"].join(""),
		params = [
			["gameName", gameName].join("="),
			["releaseVer", window.clientReleaseVersion].join("=")
		];
        
    <?php if ($_GET["c"]) {  // get url parameter to pass on to main.php.css
        $colorID = intval($_GET["c"], 10);
        echo "params.push(\"c=$colorID\");";
        echo "pgc.config.colorVarientID=$colorID;";
    } ?>

	var mainCSSFullURL = [ mainCSSURL, params.join("&") ].join("?");
	var gameLoaderFullURL = [scratchomaticURL, "scripts/", "<?=$jsDir?>", "game_loader.js?releaseVer=<?=$version?>"].join("");

	document.write('<link rel="stylesheet" href="<?=_touchPortingHost?>' + mainCSSFullURL + '" />');
	document.write('<script src="<?=_touchPortingHost?>' + gameLoaderFullURL + '" type="application/x-javascript" charset="utf-8"></scr' + 'ipt>');
	document.write('<script src="<?=_touchPortingHost?>' + urlConverter.scripts + '<?=$jsDir?>game_loader.js?releaseVer=<?=$version?>" type="application/x-javascript" charset="utf-8"></scr' + 'ipt>');
}());
</script>

<link rel='stylesheet' href='<?=_touchPortingHost?>/lib/game_util/styles/framework.css' />
<link rel='stylesheet' href='<?=_touchPortingHost?>/lib/util/fonts/fontFace.css' />
<link rel='stylesheet' href='<?=_wapServer?>/customstyles/css.php?brand=<?=$brand?>&env=game' />
</head>

<?php
$locale = $brandConf[ strtolower($brand) ]['locale'];
?>

<body onload="onBodyLoad()" class="game-scratchcard<?php echo $locale ? (' ' . $locale) : ''; ?>">

    <div id="home" class="loadingScreen current">
        <div class="font_preload" style="opacity: 0">
            <span style="font-family:'FuturaBoldCondensedBT'; color:transparent;">t</span>
            <? include_once $_SERVER["DOCUMENT_ROOT"] . "/lib/Games/$gameName/static/fontpreload.html";?>
        </div>
        <? include_once("templates/splash.tpl.php"); ?>
    </div>
    
</body>
</html>