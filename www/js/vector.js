define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.clone = (p) => [p[0], p[1], p[2]];
    exports.add_scalar = (p, n) => [p[0] + n, p[1] + n, p[2] + n];
    exports.sub_scalar = (p, n) => [p[0] - n, p[1] - n, p[2] - n];
    exports.mul_scalar = (p, n) => [p[0] * n, p[1] * n, p[2] * n];
    exports.div_scalar = (p, n) => [p[0] / n, p[1] / n, p[2] / n];
    exports.add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    exports.sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    exports.mul = (a, b) => [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
    exports.div = (a, b) => [a[0] / b[0], a[1] / b[1], a[2] / b[2]];
    exports.length_squared = (p) => Math.pow(p[0], 2) + Math.pow(p[1], 2) + Math.pow(p[2], 2);
    exports.length = (p) => Math.hypot(p[0], p[1], p[2]);
});
