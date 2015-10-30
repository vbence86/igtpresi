// Re-initialise the required namespace objects if they aren't introduced in the global scope
pgc = window.pgc || {};

// Game object for accumulating game-flow related informations 
pgc.Game = pgc.Game || {};

(function(game,UserData){

    function showAlert(message){
        if(pgc.SystemMessage){
            pgc.SystemMessage.showAlert(message);
        }else{
            alert(message);
        }
    }

	var interpret = function(response){
			return (function(resp){
				if (!resp)
					return {};
				// if it is parsed already we will return with the raw object
				if ('object' === typeof resp && !resp.responseText)
					return resp;
				// otherwise we try to parse it using the JSON library
				return JSON.parse(resp.responseText || resp) || {};
			})(response);
		},

        getDefaultQueryParams = function(){
            var queryString = location.search.substr(1),
                params = {};
            if (queryString && queryString.length > 0){
                queryString.split('&').forEach(function(val){
                    var keyValue = val && val.split('=');
                    if (!keyValue || !keyValue.length){
                        return;
                    }
                    params[keyValue[0]] = keyValue[1];
                });
            }
            return params;
        },

        /**
         * flag to keep track on if the buy message has been sent
         * @type {Boolean}
         */
        buyMessageProcessed = false,

        /**
         * flag to keep track on if the finish message has been sent
         * @type {Boolean}
         */
        finishMessageProcessed = false,
        serverTimeoutTimer = 0,
        serverTimeout = 0,
        flagHandleClientTimeout = false;

    function isClientTimedout(serverTimeout,responseTimestamp){
        var now = new Date().getTime();
        var ellapsedTime = now - responseTimestamp;
        if(ellapsedTime > serverTimeout){
            //-- display the server response error
            return true;

        }
        return false;
    }



	/**
	 * Create a default extendable Client object that handles communicating with the server
	 * @return {object} extendable object inherits from PGCClass
	 */
    game.DefaultClient = PGCClass.extend({
        responseTimestamp : 0,

		/**
		 * URL to access the server
		 * @type {String}
		 */
		requestURL: 'lib/Games/' + (gameName || (GAME && GAME.name)) + '/main.php',


        /** 
         * Default Query parameters fetched from the URL which was used to load the game
         * @type {object}
         */
        defaultQueryParams: {},

        /**
         * mocking contructor function
         */
        init : function(options){
            this.userdata = new UserData(StorageTypes.LOCAL_STORAGE);
            if(options && !isNaN(options.clientTimeout)){
                serverTimeout = options.clientTimeout;
                flagHandleClientTimeout = (options.clientTimeout)? true : false;
            }

            this.defaultQueryParams = getDefaultQueryParams();
        },

		/**
		 * Send HTTPRequest to the server 
		 * @param {object} request Object contaning all the key-value pairs being sent to the server
		 * @param {boolean} ignoreQueryString 
		 * @param {String} url (Optional) if omitted the default requestURL property will be used
		 * @return {object} Promise that has a "then" function to declare a listener to deal with the response
		 */
		sendRequest: function(request, ignoreQueryString){

			var self = this,
				deferrer = function(promise){

                    var queryString = "",
                        queryArray = [],
                        sessionKey;
                    if(!ignoreQueryString){
                        queryString = location.search.substr(1);
                        if(queryString && queryString.length > 0){
                            queryArray = queryString.split("&");
                            queryString = "?" +queryString;
                        }
                    }

                    if(queryArray.length > 0 ){
                        for(var i = 0; i < queryArray.length; i++){
                            if(queryArray[i]){
                                var queryparam = queryArray[i].split("=");

                                if(queryparam.length > 1 && queryparam[0] == "sessionKey"){
                                    sessionKey = queryparam[1];
                                    break;
                                }
                            }
                        }
                    }
//
//                    //-- this is for requests that don't launch with session key
                    if(sessionKey === undefined && self.userdata !== undefined){
                        sessionKey = self.userdata.getUserData(window.game_id+"-sessionKey") || undefined;
                        if(queryString && sessionKey !== undefined){
                            queryString += "&sessionKey="+sessionKey;
                        }
                    }else if ( sessionKey !== undefined && self.userdata !== undefined ) {
                        self.userdata.setUserData(window.game_id+"-sessionKey", sessionKey);
                    }

                    if ( sessionKey === undefined ) {
                        console.log("Didn't find the session key on the query string or in localstorage");
                    }



                    xhr = XHR(self.requestURL + queryString);
                    xhr.add("proto", "json");
                    for (var key in request){
                        xhr.add(key, request[key]);
                    }
                    game.timeoutManager.stop();
					xhr.done(function(resp){

                        try {

                            var responseObject = interpret(resp);
                            self.processResponse(responseObject);

                            // the callback should be called only when the processResponse doesn't throw an exception
                            if ('function' === typeof promise){
                                promise.call(self, responseObject);
                            }

                        } catch (ex){
                            console.log(ex);
                        }
					})
					.error(function (status){
						showAlert(getLocalisedStringWithDefaultText("sorryThereWasServerResponseError", "Beklager - serverfeil"));
					})
					.timeout(function (){
                        showAlert(getLocalisedStringWithDefaultText("server.timeout", "Beklager - ingen respons. Prøv igjen!"));
					}, 120000)
					.busy(function (lastRequest) {
						console.log("XHR is busy at the moment");
						console.log(lastRequest);
					})
					.send();


				};

			return {
				then: function(promise){
					deferrer(promise);
				}
			};

		},


		/**
		 * Handling the JSON response comes from the server
		 * @param  {String} response JSON response sent by the server in a String
		 * @return {void}  
		 */
		processResponse: function(response){

            this.responseTimestamp = (new Date().getTime());

            if(flagHandleClientTimeout){
                game.timeoutManager.listen(this.responseTimestamp);
            }

			var responseObject,
				functionToDelegate,
				parsedResponse;

			if (!response){
				throw "Invalid Response from the Server";
            }

			parsedResponse = interpret(response);

            if(this.userdata !== undefined && parsedResponse.sessionKey !== undefined){
                this.userdata.setUserData(window.game_id+"-sessionKey",parsedResponse.sessionKey,1,StorageTypes.LOCAL_STORAGE);
            }

            if(parsedResponse.display == "game"){
                // creating the Server object if it hasn't been ready yet
                if (!game.Server){
                    game.Server = {};
                }

                // storing the whole response in case we need a specific data from it
                ////We need to buffer the scards array so it is only overwritten when there is new data
                var scardsBuffer = game.Server.Response && game.Server.Response.scards ? game.Server.Response.scards : null;
                game.Server.Response = parsedResponse;
                if(!parsedResponse.scards) {
                    game.Server.Response.scards = scardsBuffer;
                }

                // putting a reference to the current game state
                game.gameState = parsedResponse.gameState;
                // setting the paytable from the server if it's sent
                if (game.Server.Response.paytable && game.Server.Response.paytable[0]){
                    game.Paytable = game.Server.Response.paytable[0];
                }

                if (game.Server.Response.price){
                    game.price = game.Server.Response.price;
                }

                if(game.gameState === "result"){
                    game.isBigWin = game.Server.Response.isBigWin;
                }

                // invoking a function before any kind of delegation
                if ("function" === typeof this.onresponse){
                    this.onresponse(parsedResponse);
                }

                // delegate the response to the appriproate handler function
                functionToDelegate = this[parsedResponse.gameState];
                if ("function" === typeof functionToDelegate){
                    functionToDelegate.call(this, parsedResponse);
                }else{

                }

            } else if (parsedResponse.messageType == "FORM" || parsedResponse.messageType == "ALERT" || parsedResponse.messageType == "MENU"){

                pgcTouch.PGC_MenuHandler.handleResponse({responseText : response.innerHTML});

            } else if(parsedResponse.alert){

                pgc.SystemMessage.handleError(parsedResponse);
                throw "Error message has been recieved";
            }


		},

        /**
         * Sending the "buy" reques to the server
         * @param {function} [callback] [optional callback function being invoked when the response is processed]
         * @return void
         */
        sendBuyMessage: function(callback){

            // guard for preventing the client to send multiple requests 
            // @TODO It should be reviewed as the StateMachine should never let the game to be able to trigger
            // those events that invoke very this function
            if (buyMessageProcessed){
                return;
            }

            finishMessageProcessed = false;

            this.sendRequest({
                getForm: 'buy',
                tickets: 1,
                chosenTheme: game.chosenTheme || 1
            }).then(function(resp){
                buyMessageProcessed = true;
                if ("function" === typeof callback){
                    callback(resp);
                }
            });

        },

        /**
         * Sending the "finish" request to the server 
         * @param {function} [callback] [optional callback function being invoked when the response is processed]
         * @return void
         */
        sendFinishMessage: function(callback){

            buyMessageProcessed = false;

            this.sendRequest({
                getForm: 'finish',
                scratchcardId: game.scardId
            }).then(function(resp){
                finishMessageProcessed = true;
                if ("function" === typeof callback){
                    callback(resp);
                }
            });

        },

        /**
         * Sending the "heartbeat" request to the server
         * @param {function} [callback] [optional callback function being invoked when the response is processed]
         * @return void
         */
        sendHeartbeatMessage: function(callback){

            this.sendRequest({
                getForm: 'heartbeat'
            }).then(function(resp){
                if ("function" === typeof callback){
                    callback(resp);
                }
            });

        },

		/**
		 * this function will be invoked regardless of the gameState
		 * @param  {[type]} responseObject [description]
		 * @return {[type]}                [description]
		 */
	    onresponse: function(responseObject){
	        var currency = responseObject.currency;

	        if ( !game.multiCurrencyManager ) {
	            game.multiCurrencyManager = new MultiCurrencyManager(currency);
	        }

	        game.userAppId = responseObject.userAppId;
	    },

		/**
		 * default mechanism of processing the "start" response
		 * @param  {object} responseObject interpreted JSON object representing the server response
		 * @return {void}
		 */
	    start: function(responseObject){
	    },

		/**
		 * default mechanism of processing the "result" response
		 * @param  {object} responseObject interpreted JSON object representing the server response
		 * @return {void}
		 */
	    result: function(responseObject){

			if (!responseObject.scards || !responseObject.scards.length)
				throw "Invalid Server response as \"scards\" property is missing.";

			game.scardId = responseObject.scards[0].id;
			game.ScratchZone = responseObject.scards[0].games[0];

	    },

        /**
         * returns true if the buy message has been sent
         * @return {Boolean} [description]
         */
        isBuyMessageProcessed: function(){
            return !!buyMessageProcessed;
        },

        /**
         * returns true if the finish message has been sent
         * @return {Boolean} [description]
         */
        isFinishMessageProcessed: function(){
            return !!finishMessageProcessed;
        }

    });

    /* -- TODO - START : Merchant specific events should be handled in a different JS file. */

    var onBeforeUnLoadEvent = false;

    function invokeCloseSession(event){
        event = event || window.event;
        if(!onBeforeUnLoadEvent){
            onBeforeUnLoadEvent = true;
            if(window.touchCasinoBrandConf && window.touchCasinoBrandConf.closeSession){
                game.Client.sendRequest({
                    getForm: 'goLobby'
                }).then(function(){});
            }
        }
    }
    window.addEventListener("pagehide",invokeCloseSession);

    window.onunload = window.onbeforeunload = invokeCloseSession;

    /* -- TODO - END : Merchant specific events should be handled in a different JS file. */

    game.timeoutManager = (function(){

        var timer = null,
            tickDelay = 750;

        function tick(lastResptime){
            if(isClientTimedout(serverTimeout,lastResptime)){
                //-- display the server response error
                var message = getLocalisedStringWithDefaultText("generic.client.timeout", "Du har blitt koblet fra på grunn av inaktivitet.");
                showAlert(message);
            }else{
                timer = setTimeout(tick,tickDelay,lastResptime);
            }
        }

        return {
            listen: function (responseTimestamp) {
                this.reset();
                tick(responseTimestamp);
            },

            stop: function(){
                this.reset();
            },

            reset: function () {
                clearTimeout(timer);
                timer = null;
            }
        };
    })();


	
})(pgc.Game,UserData);



