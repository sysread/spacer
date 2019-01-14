define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var circleInRadians = 2 * Math.PI;
    function degreesToRadians(v) {
        return v * (Math.PI / 180);
    }
    exports.degreesToRadians = degreesToRadians;
    function radiansToDegrees(v) {
        return v * (180 / Math.PI);
    }
    exports.radiansToDegrees = radiansToDegrees;
    function normalizeRadians(v) {
        return v % circleInRadians;
    }
    exports.normalizeRadians = normalizeRadians;
});
