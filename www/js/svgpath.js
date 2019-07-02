// adapted from https://medium.com/@francoisromain/smooth-a-svg-path-with-cubic-bezier-curves-e37b49d46c74
define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function control_point(current, prev, next, reverse) {
        const length = wasm.svgpath.ctrlpt_length(prev[0], prev[1], next[0], next[1]);
        const angle = wasm.svgpath.ctrlpt_angle(prev[0], prev[1], next[0], next[1], false);
        const x = wasm.svgpath.ctrlpt_x(current[0], length, angle);
        const y = wasm.svgpath.ctrlpt_y(current[1], length, angle);
        return x + ' ' + y;
    }
    function bezier(points) {
        let path = 'M ' + points[0][0] + ',' + points[0][1];
        for (let i = 1; i < points.length; ++i) {
            const current = points[i - 1];
            const prev = points[i - 2] || current;
            const next = points[i] || current;
            const nnext = points[i + 1] || current;
            const c1 = control_point(points[i - 1], points[i - 2] || points[i - 1], points[i], false);
            const c2 = control_point(points[i], points[i - 1], points[i + 1] || points[i], true);
            path += ' C ' + c1 + ',' + c2 + ',' + points[i][0] + ' ' + points[i][1];
        }
        return path;
    }
    exports.bezier = bezier;
});
