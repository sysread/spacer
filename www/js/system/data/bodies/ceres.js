define(["require", "exports"], function (require, exports) {
    "use strict";
    const ceres = {
        name: 'Ceres',
        type: 'dwarfPlanet',
        radius: 476.2,
        mass: 9.393e20,
        tilt: 4,
        elements: {
            format: 'jpl-sbdb',
            day: { M: 0.2140341110610894 },
            base: { a: 2.767880825324262, e: 0.07568276766977486, i: 10.59240162556512, L: 420.0192342788, lp: 153.217647542, node: 80.30985818155804 },
        },
    };
    return ceres;
});
