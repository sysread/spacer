// faster replacements for Math routines, taken from: https://github.com/krzaku281/fast-math
define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function abs(value) {
        value = +value;
        return value < 0 ? -value : value;
    }
    exports.abs = abs;
    ;
    function ceil(value) {
        value = +value;
        return ~~value === value ? value : (value > 0) ? (~~value + 1) : ~~value;
    }
    exports.ceil = ceil;
    ;
    function floor(value) {
        value = +value;
        return ~~value === value ? value : (value > 0) ? ~~value : (~~value - 1);
    }
    exports.floor = floor;
    ;
    function round(value) {
        value = +value;
        return value + (value < 0 ? -0.5 : 0.5) >> 0;
    }
    exports.round = round;
    ;
    function sign(value) {
        value = +value;
        return value ? value < 0 ? -1 : 1 : 0;
    }
    exports.sign = sign;
    ;
});
