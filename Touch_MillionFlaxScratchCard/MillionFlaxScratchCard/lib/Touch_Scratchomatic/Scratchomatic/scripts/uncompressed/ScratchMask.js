/**
 * Ratio of scratched mask rectangles allowed before a symbol counts as scratched (e.g. 0.6 = 60% scratched)
 * @property ScratchMaskConfig
 * @type {Number}
 */
var ScratchMaskConfig = {
    /**
     * Percentage of the mask rectangles that must be collided with for the symbol to be considered scratched. Expressed as a ratio.
     * @property SCRATCHED_THRESHOLD
     * @final
     * @type Number
     */
    SCRATCHED_THRESHOLD: 0.7,
    /**
     * max height in pixels of each collision rectangle in a ScratchMask.
     * @property SCRATCH_MASK_RECT_HEIGHT
     * @final
     * @type Number
     */
    SCRATCH_MASK_RECT_HEIGHT: 10,
    /**
     * max width in pixels of each collision rectangle in a ScratchMask.
     * @property SCRATCH_MASK_RECT_WIDTH
     * @final
     * @type Number
     */
    SCRATCH_MASK_RECT_WIDTH: 10
};

/**
 * @author Bob Moir on 19/06/2015.
 * @class ScratchMask
 * @extends PGCCollisionMask
 */
ScratchMask = PGCCollisionMask.extend({
    /**
     * Creates a mask object given a scratch_bBox object
     * @method init
     * @param {Object} scratch_bBox the area to detect scratches on
     */
    init: function init(scratch_bBox) {
        var _rows, _cols;
        _rows = Math.ceil(scratch_bBox.h / ScratchMaskConfig.SCRATCH_MASK_RECT_HEIGHT);
        _cols = Math.ceil(scratch_bBox.w / ScratchMaskConfig.SCRATCH_MASK_RECT_WIDTH);
        this._super(scratch_bBox.x, scratch_bBox.y, scratch_bBox.w, scratch_bBox.h, _cols, _rows);
        for(var i = 0; i < this.rects.length; i++) {
            this.rects[i].scratched = false;
        }
    },

    /**
     * Checks for collisions but remembers the rectangles that have been collided with
     * @param other
     */
    collisionRects: function collisionRects(other) {
        var collided = this._super(other);
        for(var i = 0; i < collided.length; i++) {
            collided[i].scratched = true;
        }
        return collided;
    },

    /**
     * Returns true when a given percentage of the mask is scratched
     * @method scratched
     */
    scratched: function scratched() {
        var numScratched = 0;
        for(var i = 0; i < this.rects.length; i++) {
            if(this.rects[i].scratched) {
                numScratched++;
            }
        }
        var scratchedRatio = numScratched / this.rects.length;
        return (scratchedRatio >= ScratchMaskConfig.SCRATCHED_THRESHOLD);
    },

    /**
     * Wrapper on the parent function that allows for use of centre-anchored coordinates
     * @method setPosition
     * @param {Number} x X-Coordinate of the centre of the symbol
     * @param {Number} y Y-Cordinate of the centre of the symbol
     */
    setPosition: function setPosition(x, y) {
        var left = x - (this.w * 0.5);
        var top = y - (this.h * 0.5);
        this._super(left, top);
    },

    /**
     * Forces the 'scratched' setting on this mask.
     * @param scratched {Boolean}
     */
    setScratched: function setScratched(scratched) {
        for(var i = 0; i < this.rects.length; i++) {
            this.rects[i].scratched = scratched;
        }
    }
}, "ScratchMask");
