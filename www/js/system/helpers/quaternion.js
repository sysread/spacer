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
    Object.defineProperty(exports, "__esModule", { value: true });
    function quaternion_from_euler(phi, theta, psi) {
        var _x = theta * 0.5;
        var _y = psi * 0.5;
        var _z = phi * 0.5;
        var cX = Math.cos(_x);
        var cY = Math.cos(_y);
        var cZ = Math.cos(_z);
        var sX = Math.sin(_x);
        var sY = Math.sin(_y);
        var sZ = Math.sin(_z);
        var w = cX * cY * cZ - sX * sY * sZ;
        var x = sX * cY * cZ + cX * sY * sZ;
        var y = cX * sY * cZ - sX * cY * sZ;
        var z = cX * cY * sZ + sX * sY * cZ;
        return [w, x, y, z];
    }
    exports.quaternion_from_euler = quaternion_from_euler;
    function quaternion_mul(a, b) {
        var _a = __read(a, 4), w1 = _a[0], x1 = _a[1], y1 = _a[2], z1 = _a[3];
        var _b = __read(b, 4), w2 = _b[0], x2 = _b[1], y2 = _b[2], z2 = _b[3];
        return [
            w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2,
            w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
            w1 * y2 + y1 * w2 + z1 * x2 - x1 * z2,
            w1 * z2 + z1 * w2 + x1 * y2 - y1 * x2,
        ];
    }
    exports.quaternion_mul = quaternion_mul;
    function quaternion_rotate_vector(q, v) {
        var _a = __read(q, 4), w1 = _a[0], x1 = _a[1], y1 = _a[2], z1 = _a[3];
        var w2 = 0, _b = __read(v, 3), x2 = _b[0], y2 = _b[1], z2 = _b[2]; // [0, v]
        // Q * [0, v]
        var w3 = /*w1 * w2*/ -x1 * x2 - y1 * y2 - z1 * z2;
        var x3 = w1 * x2 + /*x1 * w2 +*/ y1 * z2 - z1 * y2;
        var y3 = w1 * y2 + /*y1 * w2 +*/ z1 * x2 - x1 * z2;
        var z3 = w1 * z2 + /*z1 * w2 +*/ x1 * y2 - y1 * x2;
        var w4 = w3 * w1 + x3 * x1 + y3 * y1 + z3 * z1;
        var x4 = x3 * w1 - w3 * x1 - y3 * z1 + z3 * y1;
        var y4 = y3 * w1 - w3 * y1 - z3 * x1 + x3 * z1;
        var z4 = z3 * w1 - w3 * z1 - x3 * y1 + y3 * x1;
        return [x4, y4, z4];
    }
    exports.quaternion_rotate_vector = quaternion_rotate_vector;
});
