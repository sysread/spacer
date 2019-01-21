define(["require", "exports"], function (require, exports) {
    "use strict";
    var Deferred = /** @class */ (function () {
        function Deferred() {
            var _this = this;
            this.resolve = function () { };
            this.reject = function () { };
            this.promise = new Promise(function (resolve, reject) {
                _this.resolve = resolve;
                _this.reject = reject;
            });
        }
        return Deferred;
    }());
    return Deferred;
});
