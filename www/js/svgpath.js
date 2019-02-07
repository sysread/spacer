// Adopted from:
//   https://medium.com/@francoisromain/smooth-a-svg-path-with-cubic-bezier-curves-e37b49d46c74
define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // The smoothing ratio
    var smoothing = 0.2;
    var control_point = function (current, prev, next, reverse) {
        // When 'current' is the first or last point of the array 'previous' or
        // 'next' don't exist. Replace with 'current'.
        prev = prev || current;
        next = next || current;
        // Properties of the opposed-line
        var x = next[0] - prev[0];
        var y = next[1] - prev[1];
        var length = Math.sqrt((x * x) + (y * y)) * smoothing;
        var angle = Math.atan2(y, x) + (reverse ? Math.PI : 0); // if end-control-point, add PI to the angle to go backward
        // The control point position is relative to the current point
        return (current[0] + Math.cos(angle) * length) + ',' + (current[1] + Math.sin(angle) * length);
    };
    exports.bezier = function (points) {
        var path = 'M ' + points[0][0] + ',' + points[0][1];
        // add bezier curve command
        for (var i = 1; i < points.length; ++i) {
            var c1 = control_point(points[i - 1], points[i - 2], points[i]); // start control point
            var c2 = control_point(points[i], points[i - 1], points[i + 1], true); // end control point
            path += ' C ' + c1 + ' ' + c2 + ' ' + points[i][0] + ',' + points[i][1];
        }
        return path;
    };
    exports.line = function (points) {
        var path = 'M ' + points[0][0] + ',' + points[0][1];
        for (var i = 1; i < points.length; ++i) {
            path += ' L ' + points[i][0] + ' ' + points[i][1];
        }
        return path;
    };
    exports.smooth = function (points) {
        var path = 'M ' + points[0][0] + ',' + points[0][1];
        var c1 = control_point(points[1], undefined, points[2]); // start control point
        var c2 = control_point(points[2], points[1], points[3], true); // end control point
        path += ' C ' + c1 + ' ' + c2 + ' ' + points[1][0] + ',' + points[1][1];
        // add bezier curve command
        for (var i = 2; i < points.length; ++i) {
            var s = control_point(points[i], points[i - 1], points[i + 1], true); // end control point
            path += ' S ' + s + ' ' + points[i][0] + ',' + points[i][1];
        }
        return path;
    };
});
