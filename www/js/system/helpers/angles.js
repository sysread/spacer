define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var circleInRadians = 2 * Math.PI;
    var ratioDegToRad = Math.PI / 180;
    var ratioRadToDeg = 180 / Math.PI;
    exports.degreesToRadians = function (v) { return v * ratioDegToRad; };
    exports.radiansToDegrees = function (v) { return v * ratioRadToDeg; };
    exports.normalizeRadians = function (v) { return v % circleInRadians; };
});
