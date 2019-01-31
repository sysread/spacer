// Adopted (read: copy pasta) from:
//   https://medium.com/@francoisromain/smooth-a-svg-path-with-cubic-bezier-curves-e37b49d46c74
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
    // The smoothing ratio
    var smoothing = 0.2;
    function controlPoint(current, previous, next, reverse) {
        if (reverse === void 0) { reverse = false; }
        // When 'current' is the first or last point of the array
        // 'previous' or 'next' don't exist.
        // Replace with 'current'
        var p = previous || current;
        var n = next || current;
        // Properties of the opposed-line
        var line_x = n[0] - p[0];
        var line_y = n[1] - p[1];
        var line_length = Math.sqrt(Math.pow(line_x, 2) + Math.pow(line_y, 2));
        var line_angle = Math.atan2(line_y, line_x);
        // If is end-control-point, add PI to the angle to go backward
        var angle = line_angle + (reverse ? Math.PI : 0);
        var length = line_length * smoothing;
        // The control point position is relative to the current point
        var x = current[0] + Math.cos(angle) * length;
        var y = current[1] + Math.sin(angle) * length;
        return [x, y];
    }
    function smooth(points) {
        var path = '';
        for (var i = 0; i < points.length; ++i) {
            // init line
            if (i == 0) {
                path += "M " + points[i][0] + "," + points[i][1];
            }
            // add bezier curve command
            else {
                // start control point
                var _a = __read(controlPoint(points[i - 1], points[i - 2], points[i]), 2), cps_x = _a[0], cps_y = _a[1];
                // end control point
                var _b = __read(controlPoint(points[i], points[i - 1], points[i + 1], true), 2), cpe_x = _b[0], cpe_y = _b[1];
                path += "C " + cps_x + "," + cps_y + " " + cpe_x + "," + cpe_y + " " + points[i][0] + "," + points[i][1];
            }
        }
        return path;
    }
    return smooth;
});
