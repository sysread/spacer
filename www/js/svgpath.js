define(["require", "exports", "./util", "./strbuf"], function (require, exports, util_1, strbuf_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const smoothing = 0.2;
    const rounding = 2;
    function round(n) {
        return util_1.R(n, rounding);
    }
    function length(px, py, nx, ny) {
        return Math.hypot(nx - px, ny - py) * smoothing;
    }
    function angle(px, py, nx, ny, reverse) {
        const angle = Math.atan2(ny - py, nx - px);
        if (reverse) {
            return angle + Math.PI;
        }
        else {
            return angle;
        }
    }
    function ctrlpt_x(x, length, angle) {
        return x + Math.cos(angle) * length;
    }
    function ctrlpt_y(y, length, angle) {
        return y + Math.sin(angle) * length;
    }
    function bezier(points) {
        const path = strbuf_1.builder();
        path.append('M ');
        path.append(round(points[0][0]));
        path.append(',');
        path.append(round(points[0][1]));
        for (let i = 1; i < points.length; ++i) {
            const current = points[i - 1];
            const prev = points[i - 2] || current;
            const next = points[i];
            const nnext = points[i + 1] || current;
            const l1 = length(prev[0], prev[1], next[0], next[1]);
            const a1 = angle(prev[0], prev[1], next[0], next[1], false);
            const x1 = ctrlpt_x(current[0], l1, a1);
            const y1 = ctrlpt_y(current[1], l1, a1);
            const l2 = length(current[0], current[1], nnext[0], nnext[1]);
            const a2 = angle(current[0], current[1], nnext[0], nnext[1], true);
            const x2 = ctrlpt_x(next[0], l2, a2);
            const y2 = ctrlpt_y(next[1], l2, a2);
            path.append(' C ');
            path.append(round(x1));
            path.append(' ');
            path.append(round(y1));
            path.append(',');
            path.append(round(x2));
            path.append(' ');
            path.append(round(y2));
            path.append(',');
            path.append(round(next[0]));
            path.append(' ');
            path.append(round(next[1]));
        }
        return path.getbuffer();
    }
    exports.bezier = bezier;
});
