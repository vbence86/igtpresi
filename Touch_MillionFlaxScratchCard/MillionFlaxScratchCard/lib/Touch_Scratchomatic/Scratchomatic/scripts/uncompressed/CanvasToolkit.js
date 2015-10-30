/**
 * Functions, shims and constants related to the HTML canvas element.
 * Required by the Canvas module, but useful without it.
 * @author Bob Moir on 06/03/2015.
 * @module CanvasToolkit
 */
// ----------------------------------------- //
//Shims
// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
// requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
// MIT license
(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame) {
        console.log("requestAnimationFrame not supported. Adding shim...");
        window.requestAnimationFrame = function (callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function () {
                    callback(currTime + timeToCall);
                },
                timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    }

    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = function (id) {
            clearTimeout(id);
        };
    }
}());
// ----------------------------------------- //

// ----------------------------------------- //
//Factories
(function (definition) {
    if (typeof exports === "object") {
        module.exports = definition();
    }
    else if (typeof window.define === "function" && window.define.amd) {
        window.define([], definition);
    } else {
        window.BezierEasing = definition();
    }
}(function () {
    // These values are established by empiricism with tests (tradeoff: performance VS precision)
    var NEWTON_ITERATIONS = 4;
    var NEWTON_MIN_SLOPE = 0.001;
    var SUBDIVISION_PRECISION = 0.0000001;
    var SUBDIVISION_MAX_ITERATIONS = 10;

    var kSplineTableSize = 11;
    var kSampleStepSize = 1.0 / (kSplineTableSize - 1.0);

    var float32ArraySupported = typeof Float32Array === "function";

    /**
     * Uses a cubic bezier curve to create a transition easing function.
     *  - Based on Firefox's nsSMILKeySpline.cpp
     *  - Easing concepts from <a href="http://greweb.me/2012/02/bezier-curve-based-easing-functions-from-concept-to-implementation/">here</a>.
     *  - Code 'borrowed' from <a href="https://github.com/gre/bezier-easing">here</a>.
     * @example
     *      var spline = BezierEasing(0.25, 0.1, 0.25, 1.0);
     *  spline(x) => returns the easing value | x must be in [0, 1] range
     * @method BezierEasing
     * @author Darren Beukes, 2014
     * @param {Number} mX1 X-Coordinate of the first handle point. Must be between 0 and 1.
     * @param {Number} mY1 Y-Coordinate of the first handle point. Must be between 0 and 1.
     * @param {Number} mX2 X-Coordinate of the second handle point. Must be between 0 and 1.
     * @param {Number} mY2 Y-Coordinate of the second handle point. Must be between 0 and 1.
     * @return {Function} A cubic bezier curve function of the type function(progress), where progress is a value between 0 and 1.
     */
    function BezierEasing (mX1, mY1, mX2, mY2) {
        // Validate arguments
        if (arguments.length !== 4) {
            throw new Error("BezierEasing requires 4 arguments.");
        }
        for (var i=0; i<4; ++i) {
            if (typeof arguments[i] !== "number" || isNaN(arguments[i]) || !isFinite(arguments[i])) {
                throw new Error("BezierEasing arguments should be integers.");
            }
        }
        if (mX1 < 0 || mX1 > 1 || mX2 < 0 || mX2 > 1) {
            throw new Error("BezierEasing x values must be in [0, 1] range.");
        }

        var mSampleValues = float32ArraySupported ? new Float32Array(kSplineTableSize) : new Array(kSplineTableSize);

        function A (aA1, aA2) { return 1.0 - 3.0 * aA2 + 3.0 * aA1; }
        function B (aA1, aA2) { return 3.0 * aA2 - 6.0 * aA1; }
        function C (aA1)      { return 3.0 * aA1; }

        // Returns x(t) given t, x1, and x2, or y(t) given t, y1, and y2.
        function calcBezier (aT, aA1, aA2) {
            return ((A(aA1, aA2)*aT + B(aA1, aA2))*aT + C(aA1))*aT;
        }

        // Returns dx/dt given t, x1, and x2, or dy/dt given t, y1, and y2.
        function getSlope (aT, aA1, aA2) {
            return 3.0 * A(aA1, aA2)*aT*aT + 2.0 * B(aA1, aA2) * aT + C(aA1);
        }

        function newtonRaphsonIterate (aX, aGuessT) {
            for (var i = 0; i < NEWTON_ITERATIONS; ++i) {
                var currentSlope = getSlope(aGuessT, mX1, mX2);
                if (currentSlope === 0.0) return aGuessT;
                var currentX = calcBezier(aGuessT, mX1, mX2) - aX;
                aGuessT -= currentX / currentSlope;
            }
            return aGuessT;
        }

        function calcSampleValues () {
            for (var i = 0; i < kSplineTableSize; ++i) {
                mSampleValues[i] = calcBezier(i * kSampleStepSize, mX1, mX2);
            }
        }

        function binarySubdivide (aX, aA, aB) {
            var currentX, currentT, i = 0;
            do {
                currentT = aA + (aB - aA) / 2.0;
                currentX = calcBezier(currentT, mX1, mX2) - aX;
                if (currentX > 0.0) {
                    aB = currentT;
                } else {
                    aA = currentT;
                }
            } while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITERATIONS);
            return currentT;
        }

        function getTForX (aX) {
            var intervalStart = 0.0;
            var currentSample = 1;
            var lastSample = kSplineTableSize - 1;

            for (; currentSample != lastSample && mSampleValues[currentSample] <= aX; ++currentSample) {
                intervalStart += kSampleStepSize;
            }
            --currentSample;

            // Interpolate to provide an initial guess for t
            var dist = (aX - mSampleValues[currentSample]) / (mSampleValues[currentSample+1] - mSampleValues[currentSample]);
            var guessForT = intervalStart + dist * kSampleStepSize;

            var initialSlope = getSlope(guessForT, mX1, mX2);
            if (initialSlope >= NEWTON_MIN_SLOPE) {
                return newtonRaphsonIterate(aX, guessForT);
            } else if (initialSlope === 0.0) {
                return guessForT;
            } else {
                return binarySubdivide(aX, intervalStart, intervalStart + kSampleStepSize);
            }
        }

        if (mX1 != mY1 || mX2 != mY2)
            calcSampleValues();

        var f = function (aX) {
            if (mX1 === mY1 && mX2 === mY2) return aX; // linear
            // Because JavaScript number are imprecise, we should guarantee the extremes are right.
            if (aX === 0) return 0;
            if (aX === 1) return 1;
            return calcBezier(getTForX(aX), mY1, mY2);
        };
        var str = "BezierEasing("+[mX1, mY1, mX2, mY2]+")";
        f.toString = function () { return str; };

        return f;
    }

    // CSS mapping
    BezierEasing.css = {
        "ease":        BezierEasing(0.25, 0.1, 0.25, 1.0),
        "linear":      BezierEasing(0.00, 0.0, 1.00, 1.0),
        "ease-in":     BezierEasing(0.42, 0.0, 1.00, 1.0),
        "ease-out":    BezierEasing(0.00, 0.0, 0.58, 1.0),
        "ease-in-out": BezierEasing(0.42, 0.0, 0.58, 1.0)
    };

    return BezierEasing;
}));
// ----------------------------------------- //

