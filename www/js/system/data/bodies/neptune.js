define(["require", "exports"], function (require, exports) {
    "use strict";
    const neptune = {
        name: 'Neptune',
        type: 'planet',
        radius: 24624,
        mass: 102.41e24,
        tilt: 29.56,
        elements: {
            format: 'jpl-3000-3000',
            base: {
                a: 30.06952752,
                e: 0.00895439,
                i: 1.77005520,
                L: 304.22289287,
                lp: 46.68158724,
                node: 131.78635853,
            },
            cy: {
                a: 0.00006447,
                e: 0.00000818,
                i: 0.00022400,
                L: 218.46515314,
                lp: 0.01009938,
                node: -0.00606302,
            },
            aug: {
                b: -0.00041348,
                c: 0.68346318,
                s: -0.10162547,
                f: 7.67025000,
            },
        },
        satellites: {
            triton: {
                name: 'Triton',
                type: 'moon',
                radius: 1352.6,
                mass: 214.7e20,
                tilt: 0.010,
                elements: {
                    format: 'jpl-satellites-table',
                    base: { a: 354759, e: 0, i: 156.865, L: 596.007, lp: 243.75, node: 177.608 },
                    day: { M: 61.2572638 },
                },
            },
        },
    };
    return neptune;
});
