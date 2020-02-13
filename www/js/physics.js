define(["require", "exports"], function (require, exports) {
    "use strict";
    class Physics {
        /*
         * distance([m,m,m], [m,m,m]) -> m
         */
        static distance(p0, p1) {
            return Math.hypot(p1[0] - p0[0], p1[1] - p0[1], (p1[2] || 0) - (p0[2] || 0));
        }
        /*
         * range(s, m/s, m/s/s) -> m
         */
        static range(t, v, a) {
            return (v * t) + (0.5 * a * t * t);
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
    Physics.C = 299792458; // m/s
    Physics.G = 9.80665; // m/s/s
    Physics.AU = 149597870700; // m
    window.Physics = Physics;
    return Physics;
});
