pgc=window.pgc||{},pgc.Game=pgc.Game||{},function(a,b){function c(a){pgc.SystemMessage?pgc.SystemMessage.showAlert(a):alert(a)}function d(a,b){var c=(new Date).getTime(),d=c-b;return d>a?!0:!1}function e(b){b=b||window.event,l||(l=!0,window.touchCasinoBrandConf&&window.touchCasinoBrandConf.closeSession&&a.Client.sendRequest({getForm:"goLobby"}).then(function(){}))}var f=function(a){return function(a){return a?"object"!=typeof a||a.responseText?JSON.parse(a.responseText||a)||{}:a:{}}(a)},g=function(){var a=location.search.substr(1),b={};return a&&a.length>0&&a.split("&").forEach(function(a){var c=a&&a.split("=");c&&c.length&&(b[c[0]]=c[1])}),b},h=!1,i=!1,j=0,k=!1;a.DefaultClient=PGCClass.extend({responseTimestamp:0,requestURL:"lib/Games/"+(gameName||GAME&&GAME.name)+"/main.php",defaultQueryParams:{},init:function(a){this.userdata=new b(StorageTypes.LOCAL_STORAGE),a&&!isNaN(a.clientTimeout)&&(j=a.clientTimeout,k=a.clientTimeout?!0:!1),this.defaultQueryParams=g()},sendRequest:function(b,d){var e=this,g=function(g){var h,i="",j=[];if(d||(i=location.search.substr(1),i&&i.length>0&&(j=i.split("&"),i="?"+i)),j.length>0)for(var k=0;k<j.length;k++)if(j[k]){var l=j[k].split("=");if(l.length>1&&"sessionKey"==l[0]){h=l[1];break}}void 0===h&&void 0!==e.userdata?(h=e.userdata.getUserData(window.game_id+"-sessionKey")||void 0,i&&void 0!==h&&(i+="&sessionKey="+h)):void 0!==h&&void 0!==e.userdata&&e.userdata.setUserData(window.game_id+"-sessionKey",h),void 0===h&&console.log("Didn't find the session key on the query string or in localstorage"),xhr=XHR(e.requestURL+i),xhr.add("proto","json");for(var m in b)xhr.add(m,b[m]);a.timeoutManager.stop(),xhr.done(function(a){try{var b=f(a);e.processResponse(b),"function"==typeof g&&g.call(e,b)}catch(c){console.log(c)}}).error(function(a){c(getLocalisedStringWithDefaultText("sorryThereWasServerResponseError","Beklager - serverfeil"))}).timeout(function(){c(getLocalisedStringWithDefaultText("server.timeout","Beklager - ingen respons. Prøv igjen!"))},12e4).busy(function(a){console.log("XHR is busy at the moment"),console.log(a)}).send()};return{then:function(a){g(a)}}},processResponse:function(b){this.responseTimestamp=(new Date).getTime(),k&&a.timeoutManager.listen(this.responseTimestamp);var c,d;if(!b)throw"Invalid Response from the Server";if(d=f(b),void 0!==this.userdata&&void 0!==d.sessionKey&&this.userdata.setUserData(window.game_id+"-sessionKey",d.sessionKey,1,StorageTypes.LOCAL_STORAGE),"game"==d.display){a.Server||(a.Server={});var e=a.Server.Response&&a.Server.Response.scards?a.Server.Response.scards:null;a.Server.Response=d,d.scards||(a.Server.Response.scards=e),a.gameState=d.gameState,a.Server.Response.paytable&&a.Server.Response.paytable[0]&&(a.Paytable=a.Server.Response.paytable[0]),a.Server.Response.price&&(a.price=a.Server.Response.price),"result"===a.gameState&&(a.isBigWin=a.Server.Response.isBigWin),"function"==typeof this.onresponse&&this.onresponse(d),c=this[d.gameState],"function"==typeof c&&c.call(this,d)}else if("FORM"==d.messageType||"ALERT"==d.messageType||"MENU"==d.messageType)pgcTouch.PGC_MenuHandler.handleResponse({responseText:b.innerHTML});else if(d.alert)throw pgc.SystemMessage.handleError(d),"Error message has been recieved"},sendBuyMessage:function(b){h||(i=!1,this.sendRequest({getForm:"buy",tickets:1,chosenTheme:a.chosenTheme||1}).then(function(a){h=!0,"function"==typeof b&&b(a)}))},sendFinishMessage:function(b){h=!1,this.sendRequest({getForm:"finish",scratchcardId:a.scardId}).then(function(a){i=!0,"function"==typeof b&&b(a)})},sendHeartbeatMessage:function(a){this.sendRequest({getForm:"heartbeat"}).then(function(b){"function"==typeof a&&a(b)})},onresponse:function(b){var c=b.currency;a.multiCurrencyManager||(a.multiCurrencyManager=new MultiCurrencyManager(c)),a.userAppId=b.userAppId},start:function(a){},result:function(b){if(!b.scards||!b.scards.length)throw'Invalid Server response as "scards" property is missing.';a.scardId=b.scards[0].id,a.ScratchZone=b.scards[0].games[0]},isBuyMessageProcessed:function(){return!!h},isFinishMessageProcessed:function(){return!!i}});var l=!1;window.addEventListener("pagehide",e),window.onunload=window.onbeforeunload=e,a.timeoutManager=function(){function a(f){if(d(j,f)){var g=getLocalisedStringWithDefaultText("generic.client.timeout","Du har blitt koblet fra på grunn av inaktivitet.");c(g)}else b=setTimeout(a,e,f)}var b=null,e=750;return{listen:function(b){this.reset(),a(b)},stop:function(){this.reset()},reset:function(){clearTimeout(b),b=null}}}()}(pgc.Game,UserData),pgc.SystemMessage=function(a,b){function c(a){var b,c=a.alert,d=a.errorAction||c.errorAction,e=a.errorCode||c.errorCode;d&&e&&c&&c.length&&c[0].value?(b=c.pop(),this.showAlert(b.value)):this.showAlert(getLocalisedStringWithDefaultText("generic.session.unavailable","Game session invalid"))}function d(a){var c=e("#systemAlerts");c||(c=b.createElement("div"),c.id="systemAlerts",document.body.appendChild(c)),c.innerHTML='<div class="message"><p>'+a+"</p></div>",e(c).addClass("show")}var e=a.$;return{handleError:c,showAlert:d}}(PGCUniverse.PGCToolkit,document);