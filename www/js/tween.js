define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function tween(elt, intvl, vars) {
        vars.ease = Linear.easeNone;
        vars.lazy = true;
        vars.duration = intvl || 0;
        return gsap.to(elt, vars);
    }
    exports.default = tween;
});
