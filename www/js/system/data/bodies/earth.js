define(["require", "exports"], function (require, exports) {
    "use strict";
    const earth = {
        name: 'Earth',
        type: 'planet',
        radius: 6371.01,
        mass: 5.97219e24,
        tilt: 23.45,
        elements: {
            format: 'jpl-3000-3000',
            base: {
                a: 1.00000018,
                e: 0.01673163,
                i: -0.00054346,
                L: 100.46691572,
                lp: 102.93005885,
                node: -5.11260389,
            },
            cy: {
                a: -0.00000003,
                e: -0.00003661,
                i: -0.01337178,
                L: 35999.37306329,
                lp: 0.31795260,
                node: -0.24123856,
            },
        },
        satellites: {
            moon: {
                name: 'The Moon',
                type: 'moon',
                radius: 1737.4,
                mass: 734.9e20,
                tilt: 6.67,
                elements: {
                    format: 'jpl-satellites-table',
                    base: { a: 384400, e: 0.0554, i: 5.16, L: 578.5, lp: 443.23, node: 125.08 },
                    day: { M: 13.176358 },
                },
            },
        },
    };
    return earth;
});