// ----------------------------------------- //
//Constants
/**
 * Enum for the standard CSS easing functions to utilise when tweening. Custom easing functions can also be created by calling BezierEasing() directly.
 * @class EasingFunctions
 */
EasingFunctions = {
    /**
     * Specifies a transition effect with the same speed from start to end.
     * @property LINEAR
     * @final
     * @type Function
     */
    LINEAR      : BezierEasing.css.linear,
    /**
     * Specifies a transition effect with a slow start, then fast, then slow end.
     * @property EASE
     * @final
     * @type Function
     */
    EASE        : BezierEasing.css.ease,
    /**
     * Specifies a transition effect with a slow start.
     * @property EASE_IN
     * @final
     * @type Function
     */
    EASE_IN     : BezierEasing.css["ease-in"],
    /**
     * Specifies a transition effect with a slow end.
     * @property EASE_OUT
     * @final
     * @type Function
     */
    EASE_OUT    : BezierEasing.css["ease-out"],
    /**
     * Specifies a transition effect with a slow start and end.
     * @property EASE_IN_OUT
     * @final
     * @type Function
     */
    EASE_IN_OUT : BezierEasing.css["ease-in-out"]
};
// ----------------------------------------- //

/**
 * Describes a point in cartesian space.
 * @class Point
 * @param {Number} x X-Coordinate
 * @param {Number} y Y-Coordinate
 * @constructor
 */
