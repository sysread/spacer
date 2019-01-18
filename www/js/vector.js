define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function clone(p) {
        return [p[0], p[1], p[2]];
    }
    exports.clone = clone;
    function add_scalar(p, n) {
        return [p[0] + n, p[1] + n, p[2] + n];
    }
    exports.add_scalar = add_scalar;
    function sub_scalar(p, n) {
        return [p[0] - n, p[1] - n, p[2] - n];
    }
    exports.sub_scalar = sub_scalar;
    function mul_scalar(p, n) {
        return [p[0] * n, p[1] * n, p[2] * n];
    }
    exports.mul_scalar = mul_scalar;
    function div_scalar(p, n) {
        return [p[0] / n, p[1] / n, p[2] / n];
    }
    exports.div_scalar = div_scalar;
    function add(a, b) {
        return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    }
    exports.add = add;
    function sub(a, b) {
        return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    }
    exports.sub = sub;
    function mul(a, b) {
        return [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
    }
    exports.mul = mul;
    function div(a, b) {
        return [a[0] / b[0], a[1] / b[1], a[2] / b[2]];
    }
    exports.div = div;
    function length_squared(p) {
        return p[0] * p[0]
            + p[1] * p[1]
            + p[2] * p[2];
    }
    exports.length_squared = length_squared;
    function length(p) {
        return Math.sqrt(length_squared(p));
    }
    exports.length = length;
});
