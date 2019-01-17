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
    // Render the svg <path> element 
    // I:  - points (array): points coordinates
    //     - command (function)
    //       I:  - point (array) [x,y]: current point coordinates
    //           - i (integer): index of 'point' in the array 'a'
    //           - a (array): complete array of points coordinates
    //       O:  - (string) a svg path command
    // O:  - (string): a Svg <path> element
    function svgPath(points, command) {
        // build the d attributes by looping over the points
        var d = points.reduce(function (acc, point, i, a) { return i === 0
            // if first point
            ? "M " + point[0] + "," + point[1]
            // else
            : acc + " " + command(point, i, a); }, '');
        return d;
    }
    // Properties of a line 
    // I:  - pointA (array) [x,y]: coordinates
    //     - pointB (array) [x,y]: coordinates
    // O:  - (object) { length: l, angle: a }: properties of the line
    function line(pointA, pointB) {
        var lengthX = pointB[0] - pointA[0];
        var lengthY = pointB[1] - pointA[1];
        return {
            length: Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2)),
            angle: Math.atan2(lengthY, lengthX)
        };
    }
    // Position of a control point 
    // I:  - current (array) [x, y]: current point coordinates
    //     - previous (array) [x, y]: previous point coordinates
    //     - next (array) [x, y]: next point coordinates
    //     - reverse (boolean, optional): sets the direction
    // O:  - (array) [x,y]: a tuple of coordinates
    function controlPoint(current, previous, next, reverse) {
        if (reverse === void 0) { reverse = false; }
        // When 'current' is the first or last point of the array
        // 'previous' or 'next' don't exist.
        // Replace with 'current'
        var p = previous || current;
        var n = next || current;
        // The smoothing ratio
        var smoothing = 0.2;
        // Properties of the opposed-line
        var o = line(p, n);
        // If is end-control-point, add PI to the angle to go backward
        var angle = o.angle + (reverse ? Math.PI : 0);
        var length = o.length * smoothing;
        // The control point position is relative to the current point
        var x = current[0] + Math.cos(angle) * length;
        var y = current[1] + Math.sin(angle) * length;
        return [x, y];
    }
    // Create the bezier curve command 
    // I:  - point (array) [x,y]: current point coordinates
    //     - i (integer): index of 'point' in the array 'a'
    //     - a (array): complete array of points coordinates
    // O:  - (string) 'C x2,y2 x1,y1 x,y': SVG cubic bezier C command
    function bezierCommand(point, i, a) {
        // start control point
        var _a = __read(controlPoint(a[i - 1], a[i - 2], point), 2), cpsX = _a[0], cpsY = _a[1];
        // end control point
        var _b = __read(controlPoint(point, a[i - 1], a[i + 1], true), 2), cpeX = _b[0], cpeY = _b[1];
        return "C " + cpsX + "," + cpsY + " " + cpeX + "," + cpeY + " " + point[0] + "," + point[1];
    }
    function smooth(points) {
        return svgPath(points, bezierCommand);
    }
    return smooth;
});
