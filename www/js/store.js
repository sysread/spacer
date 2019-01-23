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
    Object.defineProperty(exports, "__esModule", { value: true });
    var Store = /** @class */ (function () {
        function Store(init) {
            var e_1, _a;
            this.store = {};
            this.clear();
            if (init && init.store)
                try {
                    for (var resources_1 = __values(common_1.resources), resources_1_1 = resources_1.next(); !resources_1_1.done; resources_1_1 = resources_1.next()) {
                        var item = resources_1_1.value;
                        this.store[item] = init.store[item] || 0;
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (resources_1_1 && !resources_1_1.done && (_a = resources_1.return)) _a.call(resources_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
        }
        Store.prototype.clear = function () {
            var e_2, _a;
            try {
                for (var resources_2 = __values(common_1.resources), resources_2_1 = resources_2.next(); !resources_2_1.done; resources_2_1 = resources_2.next()) {
                    var item = resources_2_1.value;
                    this.store[item] = 0;
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (resources_2_1 && !resources_2_1.done && (_a = resources_2.return)) _a.call(resources_2);
                }
                finally { if (e_2) throw e_2.error; }
            }
        };
        Store.prototype.set = function (item, amt) {
            if (isNaN(amt))
                throw new Error("not a number: " + amt);
            this.store[item] = amt > 0 ? amt : 0;
        };
        Store.prototype.sum = function () {
            var e_3, _a;
            var n = 0;
            try {
                for (var resources_3 = __values(common_1.resources), resources_3_1 = resources_3.next(); !resources_3_1.done; resources_3_1 = resources_3.next()) {
                    var item = resources_3_1.value;
                    n += this.store[item];
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (resources_3_1 && !resources_3_1.done && (_a = resources_3.return)) _a.call(resources_3);
                }
                finally { if (e_3) throw e_3.error; }
            }
            return n;
        };
        Store.prototype.keys = function () { return common_1.resources; };
        Store.prototype.get = function (item) { return this.store[item] || 0; };
        Store.prototype.count = function (item) { return Math.floor(this.store[item] || 0); };
        Store.prototype.dec = function (item, amt) { return this.set(item, (this.store[item] || 0) - amt); };
        Store.prototype.inc = function (item, amt) { return this.set(item, (this.store[item] || 0) + amt); };
        return Store;
    }());
    exports.default = Store;
});
