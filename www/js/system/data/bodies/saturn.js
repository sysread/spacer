define(["require", "exports"], function (require, exports) {
    "use strict";
    const saturn = {
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
        },
    };
    return saturn;
});
