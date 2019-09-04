define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function tween(elt, intvl, vars) {
        vars.ease = Linear.easeNone;
        vars.lazy = true;
        vars.useFrames = true;
        return TweenMax.to(elt, intvl || 0, vars);
    }
    exports.default = tween;
});
