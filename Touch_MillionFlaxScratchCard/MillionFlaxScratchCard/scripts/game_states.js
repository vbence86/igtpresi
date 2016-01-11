(function(game){

    pgc.Game.state("Summary", {

        enter: function(){

            // stop all sounds to stress the summary sound

            game.delayTimer = 1500;
            setTimeout(function () {
                // stop all sounds to stress the summary sound
                if (pgc.Game.Server.Response.scards[0].games[0].totalWin > 0 || pgc.Game.Server.Response.scards[0].games[1].totalWin > 0){

                    var updateWinPopupTable = new personalizedPopupTable();
                    updateWinPopupTable.createContent(game.Server.Response.scards[0].games, game.multiCurrencyManager);


                     if(hasBigWin()){
                        PopupHelper.showPopup("bigwin-popup",true);
                        pgc.Game.explosions = setInterval(function(){
                          var randomNum = Math.floor((Math.random() * 2) + 1);

                          pgc.Game.getAudioEngine().playSound("main", "bigwin_boom"+randomNum);
                        }, 500);
                        setTimeout(function(){
                          clearInterval(pgc.Game.explosions);
                        },4000);
                     }else{
                        PopupHelper.showPopup("win-popup",true);
                     }
                    game.getAudioEngine().stopAll(false);
                    game.getAudioEngine().playSound("main", "win");
                } else {
                    PopupHelper.showPopup("nowin-popup",true);
                    game.getAudioEngine().stopAll(false);
                    game.getAudioEngine().playSound("main", "lose");
                    game.delayTimer = 1000;
                }
            }, game.delayTimer);
            // Win

        }
    });

    // pgc.Game.state("Purchase", {
    //     enter: function() {
    //         this.default();
    //         pgc.Game.getAudioEngine().stopAll(false);
    //         clearInterval(pgc.Game.explosions);
    //
    //     }
    // });


})(pgc.Game);
