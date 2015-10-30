(function(game){

    pgc.Game.state("Summary", {

        enter: function(){

            // stop all sounds to stress the summary sound
            game.getAudioEngine().stopAll(false);

            // Win
            if (pgc.Game.Server.Response.scards[0].games[0].totalWin > 0 || pgc.Game.Server.Response.scards[0].games[1].totalWin > 0){

                var updateWinPopupTable = new personalizedPopupTable();
                updateWinPopupTable.createContent(game.Server.Response.scards[0].games, game.multiCurrencyManager);

                PopupHelper.showPopup("win-popup",true);
                game.getAudioEngine().playSound("main", "win");

                // No Win
            } else {

                PopupHelper.showPopup("nowin-popup",true);
                game.getAudioEngine().playSound("main", "lose");
            }
        }
    });

})(pgc.Game);