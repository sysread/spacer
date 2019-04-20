define(["require", "exports"], function (require, exports) {
    "use strict";
    const mercury = {
        name: 'Mercury',
        type: 'planet',
        radius: 2440,
        mass: 3.302e23,
        tilt: 2.11,
        elements: {
            format: 'jpl-3000-3000',
            base: {
                a: 0.38709843,
                e: 0.20563661,
                i: 7.00559432,
                L: 252.25166724,
                lp: 77.45771895,
                node: 48.33961819,
            },
            cy: {
                a: 0.00000000,
                e: 0.00002123,
                i: -0.00590158,
                L: 149472.67486623,
                lp: 0.15940013,
                node: -0.12214182,
            },
        },
    };
    return mercury;
});
