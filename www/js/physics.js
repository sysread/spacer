define(["require", "exports"], function (require, exports) {
    "use strict";
    function Helpers(stdlib, foreign = null, heap = null) {
        "use asm";
        var hypot = stdlib.Math.hypot;
        function distance(x1, y1, z1, x2, y2, z2) {
            x1 = +x1;
            y1 = +y1;
            z1 = +z1;
            x2 = +x2;
            y2 = +y2;
            z2 = +z2;
            return hypot(x2 - x1, y2 - y1, z2 - z1);
        }
        function range(t, v, a) {
            t = +t;
            v = +v;
            a = +a;
            // S = (v * t) + (0.5 * a * t^2)
            return (v * t) + (0.5 * a * t * t);
        }
        return {
            distance: distance,
            range: range,
        };
    }
    const helpers = Helpers({ Math: Math });
    class Physics {
        static get C() { return 299792458; } // m/s
        static get G() { return 9.80665; } // m/s/s
        static get AU() { return 149597870700; } // m
        /*
         * distance([m,m,m], [m,m,m]) -> m
         */
        static distance(p0, p1) {
            return helpers.distance(p0[0], p0[1], p0[2] || 0, p1[0], p1[1], p1[2] || 0);
        }
        /*
         * range(s, m/s, m/s/s) -> m
         */
        static range(t, v, a) {
            return helpers.range(t, v, a);
        }
        /*
         * segment(p0: [x,y,z], p1: [x,y,z], m)
         *
         * Finds a point [x,y,z] at distance d1 along line p1, p2.
         */
        static segment(p0, p1, d1) {
            const [x0, y0, z0] = p0;
            const [x1, y1, z1] = p1;
            const d = Physics.distance(p0, p1);
            const t = d1 / d;
            return [
                (((1 - t) * x0) + (t * x1)),
                (((1 - t) * y0) + (t * y1)),
                (((1 - t) * z0) + (t * z1))
            ];
        }
        /*
         * Finds the centroid, the center point, averaging all points
         * together.
         */
        static centroid(...points) {
            let sum_x = points.reduce((a, p) => a + p[0], 0);
            let sum_y = points.reduce((a, p) => a + p[1], 0);
            let sum_z = points.reduce((a, p) => a + (p[2] || 0), 0);
            return [
                sum_x / points.length,
                sum_y / points.length,
                sum_z / points.length,
            ];
        }
    }
    window.Physics = Physics;
    return Physics;
});
