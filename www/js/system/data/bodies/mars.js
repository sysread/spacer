define(["require", "exports"], function (require, exports) {
    "use strict";
    const mars = {
        name: 'Mars',
        type: 'planet',
        radius: 3389.9,
        mass: 6.4185e23,
        tilt: 25.19,
        elements: {
            format: 'jpl-3000-3000',
            base: {
                a: 1.52371243,
                e: 0.09336511,
                i: 1.85181869,
                L: -4.56813164,
                lp: -23.91744784,
                node: 49.71320984,
            },
            cy: {
                a: 0.00000097,
                e: 0.00009149,
                i: -0.00724757,
                L: 19140.29934243,
                lp: 0.45223625,
                node: -0.26852431,
            },
        },
        satellites: {
            phobos: {
                name: 'Phobos',
                type: 'moon',
                radius: (13.1 + 11.1 + 9.3) / 3,
                mass: 1.08e16,
                elements: {
                    format: 'jpl-satellites-table',
                    base: { a: 9376, e: 0.0151, i: 1.075, L: 448.9, lp: 357.841, node: 207.784 },
                    day: { M: 1128.8447569 },
                },
            },
            deimos: {
                name: 'Deimos',
                type: 'moon',
                radius: (7.8 * 6.0 * 5.1) / 3,
                mass: 1.80e15,
                elements: {
                    format: 'jpl-satellites-table',
                    base: { a: 23458, e: 0.0002, i: 1.788, L: 610.583, lp: 285.254, node: 24.525 },
                    day: { M: 285.1618790 },
                },
            },
        },
    };
    return mars;
});
