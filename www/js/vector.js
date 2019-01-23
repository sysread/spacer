define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.clone = function (p) {
        return [p[0], p[1], p[2]];
    };
    exports.add_scalar = function (p, n) {
        return [p[0] + n, p[1] + n, p[2] + n];
    };
    exports.sub_scalar = function (p, n) {
        return [p[0] - n, p[1] - n, p[2] - n];
    };
    exports.mul_scalar = function (p, n) {
        return [p[0] * n, p[1] * n, p[2] * n];
    };
    exports.div_scalar = function (p, n) {
        return [p[0] / n, p[1] / n, p[2] / n];
    };
    exports.add = function (a, b) {
        return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    };
    exports.sub = function (a, b) {
        return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    };
    exports.mul = function (a, b) {
        return [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
    };
    exports.div = function (a, b) {
        return [a[0] / b[0], a[1] / b[1], a[2] / b[2]];
    };
    exports.length_squared = function (p) {
        return p[0] * p[0] + p[1] * p[1] + p[2] * p[2];
    };
    exports.length = function (p) {
        return Math.sqrt(exports.length_squared(p));
    };
});
