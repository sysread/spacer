// From solaris-model:
define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function isBody(body) {
        return body.type != undefined;
    }
    exports.isBody = isBody;
    function isLaGrange(body) {
        return body.offset != undefined;
    }
    exports.isLaGrange = isLaGrange;
});
