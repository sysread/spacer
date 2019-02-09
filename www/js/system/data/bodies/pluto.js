define(["require", "exports"], function (require, exports) {
    "use strict";
    var pluto = {
        name: 'Pluto',
        type: 'dwarf',
        radius: 1195,
        mass: 1.307e22,
        tilt: 122.5,
        elements: {
            format: 'jpl-3000-3000',
            base: {
                a: 39.48686035,
                e: 0.24885238,
                i: 17.14104260,
                L: 238.96535011,
                lp: 224.09702598,
                node: 110.30167986,
            },
            cy: {
                a: 0.00449751,
                e: 0.00006016,
                i: 0.00000501,
                L: 145.18042903,
                lp: -0.00968827,
                node: -0.00809981,
            },
            aug: {
                b: -0.01262724,
            },
        },
    };
    return pluto;
});
