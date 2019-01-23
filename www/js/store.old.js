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
define(["require", "exports", "./common"], function (require, exports, common_1) {
    "use strict";
    var Store = /** @class */ (function () {
        function Store(init) {
            var e_1, _a, e_2, _b, e_3, _c;
            this.store = {};
            try {
                // The store must be initialized with a complete set of keys for each
                // resource so that Vue.js watchers can proxy changes to them.
                for (var resources_1 = __values(common_1.resources), resources_1_1 = resources_1.next(); !resources_1_1.done; resources_1_1 = resources_1.next()) {
                    var item = resources_1_1.value;
                    this.store[item] = 0;
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (resources_1_1 && !resources_1_1.done && (_a = resources_1.return)) _a.call(resources_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            if (init != null) {
                if (init.store !== undefined) {
                    try {
                        for (var _d = __values(Object.keys(init.store)), _e = _d.next(); !_e.done; _e = _d.next()) {
                            var elt = _e.value;
                            this.store[elt] = init.store[elt];
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (_e && !_e.done && (_b = _d.return)) _b.call(_d);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                }
                else {
                    try {
                        for (var _f = __values(Object.keys(init)), _g = _f.next(); !_g.done; _g = _f.next()) {
                            var elt = _g.value;
                            this.store[elt] = init[elt];
                        }
                    }
                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                    finally {
                        try {
                            if (_g && !_g.done && (_c = _f.return)) _c.call(_f);
                        }
                        finally { if (e_3) throw e_3.error; }
                    }
                }
            }
        }
        Store.prototype.keys = function () {
            return common_1.resources;
        };
        Store.prototype.clear = function () {
            var e_4, _a;
            try {
                for (var _b = __values(this.keys()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var item = _c.value;
                    this.store[item] = 0;
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_4) throw e_4.error; }
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
            return Math.floor(this.store[item] || 0);
        };
        Store.prototype.sum = function () {
            var e_5, _a;
            var n = 0;
            try {
                for (var _b = __values(this.keys()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var item = _c.value;
                    n += this.store[item] || 0;
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_5) throw e_5.error; }
            }
            return n;
        };
        Store.prototype.dec = function (item, amt) {
            if (amt === void 0) { amt = 0; }
            if (isNaN(amt))
                throw new Error('not a number');
            this.store[item] = (this.store[item] || 0) - amt;
        };
        Store.prototype.inc = function (item, amt) {
            if (amt === void 0) { amt = 0; }
            if (isNaN(amt))
                throw new Error('not a number');
            this.store[item] = (this.store[item] || 0) + amt;
        };
        return Store;
    }());
    return Store;
});