function Point(x, y) {
    this.x = x;
    this.y = y;
}

// ----------------------------------------- //
// Canvas functions
// ----------------------------------------- //
/**
 * A collection of useful functions for manipulating and animating canvas elements and image data.
 * @class CanvasToolkit
 * @type {{linearBezier: Function, radiansToDegrees: Function, degreesToRadians: Function, backingScale: Function, windowToCanvas: Function, canvasToCanvas: Function, wiggle: Function, lerp: Function, pointDistance: Function, collisionRect: Function, multiplyProperties: Function}}
 */
CanvasToolkit = {
    /**
     * Returns the dimensions of a rectangular grid given the contained squares' widths, heights and the padding between each square
     * @param {Number|Array} rows Number of items per column
     * @param {Number|Array} columns Number of items per row
     * @param {Number} width Item width
     * @param {Number} height Item height
     * @param {Object|Array} [innerPadding] amount of padding between items {row: {Number}, column: {Number}}
     * @return {Object}
     */
    getGridSize: function getGridSize(rows, columns, width, height, innerPadding) {
        var innerPad = innerPadding || {row: 0, column: 0};

        var gridWidth = (columns * width) + ((columns - 1) * innerPad.column);
        var gridHeight = (rows * height) + ((rows - 1) * innerPad.row);

        return{w: gridWidth, h: gridHeight};
    },

    /** Returns an array of the X and Y coordinates of the central squares of a grid given the width and height of the grid and the padding around it
     * @param {Number|Array} rows Number of items per column
     * @param {Number|Array} columns Number of items per row
     * @param {Object} dimensions width and height of the scene {w: {Number}, h: {Number}}
     * @param {Object|Array} [outerPadding] Amount of padding around the outside of the grid {left: {Number}, right: {Number}, top: {Number}, bottom: {Number}}
     */
    getGridPositions: function getGridPositions(rows, columns, dimensions, outerPadding) {
        var outerPad = outerPadding || {left: 0, right: 0, top: 0, bottom: 0};
        var xSpan = dimensions.w / columns;
        var xStart = xSpan / 2 + outerPad.left;
        var ySpan = dimensions.h / rows;
        var yStart = ySpan / 2 + outerPad.top;

        var positions = [];
        for(var yy = 0; yy < rows; yy++) {
            for(var xx = 0; xx < columns; xx++) {
                positions.push({x: xStart + (xx * xSpan), y: yStart + (yy * ySpan)});
            }
        }

        return positions;
    },

    /**
     * Helper method which applies a linear bezier tweening to the supplied variable
     * @method linearBezier
     * @param {Number} p1 The starting point of the animation
     * @param {Number} p2 The end point of the animation
     * @param {Number} t The total running time of this animation
     * @return {Number} the tweened attribute
     * @public
     */
    linearBezier: function linearBezier(p1, p2, t) {
        return p1 + (p2-p1) * t;
    },

    /**
     * Takes a number in radians and converts it to degrees
     * @method radiansToDegrees
     * @param {Number} radians
     * @return {number}
     * @public
     */
    radiansToDegrees: function radianToDegrees(radians) {
        return radians * (180/Math.PI);
    },

    /**
     * Takes a number in degrees and converts it to radians
     * @method degreesToRadians
     * @param degrees
     * @return {number}
     * @public
     */
    degreesToRadians: function degreesToRadians(degrees) {
        return degrees * (Math.PI/180);
    },


    /**
     * Finds the backing scaled used on the current context.
     * @method backingScale
     * @param {CanvasRenderingContext2D} context The context to use to check the backing scale.
     * @return {number} Backing scale ratio, clamped to 1 or 2.
     * @public
     */
    backingScale: function backingScale(context) {
        //var devicePixelRatio = Math.min(2, Math.max(window.devicePixelRatio, 1));
        //devicePixelRatio = (isNaN(devicePixelRatio)) ? 1 : devicePixelRatio;
        var devicePixelRatio = window.devicePixelRatio  || 1;

        var backingStoreRatio = context.webkitBackingStorePixelRatio ||
            context.mozBackingStorePixelRatio ||
            context.msBackingStorePixelRatio ||
            context.oBackingStorePixelRatio ||
            context.backingStorePixelRatio || 1;

        return devicePixelRatio/backingStoreRatio;
        /*
         var ratio = devicePixelRatio / backingStoreRatio;
        if (ratio === 3) {
            // this is a hack for 1920x1080 devices that refuse to draw at anything more than ratio 1.
            ratio = 1;
        } else if (ratio === 2) {
            if (userAgent.deviceName === "iPad") {
                ratio = 1;
            } else if (userAgent.OS === "default") {
                ratio = 1;
            }
        }

        // Floor the ratio for devices that report 1.5 pixel ratio that fudges the drawing of images for some reason (looking at you Android)
        return Math.floor(ratio);
        // note: devices which are 15 pixel ratio are now using large assets, so we must scale up the canvas backing scale, rather than down.
        //return Math.ceil(ratio);
        */
    },

    /**
     * Converts window coordinates to canvas coordinates.
     * @method windowToCanvas
     * @param {HTMLCanvasElement} canvas Reference to the canvas element.
     * @param {Number} x X-coordinate to convert.
     * @param {Number} y Y-coordinate to convert.
     * @return {{x: number, y: number}} Converted x and y coordinates in a Point.
     * @public
     */
    windowToCanvas: function windowToCanvas(canvas, x, y) {
        var bBox = canvas.getBoundingClientRect();

        return {
            x: (x - bBox.left) * (canvas.width / bBox.width),
            y: (y - bBox.top) * (canvas.height / bBox.height)
        };
    },

    /**
     * Converts canvas coordinates to window coordinates.
     * @method canvasToWindow
     * @param {HTMLCanvasElement} canvas Reference to the canvas element.
     * @param {Number} x X-coordinate to convert.
     * @param {Number} y Y-coordinate to convert.
     * @return {{x: number, y: number}} Converted x and y coordinates in a Point.
     * @public
     */
    canvasToWindow: function canvasToWindow(canvas, x, y) {
        var bBox = canvas.getBoundingClientRect();

        return {
            x: (x / (canvas.width / bBox.width)) + bBox.left,
            y: (y / (canvas.height / bBox.height)) + bBox.top
        };
    },

    /**
     * Converts one canvas' coordinates to another canvas' coordinates.
     * @method canvasToCanvas
     * @param {HTMLCanvasElement} canvas1 Reference to the source canvas element.
     * @param {Number} x X-coordinate to convert.
     * @param {Number} y Y-coordinate to convert.
     * @param {HTMLCanvasElement} canvas2 Reference to the destination canvas element.
     * @return {{x: number, y: number}} Converted x and y coordinates in a Point.
     * @public
     */
    canvasToCanvas: function canvasToCanvas(canvas1, x, y, canvas2) {
        var windowCoords = this.canvasToWindow(canvas1, x, y);
        return this.windowToCanvas(canvas2, windowCoords.x, windowCoords.y);
    },

    /**
     * Given a "container" html element and a pixel amount, returns the pixel amount converted to ems, such that an element placed in the container will be styled the same as if the pixel amount was used.
     * This is useful for styling elements that may change position depending on the
     * @method pixelsToEms
     * @param container {HTMLElement} The element that contains the pixel value we want to convert
     * @param pixelAmount {Number|String} The pixel amount as a number or as a string (e.g. "10px")
     * @returns {String}
     */
    pixelsToEms: function pixelsToEms(container, pixelAmount) {
        var px = parseInt(pixelAmount, 10);
        var fontSize = parseInt(getComputedStyle(container).fontSize, 10);

        return px / fontSize + "em";
    },

    /**
     * Adds or subtracts a random amount from value that is no greater than value * wiggleFactor
     * @method wiggle
     * @param {Number} wiggleFactor Max wiggle amount expressed as a ratio
     * @param {Number} value Value to apply wiggle to
     * @return {Number} The value, wiggled.
     * @public
     */
    wiggle: function wiggle(wiggleFactor, value) {
        var wiggleAmount = Math.random() * wiggleFactor * value;
        return value + (Math.random() > 0.5 ? wiggleAmount : -wiggleAmount);
    },

    /**
     * Performs a simple linear interpolation between two points
     * @method lerp
     * @param {Object} source The starting point
     * @param {Object} destination End point
     * @param {Number} progress A number between 0 and 1 indicating which point to return between source (0) and destination (1)
     * @return {{x: number, y: number}} The point between the two initial points
     * @public
     */
    lerp: function lerp(source, destination, progress) {
        var xx, yy;
        xx = source.x + ((destination.x - source.x) * progress);
        yy = source.y + ((destination.y - source.y) * progress);

        return {x: xx, y: yy};
    },

    /**
     * Returns the distance between two points
     * @method pointDistance
     * @param {Point} point1 First point.
     * @param {Point} point2 Second point.
     * @return {number} Absolute distance between the two points.
     * @public
     */
    pointDistance: function pointDistance(point1, point2) {
        var xsq = (point2.x - point1.x);
        xsq *= xsq;
        var ysq = (point2.y - point1.y);
        ysq *= ysq;

        return Math.sqrt(xsq + ysq);
    },

    /**
     * Given a line defined by two points, gives the distance to a third point
     * http://en.wikipedia.org/wiki/Distance_from_a_point_to_a_line
     * @method lineToPointDist
     * @param {Point} lStart Starting point of the line
     * @param {Point} lEnd End point of the line
     * @param {Point} point Point to find the distance to
     * @returns {Number}
     */
    lineToPointDist: function lineToPointDist(lStart, lEnd, point) {
        var numerator = Math.abs(((lEnd.y - lStart.y) * point.x) - ((lEnd.x - lStart.x) * point.y) + (lEnd.x * lStart.y) - (lEnd.y - lStart.x));
        var denominator = Math.sqrt(Math.pow((lEnd.y - lStart.y), 2) + Math.pow((lEnd.x - lStart.x), 2));
        return numerator / denominator;
    },

    /**
     * Given a line defined by two points and a third point, returns the point along the line that is closest to the third point
     * http://stackoverflow.com/questions/3120357/get-closest-point-to-a-line
     * http://en.wikipedia.org/wiki/Line%E2%80%93line_intersection
     * @param {Point} lStart Starting point of the line
     * @param {Point} lEnd End point of the line
     * @param {Point} point Point to find the closest point to
     * @returns {Point}
     */
    pointLineClosest: function pointLineClosest(lStart, lEnd, point) {
        var start2point = {x: point.x - lStart.x, y: point.y - lStart.y},               //Vector from lStart to point
            start2end = {x: lEnd.x - lStart.x, y: lEnd.y - lStart.y};                   //Vector from lStart to lEnd

        var s2e2 = Math.pow(start2end.x, 2) + Math.pow(start2end.y, 2),                 //Magnitude of the start2end vector
            s2pDOTs2e = (start2point.x * start2end.x) + (start2point.y * start2end.y);  //Dot product of the two vectors

        var norm = s2pDOTs2e / s2e2;                                                    //Normalised "distance" from lStart to the closest point

        return new Point(lStart.x + (start2end.x * norm), lStart.y + (start2end.y * norm));
    },

    /**
     * Given two points on each of two lines, gives the point of intersection between those lines
     * Returns null when lines are parallel or coincident
     * http://en.wikipedia.org/wiki/Line-line_intersection#Intersection_of_two_lines
     * @method pointOfIntersection
     * @param {Point} lStart1 Starting point of line 1
     * @param {Point} lEnd1 End point of line 1
     * @param {Point} lStart2 Starting point of line 2
     * @param {Point} lEnd2 End point of line 2
     * @returns {Point}|null
     */
    pointOfIntersection: function pointOfIntersection(lStart1, lEnd1, lStart2, lEnd2) {
        var x1 = lEnd1.x,
            x2 = lStart1.x,
            x3 = lEnd2.x,
            x4 = lStart2.x,
            y1 = lEnd1.y,
            y2 = lStart1.y,
            y3 = lEnd2.y,
            y4 = lStart2.y;

        var denominator = ((x1 - x2) * (y3 - y4)) - ((y1 - y2) * (x3 - x4));
        if(Math.abs(denominator) < 0.000001) {
            //lines are parallel or near parallel
            return null;
        }

        var numeratorX = (((x1 * y2) - (y1 * x2)) * (x3 - x4)) - ((x1 - x2) * ((x3 * y4) - (y3 * x4)));
        var numeratorY = (((x1 * y2) - (y1 * x2)) * (y3 - y4)) - ((y1 - y2) * ((x3 * y4) - (y3 * x4)));

        return new Point(numeratorX / denominator, numeratorY / denominator);
    },

    /**
     * Checks if two rectangles or bounding boxes intersect
     * @method collisionRect
     * @param {{x: Number, y: Number, w: Number, h: Number}} R1 First rectangle.
     * @param {{x: Number, y: Number, w: Number, h: Number}} R2 Second rectangle.
     * @return {boolean} True if the two rectangles touch at any point.
     * @public
     */
    collisionRect: function collisionRect(R1, R2) {
        var r1x2 = R1.x + R1.w,
            r1y2 = R1.y + R1.h,
            r2x2 = R2.x + R2.w,
            r2y2 = R2.y + R2.h;

        return (
        (r1x2 >= R2.x) &&
        (R1.X <= r2x2) &&
        (r1y2 >= R2.y) &&
        (R1.y <= r2y2));
    },

    /**
     * Applies a multiplier to all numerical properties in an array of objects. Useful for updating frame data for retina assets
     * @method multiplyProperties
     * @param {Array} array Object array
     * @param {Number} by Amount to multiply properties by
     * @public
     */
    multiplyProperties: function multiplyProperties(array, by) {
        for(var i = 0; i < array.length; i++) {
            for(var prop in array[i]) {
                if(array[i].hasOwnProperty(prop) && typeof(array[i][prop]) === "number") {
                    array[i][prop] *= by;
                }
            }
        }
    },



    // ----------------------------------------- //

    // ----------------------------------------- //
    //Experimental

    /**
     *
     * @param {WebGLRenderingContext} context
     * @param {String} code
     * @param {String} type
     * @returns {WebGLShader}
     */
    glCreateShader: function glCreateShader(context, code, type) {
        var shader = context.createShader(type);
        context.shaderSource(shader, code);
        context.compileShader(shader);
        if(!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
            throw context.getShaderInfoLog(shader);
        }
        return shader;
    },

    glLinkProgram: function glLinkProgram(context, program) {
        var vshader = createShader(program.vshaderSource, context.VERTEX_SHADER);
        var fshader = createShader(program.fshaderSource, context.FRAGMENT_SHADER);
        context.attachShader(program, vshader);
        context.attachShader(program, fshader);
        context.linkProgram(program);
        if (!context.getProgramParameter(program, context.LINK_STATUS)) {
            throw context.getProgramInfoLog(program);
        }
    },

    /**
     *
     * @param {WebGLRenderingContext} context
     * @param {String} vertex
     * @param {String} fragment
     */
    glCreateProgram: function glCreateProgram(context, vertex, fragment) {
        var program = context.createProgram();
        var vShader = this.glCreateShader(context, vertex, context.VERTEX_SHADER);
        var fShader = this.glCreateShader(context, fragment, context.FRAGMENT_SHADER);
        context.attachShader(program, vShader);
        context.attachShader(program, fShader);
        this.glLinkProgram(context, program);
        if(!context.getProgramParameter(program, context.LINK_STATUS)) {
            throw context.getProgramInfoLog(program);
        }
        return program;
    }
};
