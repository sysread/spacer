define(["require", "exports"], function (require, exports) {
    "use strict";
    var saturn = {
        name: 'Saturn',
        type: 'planet',
        radius: 60268,
        mass: 5.68319e26,
        tilt: 26.73,
        ring: {
            innerRadius: 66900,
            outerRadius: 137774,
        },
        elements: {
            format: 'jpl-3000-3000',
            base: {
                a: 9.54149883,
                e: 0.05550825,
                i: 2.49424102,
                L: 50.07571329,
                lp: 92.86136063,
                node: 113.63998702,
            },
            cy: {
                a: -0.00003065,
                e: -0.00032044,
                i: 0.00451969,
                L: 1222.11494724,
                lp: 0.54179478,
                node: -0.25015002,
            },
            aug: {
                b: 0.00025899,
                c: -0.13434469,
                s: 0.87320147,
                f: 38.35125000,
            },
        },
        satellites: {
            mimas: {
                name: 'Mimas',
                type: 'moon',
                radius: 198.8,
                mass: 375e17,
                elements: {
                    format: 'jpl-satellites-table',
                    base: { a: 185539, e: 0.0196, i: 1.574, L: 520.374, lp: 505.526, node: 173.027 },
                    day: { M: 381.9944948 },
                },
            },
            enceladus: {
                name: 'Enceladus',
                type: 'moon',
                radius: 252.3,
                mass: 10805e16,
                elements: {
                    format: 'jpl-satellites-table',
                    base: { a: 238042, e: 0.0000, i: 0.003, L: 542.269, lp: 342.583, node: 342.507 },
                    day: { M: 262.7318978 },
                },
            },
            tethys: {
                name: 'Tethys',
                type: 'moon',
                radius: 536.3,
                mass: 6176e17,
                elements: {
                    format: 'jpl-satellites-table',
                    base: { a: 294672, e: 0.0001, i: 1.091, L: 548.411, lp: 305.044, node: 259.842 },
                    day: { M: 190.6979109 },
                },
            },
            dione: {
                name: 'Dione',
                type: 'moon',
                radius: 562.5,
                mass: 109572e16,
                elements: {
                    format: 'jpl-satellites-table',
                    base: { a: 377415, e: 0.0022, i: 0.028, L: 896.962, lp: 574.73, node: 290.415 },
                    day: { M: 131.5349307 },
                },
            },
            rhea: {
                name: 'Rhea',
                type: 'moon',
                radius: 764.5,
                mass: 2309e18,
                elements: {
                    format: 'jpl-satellites-table',
                    base: { a: 527068, e: 0.0002, i: 0.333, L: 772.442, lp: 592.661, node: 351.042 },
                    day: { M: 79.6900459 },
                },
            },
            titan: {
                name: 'Titan',
                type: 'moon',
                radius: 2575.5,
                mass: 13455.3e19,
                elements: {
                    format: 'jpl-satellites-table',
                    base: { a: 1221865, e: 0.0288, i: 0.306, L: 371.902, lp: 208.592, node: 28.060 },
                    day: { M: 22.5769756 },
                },
            },
            hyperion: {
                name: 'Hyperion',
                type: 'moon',
                radius: 133,
                mass: 108e17,
                elements: {
                    format: 'jpl-satellites-table',
                    base: { a: 1500933, e: 0.1230061, i: 0.615, L: 653.367, lp: 567.025, node: 263.847 },
                    day: { M: 16.9199503 },
                },
            },
            iapetus: {
                name: 'Iapetus',
                type: 'moon',
                radius: 734.5,
                mass: 180.59e19,
                elements: {
                    format: 'jpl-satellites-table',
                    base: { a: 3560854, e: 0.0293, i: 8.298, L: 554.5, lp: 352.711, node: 81.105 },
                    day: { M: 4.5379416 },
                },
            },
            phoebe: {
                name: 'Phoebe',
                type: 'moon',
                radius: 106.6,
                mass: 8289e15,
                elements: {
                    format: 'jpl-satellites-table',
                    base: { a: 12947918, e: 0.1634, i: 175.243, L: 636.624, lp: 583.586, node: 241.086 },
                    day: { M: 0.6569114 },
                },
            },
        },
    };
    return saturn;
});
