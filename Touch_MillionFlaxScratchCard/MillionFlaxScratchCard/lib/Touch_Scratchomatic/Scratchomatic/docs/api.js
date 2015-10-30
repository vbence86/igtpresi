YUI.add("yuidoc-meta", function(Y) {
   Y.YUIDoc = { meta: {
    "classes": [
        "CanvasText",
        "CanvasToolkit",
        "EasingFunctions",
        "Point",
        "ScratchAnimationTriggers",
        "ScratchBrushTypes",
        "ScratchController",
        "ScratchGameTypes",
        "ScratchMask",
        "Symbol",
        "SymbolGroup",
        "SymbolZIndices",
        "TimeLine"
    ],
    "modules": [
        "CanvasText",
        "CanvasToolkit"
    ],
    "allModules": [
        {
            "displayName": "CanvasText",
            "name": "CanvasText",
            "description": "Describes a factory object that writes formatted text to an offscreen canvas element using fillText.\n - Can then be used as an image source for an {{#crossLink \"Actor\"}}{{/crossLink}} or written directly to an onscreen canvas element.\n - Gives a performance improvement over using fillText every frame.\n - Includes functions for font preload detection."
        },
        {
            "displayName": "CanvasToolkit",
            "name": "CanvasToolkit",
            "description": "Functions, shims and constants related to the HTML canvas element.\nRequired by the Canvas module, but useful without it."
        }
    ]
} };
});