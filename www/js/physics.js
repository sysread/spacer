var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
define(["require", "exports"], function (require, exports) {
    "use strict";
    var Physics = /** @class */ (function () {
        function Physics() {
        }
        Object.defineProperty(Physics, "C", {
            get: function () { return 299792458; } // m/s
            ,
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Physics, "G", {
            get: function () { return 9.80665; } // m/s/s
            ,
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Physics, "AU", {
            get: function () { return 149597870700; } // m
            ,
            enumerable: true,
            configurable: true
        });
        /*
         * distance([m,m,m], [m,m,m]) -> m
         */
        Physics.distance = function (p0, p1) {
            return Math.hypot(p1[0] - p0[0], p1[1] - p0[1], (p1[2] || 0) - (p0[2] || 0));
        };
        /*
         * deltav(kN, kg) -> m/s/s
         */
        Physics.deltav = function (kn, kg) {
            return kn / kg;
        };
        /*
         * force(kg, m/s/s) -> kN
         */
        Physics.force = function (kg, dv) {
            return kg * dv;
        };
        /*
         * range(s, m/s, m/s/s) -> m
         */
        Physics.range = function (t, v, a) {
            // S = (v * t) + (0.5 * a * t^2)
            return (v * t) + (0.5 * a * Math.pow(t, 2));
        };
        /*
         * requiredDeltaV(s, m) -> m/s/s
         *
         *  a = (2s / t^2) - (2v / t)
         */
        Physics.requiredDeltaV = function (t, d, v) {
            if (v === void 0) { v = 0; }
            return ((2 * d) / (t * t)) - ((2 * v) / t);
        };
        /*
         * velocity(s, m/s, m/s/s) -> m/s
         */
        Physics.velocity = function (t, v, a) {
            return v + (a * t);
        };
        /*
         * segment(p0: [x,y,z], p1: [x,y,z], m)
         *
         * Finds a point [x,y,z] at distance d1 along line p1, p2.
         */
        Physics.segment = function (p0, p1, d1) {
            var _a = __read(p0, 3), x0 = _a[0], y0 = _a[1], z0 = _a[2];
            var _b = __read(p1, 3), x1 = _b[0], y1 = _b[1], z1 = _b[2];
            var d = Physics.distance(p0, p1);
            var t = d1 / d;
            return [
                (((1 - t) * x0) + (t * x1)),
                (((1 - t) * y0) + (t * y1)),
                (((1 - t) * z0) + (t * z1))
            ];
        };
        /*
         * Finds the centroid, the center point, averaging all points
         * together.
         */
        Physics.centroid = function () {
            var points = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                points[_i] = arguments[_i];
            }
            var sum_x = points.reduce(function (a, p) { return a + p[0]; }, 0);
            var sum_y = points.reduce(function (a, p) { return a + p[1]; }, 0);
            var sum_z = points.reduce(function (a, p) { return a + (p[2] || 0); }, 0);
            return [
                sum_x / points.length,
                sum_y / points.length,
                sum_z / points.length,
            ];
        };
        return Physics;
    }());
    window.Physics = Physics;
    return Physics;
});
