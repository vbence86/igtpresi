/**
 * Describes a list of callbacks that are fired at specific times after a starting point. Improves on the PGCContainer timeline implementation.
 * @class TimeLine
 * @constructor
 */
TimeLine = function(target) {
    // ----------------------------------------- //
    //Private properties
    var _that = this,
        _target = target || null,       //The object to apply the timeline to.
        _times = [],                    //Array. Each entry gives the number of milliseconds to wait after the start of the timeline before firing a callback from the _callbacks array.
        _callbacks = [],                //Array of callback functions, each of which fire after the number of milliseconds given in the corresponding entry in _times.
        _progressTimer = 0,             //Number of milliseconds that the timeline has been running for
        _run = false,                   //True when the timeline is running
        _loop = false,                  //Set to true to make the timeline continue from the beginning
        _TIMELINE_GRANULARITY = 0.01;   //Constant. 1/_TIMELINE_GRANULARITY = the max allowed simultaneous callbacks on a timeline. If you need more than a hundred you should probably refactor..
    // ----------------------------------------- //
    //Public get/set functions
    /**
     * @method getLooping
     * @returns {Boolean}
     */
    this.getLooping = function getLooping() {
        return _loop;
    };

    /**
     * Turns on and off looping the timeline
     * @method timeLineLoop
     * @public
     * @returns {TimeLine} This timeline, so functions can be chained
     */
    this.setLooping = function setLooping(loop) {
        _loop = loop;
        return _that;
    };

    /**
     * @method getTarget
     * @returns {Object}
     */
    this.getTarget = function getTarget() {
        return _target;
    };

    /**
     * Sets the "Target" object - all callbacks will be bound to this object.
     * @method setTarget
     * @param target
     * @returns {TimeLine} This timeline, so functions can be chained
     */
    this.setTarget = function setTarget(target) {
        _target = target;
        return _that;
    };
    // ----------------------------------------- //
    //Public functions

    /**
     * Advances the timeline and fires any callbacks that are due. Called by the Symbol during animation sequences. Named "step" to avoid confusion with the PGCScene update function.
     * @method step
     * @param {Number} delta Milliseconds since the last step.
     * @private
     */
    this.step = function step(delta) {
        if(!_run) {
            return;
        }
        var func,
            tLProgress = _progressTimer + delta;
        for (var i = 0; i < _times.length; i++) {
            if (_times[i] < _progressTimer) {
                //callback has already been called
                continue;
            } else if (_times[i] < tLProgress) {
                //callback is ready but hasn't been called yet
                func = (_callbacks[i]).bind(_target);
                func();
                //Check for paused timeline
                if (!_run) {
                    tLProgress = _times[i] + _TIMELINE_GRANULARITY; //we want the progress paused just after the callback that paused it
                    break;
                }
            }
        }
        if (tLProgress > _times[_times.length - 1]) {
            //end of timeline
            if(_loop) {
                _that.start();
            } else {
                _that.stop();
            }
        } else {
            _progressTimer = tLProgress;
        }
    };

    /**
     * Adds a callback to the timeline.
     * @method add
     * @param {Number} milliseconds Fire the supplied callback function after this number of milliseconds.
     * @param {Function} callback Callback to fire.
     * @public
     * @returns {TimeLine} This timeline, so functions can be chained
     */
    this.add = function timeLineAdd(milliseconds, callback) {
        //Insert the timeline to the sorted place in the list
        for(var i = 0; i < _times.length; i++) {
            if(_times[i] > milliseconds) {
                break;
            }
        }
        if(_times[i] < milliseconds) {
            //Adding to the end of the list
            _times.push(milliseconds);
            _callbacks.push(callback);
        } else if(Math.floor(_times[i]) === milliseconds) {
            //Adding to the end of the list, but we need to modify its activation time to maintain execution order
            _times.push(_times[i] + _TIMELINE_GRANULARITY);
            _callbacks.push(callback);
        } else {
            //Inserting somewhere in the middle of the timeline
            if(Math.floor(_times[i - 1]) === milliseconds) {
                //function happens at the same time as the previous one, so modify its activation time to maintain execution order
                _times.splice(i, 0, _times[i - 1] + _TIMELINE_GRANULARITY);
                _callbacks.splice(i, 0, callback);
            } else {
                //function happens between i-1 and i
                _times.splice(i, 0, milliseconds);
                _callbacks.splice(i , 0, callback);
            }
        }
        return _that;
    };

    /**
     * Starts this timeline from the beginning.
     * @method start
     * @public
     * @returns {TimeLine} This timeline, so functions can be chained
     */
    this.start = function start() {
        if (_times.length > 0) {
            _progressTimer = 0;
            _run = true;
        }
        //If there are callbacks at ~0ms, fire them immediately
        _that.step(_TIMELINE_GRANULARITY);
        return _that;
    };

    /**
     * Stops this timeline and resets its position to the start.
     * @method stop
     * @public
     * @returns {TimeLine} This timeline, so functions can be chained
     */
    this.stop = function stop() {
        _progressTimer = 0;
        _run = false;
        return _that;
    };

    /**
     * Pauses this timeline.
     * @method timeLinePause
     * @public
     * @returns {TimeLine} This timeline, so functions can be chained
     */
    this.pause = function pause() {
        _run = false;
        return _that;
    };

    /**
     * Unpauses this timeline and resumes it from its current position.
     * @method timeLineResume
     * @public
     * @returns {TimeLine} This timeline, so functions can be chained
     */
    this.resume = function resume() {
        _run = true;
        return _that;
    };

    /**
     * Creates a deep-copy of this timeline, with an option to change its target at the same time.
     * @method clone
     * @param [target] The new timeline's target object. Defaults to the same target as this timeline.
     */
    this.clone = function clone(target) {
        target = target || _target;
        var copy = new TimeLine(target);

        for(var i = 0; i < _times.length; i++) {
            copy.add(_times[i], _callbacks[i]);
        }

        return copy;
    };

    /**
     * Check if the timeline is currently running
     * @method isRunning
     * @returns {Boolean} if the timeline is running or not
     */
    this.isRunning = function isRunning() {
        return _run;
    };

    /**
     * Get the current progress of the timeline. Begins from the start of the current loop.
     * @method getProgress
     * @returns {Number} Progress of the timeline, in milliseconds
     */
    this.getProgress = function getProgress() {
        return _progressTimer;
    };

    /**
     * @method toString
     * @returns {String}
     */
    this.toString = function toString() {
        var str = "----TimeLine----\n";
        for(var i = 0; i < _times.length; i++) {
            str += "T: " + _times[i] + "\n";
            str += "Callback:\n";
            str += _callbacks[i].toString();
            str += "\n---\n";
        }
        str += "----------------\n";
        return str;
    };
};