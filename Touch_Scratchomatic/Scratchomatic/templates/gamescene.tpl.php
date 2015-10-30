<div id="game-scene" class="scene CustomCursorArea">
        <div id="game-menu-container">
            <div id="logo" class="flaxLogoShadowed expendMiddleBounceSlow">
            </div>
        </div>

        <?php
        if (is_file($file = $_SERVER["DOCUMENT_ROOT"] . "/lib/Games/$gameName/static/introAnimation.html")){
            include_once $file;
        } else {
        ?>
            <div id="scratch-background" class="scratchBackgroundIntroAnimation"></div>
            <div id="scratch-logo" class="logoIntroAnimation"></div>

        <?php } ?>
        <div id="scratch-zone-container" class="popup">
            <? include_once $_SERVER["DOCUMENT_ROOT"] . "/lib/Games/$gameName/static/scratchzone.html";?>
        </div>


        <?php
            if (is_file($file = $_SERVER["DOCUMENT_ROOT"] . "/lib/Games/$gameName/static/scratch-all-button.html")){
                include_once $file;
            } else {
        ?>
        <div class="scratchAllButtonContainer CustomCursorArea">
            <div id="scratch-all-button" class="simpleFadeIn last-intro-animation">
                <div class="scratchAllButtonWrapper AlwaysAnimating buttonDefault"><p id="scratch-all-button-text"></p></div>
            </div>
        </div>
        <?php } ?>

        <?php 
            if (is_file($file = $_SERVER["DOCUMENT_ROOT"] . "/lib/Games/$gameName/static/nowin-popup.html")){
                include_once $file;
            } else {     
        ?>
        <div id="nowin-popup" class="popupDefault">
            <div class="popupContainer">
                <div id="nowin-popup-title-container" class="popupTitleDefault"></div>
                <div id="nowin-popup-content-container" class="popupContentDefault">
                    <div id="nowin-popup-text-container" class="popupTextDefault"></div>
                </div>
                <div class="popupButtonContainerDefault">
                    <div id="nowin-popup-okbutton" class="buttonDefault okButton"><p id="nowin-popup-button-text"></p></div>
                </div>
            </div>
        </div>
        <?php } ?>


        <?php 
            if (is_file($file = $_SERVER["DOCUMENT_ROOT"] . "/lib/Games/$gameName/static/win-popup.html")){
                include_once $file;
            } else {     
        ?>
        <div id="win-popup" class="popupDefault">
            <div class="popupContainer">
                <div class="winPopupCoinShowerContainer">
                    <div id="win-popup-coin-shower-container" class="winPopupCoinShower AlwaysAnimating cssAnimation"></div>
                </div>
                <div id="win-popup-title-container" class="popupTitleDefault"></div>
                <div id="win-popup-content-container" class="popupContentDefault">
                    <div id="win-popup-text-container" class="popupTextDefault"></div>
                    <div id="win-popup-winamount-container" class="popupTextDefault popupWinAmountText"></div>
                </div>
                <div class="popupButtonContainerDefault">
                    <div id="win-popup-okbutton" class="buttonDefault okButton"><p id="win-popup-button-text"></p></div>
                </div>
            </div>
        </div>
        <?php } ?>


        <?php 
            if (is_file($file = $_SERVER["DOCUMENT_ROOT"] . "/lib/Games/$gameName/static/bigwin-popup.html")){
                include_once $file;
            } else {
        ?>
        <div id="bigwin-popup" class="popupDefault">
            <div class="popupContainer">
                <div class="winPopupCoinShowerContainer">
                    <div id="bigwin-popup-coin-shower-container" class="winPopupCoinShower AlwaysAnimating cssAnimation"></div>
                </div>
                <div id="bigwin-popup-title-container" class="popupTitleDefault"></div>
                <div id="bigwin-popup-content-container" class="popupContentDefault">
                    <div id="bigwin-popup-text-container" class="popupTextDefault"></div>
                    <div id="bigwin-popup-winamount-container" class="popupTextDefault popupWinAmountText"></div>
                </div>
                <div class="popupButtonContainerDefault">
                    <div id="bigwin-popup-okbutton" class="buttonDefault okButton"><p id="bigwin-popup-button-text"></p></div>
                </div>
            </div>
        </div>
        <?php } ?>


        <? 
            // BONUS POPUP
            if (is_file($file = $_SERVER["DOCUMENT_ROOT"] . "/lib/Games/$gameName/static/bonus-popup.html")){
                include_once $file;
            }
        ?>

        <div id="sceneFader" class="sceneFader"></div>
        <div id="price-label" class="priceLabel"></div>

</div>
