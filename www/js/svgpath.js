// Adopted from:
//   https://medium.com/@francoisromain/smooth-a-svg-path-with-cubic-bezier-curves-e37b49d46c74
define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // The smoothing ratio
    const smoothing = 0.2;
    function control_point(current, prev, next, reverse) {
        // When 'current' is the first or last point of the array 'previous' or
        // 'next' don't exist. Replace with 'current'.
        prev = prev || current;
        next = next || current;
        // Properties of the opposed-line
        const x = next[0] - prev[0];
        const y = next[1] - prev[1];
        const length = Math.hypot(x, y) * smoothing;
        let angle = Math.atan2(y, x);
        if (reverse) {
            angle += Math.PI;
        }
        // The control point position is relative to the current point
        const cx = current[0] + Math.cos(angle) * length;
        const cy = current[1] + Math.sin(angle) * length;
        return cx + ',' + cy;
    }
    function bezier(points) {
        let path = 'M ' + points[0][0] + ',' + points[0][1];
        // add bezier curve command
        for (let i = 1; i < points.length; ++i) {
            const c1 = control_point(points[i - 1], points[i - 2], points[i], false); // start control point
            const c2 = control_point(points[i], points[i - 1], points[i + 1], true); // end control point
            path += ' C ' + c1 + ' ' + c2 + ' ' + points[i][0] + ',' + points[i][1];
        }
        return path;
    }
    exports.bezier = bezier;
    function line(points) {
        let path = 'M ' + points[0][0] + ',' + points[0][1];
        for (let i = 1; i < points.length; ++i) {
            path += ' L ' + points[i][0] + ' ' + points[i][1];
        }
        return path;
    }
    exports.line = line;
});