pgc.SystemMessage = (function(toolkit,doc){
    var $ = toolkit.$;
    var ERROR_CODE = {
            ACCOUNT_ALERTS : "400"
        },
        ACTION = {
            SESSION_INVALID : "2",
            INSUFFICIENT_FUNDS : "4"
        };

    function handleError(alertobj){
        var serverAlert = alertobj.alert,
            errorAction = alertobj.errorAction || serverAlert.errorAction,
            errorCode   = alertobj.errorCode || serverAlert.errorCode,
            errorMessage,
            errorMessageIndex = 0;

        if(errorAction && errorCode){
            if(serverAlert && serverAlert.length && serverAlert[0].value){
                errorMessage = serverAlert.pop();
                this.showAlert(errorMessage.value);
            }else{
                 this.showAlert(getLocalisedStringWithDefaultText("generic.session.unavailable", "Game session invalid"));
            }
        }else{
            this.showAlert(getLocalisedStringWithDefaultText("generic.session.unavailable", "Game session invalid"));
        }

    }

    function showAlert(message){
        var systemAlerts = $("#systemAlerts");

        if(!systemAlerts){
            systemAlerts = doc.createElement("div");
            systemAlerts.id = "systemAlerts";
            document.body.appendChild(systemAlerts);
        }
        systemAlerts.innerHTML = '<div class="message"><p>'+message+'</p></div>';

        $(systemAlerts).addClass("show");
    }

    /**
     * Public object
     * */
    return {
        handleError : handleError,
        showAlert : showAlert
    };

})(PGCUniverse.PGCToolkit,document);



