define(["require", "exports"], function (require, exports) {
    "use strict";
    var Store = /** @class */ (function () {
        function Store(init) {
            this.store = {};
            if (init == null) {
                return;
            }
            else if (init.store !== undefined) {
                for (var _i = 0, _a = Object.keys(init.store); _i < _a.length; _i++) {
                    var elt = _a[_i];
                    this.store[elt] = init.store[elt];
                }
            }
            else {
                for (var _b = 0, _c = Object.keys(init); _b < _c.length; _b++) {
                    var elt = _c[_b];
                    this.store[elt] = init[elt];
                }
            }
        }
        Store.prototype.keys = function () {
            return Object.keys(this.store);
        };
        Store.prototype.clear = function () {
            for (var _i = 0, _a = this.keys(); _i < _a.length; _i++) {
                var item = _a[_i];
                this.store[item] = 0;
            }
        };
        Store.prototype.set = function (item, amt) {
            this.store[item] = Math.max(0, amt);
        };
        Store.prototype.get = function (item) {
            return this.store[item] || 0;
        };
        Store.prototype.count = function (item) {
            return Math.floor(this.store[item] || 0);
        };
        Store.prototype.sum = function () {
            var n = 0;
            for (var _i = 0, _a = this.keys(); _i < _a.length; _i++) {
                var item = _a[_i];
                n += this.store[item];
            }
            return n;
        };
        Store.prototype.dec = function (item, amt) {
            if (amt === void 0) { amt = 0; }
            this.set(item, (this.store[item] || 0) - amt);
        };
        Store.prototype.inc = function (item, amt) {
            if (amt === void 0) { amt = 0; }
            this.set(item, (this.store[item] || 0) + amt);
        };
        return Store;
    }());
    return Store;
});
