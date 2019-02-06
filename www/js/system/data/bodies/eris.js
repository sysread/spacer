define(["require", "exports"], function (require, exports) {
    "use strict";
    var eris = {
        name: 'Eris',
        type: 'dwarfPlanet',
        radius: 1163,
        elements: {
            format: 'jpl-sbdb',
            base: {
                a: 67.74049521464768,
                e: 0.4388432770028211,
                i: 44.14436710156806,
                node: 35.90455847461126,
                //lp:   187.3023562449,
                lp: 35.90455847461126 + 151.6882902402569,
                //L:    392.0654311366,
                L: 35.90455847461126 + 151.6882902402569 + 205.3822650773641,
            },
            day: {
                M: 0.001771408442534513,
            },
        },
    };
    return eris;
});
