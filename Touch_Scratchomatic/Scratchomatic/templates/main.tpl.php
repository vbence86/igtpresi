<?
$gameName = $_GET["gameName"];

$gameDir = $SERVER["DOCUMENT_ROOT"]."/lib/Games/$gameName";

$scratchomaticDir = $gameDir ."/lib/Touch_Scratchomatic/Scratchomatic";
?>
<div id="maingame" class="current_gameScene min-viewport-height">
    <div id="game-universe">
        <div id="game">
        	<div id="heartbeatSymbol"></div>
            <div class="secondary-game-bar">
                <div id="sound-button" class="game-sprite-all hidden"></div>
            </div>
            <div class="main-game-bar">
	            <div>
		            <div id="tool-button" class="slideDownFadeInBounce1_20Delay selectButtonDefault">
			            <div id="tool-button-box" class="selectedItemContainer">
				            <div class="tool-label game-sprite-all"></div>
				            <div class="selectedItem icon game-sprite-all"></div>
			            </div>
			            <div id="tool-button-items" class="selectableItemsContainer">
				            <div class="icon game-sprite-all default" data-value="1"></div>
				            <div class="icon game-sprite-all" data-value="2"></div>
				            <div class="icon game-sprite-all" data-value="3"></div>
			            </div>
		            </div>
	            </div>

                <div id="user-balance" class="balance-info">
                    <p>Saldo</p>
                </div>

                <div id="help-button" class="game-sprite-all buttonDefault" ><div id="help-button-wrapper" class="help-button-wrapper"></div> </div>


            </div>

            <?php 
            	if (is_file($file = $_SERVER["DOCUMENT_ROOT"] . "/lib/Games/$gameName/static/gamescene.html")){
            		include_once $file;
            	} else {
            		include_once $_SERVER["DOCUMENT_ROOT"] . "/lib/Games/$gameName/lib/Touch_Scratchomatic/Scratchomatic/templates/gamescene.tpl.php";
            	}
            ?>

            <?php
            if (is_file($file = $_SERVER["DOCUMENT_ROOT"] . "/lib/Games/$gameName/static/custompage.html")){
                include_once $file;
            }
            ?>

             <?php
            if (is_file($file = $_SERVER["DOCUMENT_ROOT"] . "/lib/Games/$gameName/static/infopage.html")){
                include_once $file;
            } else {
                include_once $_SERVER["DOCUMENT_ROOT"] . "/lib/Games/$gameName/lib/Touch_Scratchomatic/Scratchomatic/templates/infopage.tpl.php";
            }
            ?>

            <?php
            if (is_file($file = $_SERVER["DOCUMENT_ROOT"] . "/lib/Games/$gameName/static/purchasescene.html")){
                include_once $file;
            } else {
                include_once $_SERVER["DOCUMENT_ROOT"] . "/lib/Games/$gameName/lib/Touch_Scratchomatic/Scratchomatic/templates/purchasescene.tpl.php";
            }
            ?>

            <?php
            if (is_file($file = $_SERVER["DOCUMENT_ROOT"] . "/lib/Games/$gameName/static/selectionscene.html")){
                include_once $file;
            } else {
                include_once $_SERVER["DOCUMENT_ROOT"] . "/lib/Games/$gameName/lib/Touch_Scratchomatic/Scratchomatic/templates/selectionscene.tpl.php";
            }
            ?>



        </div>
    </div>
</div>
