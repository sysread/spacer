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
    var History = /** @class */ (function () {
        function History(length, init) {
            var e_1, _a, e_2, _b, e_3, _c, e_4, _d;
            this.length = length;
            this.history = {};
            this.daily = {};
            this.sum = {};
            try {
                for (var resources_1 = __values(common_1.resources), resources_1_1 = resources_1.next(); !resources_1_1.done; resources_1_1 = resources_1.next()) {
                    var item = resources_1_1.value;
                    this.history[item] = [];
                    this.daily[item] = 0;
                    this.sum[item] = 0;
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (resources_1_1 && !resources_1_1.done && (_a = resources_1.return)) _a.call(resources_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            if (init) {
                if (init.history)
                    try {
                        for (var resources_2 = __values(common_1.resources), resources_2_1 = resources_2.next(); !resources_2_1.done; resources_2_1 = resources_2.next()) {
                            var item = resources_2_1.value;
                            this.history[item] = init.history[item] || [];
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (resources_2_1 && !resources_2_1.done && (_b = resources_2.return)) _b.call(resources_2);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                if (init.sum)
                    try {
                        for (var resources_3 = __values(common_1.resources), resources_3_1 = resources_3.next(); !resources_3_1.done; resources_3_1 = resources_3.next()) {
                            var item = resources_3_1.value;
                            this.sum[item] = init.sum[item] || 0;
                        }
                    }
                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                    finally {
                        try {
                            if (resources_3_1 && !resources_3_1.done && (_c = resources_3.return)) _c.call(resources_3);
                        }
                        finally { if (e_3) throw e_3.error; }
                    }
                if (init.daily)
                    try {
                        for (var resources_4 = __values(common_1.resources), resources_4_1 = resources_4.next(); !resources_4_1.done; resources_4_1 = resources_4.next()) {
                            var item = resources_4_1.value;
                            this.daily[item] = init.daily[item] || 0;
                        }
                    }
                    catch (e_4_1) { e_4 = { error: e_4_1 }; }
                    finally {
                        try {
                            if (resources_4_1 && !resources_4_1.done && (_d = resources_4.return)) _d.call(resources_4);
                        }
                        finally { if (e_4) throw e_4.error; }
                    }
            }
        }
        History.prototype.get = function (item) {
            return this.sum[item];
        };
        History.prototype.count = function (item) {
            return Math.floor(this.sum[item]);
        };
        History.prototype.keys = function () {
            return common_1.resources;
        };
        History.prototype.inc = function (item, amt) {
            this.daily[item] += amt;
        };
        History.prototype.dec = function (item, amt) {
            this.daily[item] -= amt > this.daily[item]
                ? this.daily[item]
                : amt;
        };
        History.prototype.avg = function (item) {
            if (!this.history[item].length)
                return 0;
            return this.sum[item] / this.history[item].length;
        };
        History.prototype.add = function (item, amt) {
            this.sum[item] += amt;
            this.history[item].unshift(amt);
            while (this.history[item].length > this.length)
                this.sum[item] -= this.history[item].pop();
            if (this.sum[item] < 0)
                this.sum[item] = 0;
        };
        History.prototype.rollup = function () {
            var e_5, _a;
            try {
                for (var resources_5 = __values(common_1.resources), resources_5_1 = resources_5.next(); !resources_5_1.done; resources_5_1 = resources_5.next()) {
                    var item = resources_5_1.value;
                    this.add(item, this.daily[item]);
                    this.daily[item] = 0;
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (resources_5_1 && !resources_5_1.done && (_a = resources_5.return)) _a.call(resources_5);
                }
                finally { if (e_5) throw e_5.error; }
            }
        };
        return History;
    }());
    exports.default = History;
});
