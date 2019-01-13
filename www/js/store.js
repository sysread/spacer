var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
define(["require", "exports"], function (require, exports) {
    "use strict";
    var Store = /** @class */ (function () {
        function Store(init) {
            var e_1, _a, e_2, _b;
            this.store = {};
            if (init != null) {
                if (init.store !== undefined) {
                    try {
                        for (var _c = __values(Object.keys(init.store)), _d = _c.next(); !_d.done; _d = _c.next()) {
                            var elt = _d.value;
                            this.store[elt] = init.store[elt];
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                }
                else {
                    try {
                        for (var _e = __values(Object.keys(init)), _f = _e.next(); !_f.done; _f = _e.next()) {
                            var elt = _f.value;
                            this.store[elt] = init[elt];
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                }
            }
        }
        Store.prototype.keys = function () {
            return Object.keys(this.store);
        };
        Store.prototype.clear = function () {
            var e_3, _a;
            try {
                for (var _b = __values(this.keys()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var item = _c.value;
                    this.store[item] = 0;
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_3) throw e_3.error; }
            }
        };
        Store.prototype.set = function (item, amt) {
            if (isNaN(amt))
                throw new Error('not a number');
            this.store[item] = amt < 0 ? 0 : amt;
        };
        Store.prototype.get = function (item) {
            return this.store[item] || 0;
        };
        Store.prototype.count = function (item) {
            return Math.floor(this.get(item));
        };
        Store.prototype.sum = function () {
            var e_4, _a;
            var n = 0;
            try {
                for (var _b = __values(this.keys()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var item = _c.value;
                    n += this.store[item] || 0;
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_4) throw e_4.error; }
            }
            return n;
        };
        Store.prototype.dec = function (item, amt) {
            if (amt === void 0) { amt = 0; }
            if (isNaN(amt))
                throw new Error('not a number');
            this.store[item] = this.get(item) - amt;
        };
        Store.prototype.inc = function (item, amt) {
            if (amt === void 0) { amt = 0; }
            if (isNaN(amt))
                throw new Error('not a number');
            this.store[item] = this.get(item) + amt;
        };
        return Store;
    }());
    return Store;
});
