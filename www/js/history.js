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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "./common", "./store"], function (require, exports, common_1, store_1) {
    "use strict";
    store_1 = __importDefault(store_1);
    var History = /** @class */ (function () {
        function History(length, init) {
            this.length = length;
            if (init == null) {
                this.history = {};
                this.sum = new store_1.default;
                this.daily = new store_1.default;
            }
            else {
                this.history = init.history;
                this.sum = new store_1.default(init.sum);
                this.daily = new store_1.default(init.daily);
            }
            this._avg = {};
        }
        History.prototype.keys = function () {
            return common_1.resources;
        };
        History.prototype.inc = function (item, amt) {
            this.daily.inc(item, amt);
            delete this._avg[item];
        };
        History.prototype.dec = function (item, amt) {
            this.daily.dec(item, amt);
            delete this._avg[item];
        };
        History.prototype.get = function (item) {
            return this.sum.get(item);
        };
        History.prototype.count = function (item) {
            return this.sum.count(item);
        };
        History.prototype.avg = function (item) {
            if (this.history[item] == undefined || this.history[item].length == 0) {
                return 0;
            }
            if (this._avg[item] == undefined) {
                this._avg[item] = this.sum.get(item) / this.history[item].length;
            }
            return this._avg[item];
        };
        History.prototype.add = function (item, amt) {
            if (!(item in this.history)) {
                this.history[item] = [];
            }
            this.history[item].unshift(amt);
            this.sum.inc(item, amt);
            while (this.history[item].length > this.length) {
                this.sum.dec(item, this.history[item].pop());
            }
        };
        History.prototype.rollup = function () {
            var e_1, _a;
            try {
                for (var resources_1 = __values(common_1.resources), resources_1_1 = resources_1.next(); !resources_1_1.done; resources_1_1 = resources_1.next()) {
                    var item = resources_1_1.value;
                    this.add(item, this.daily.get(item));
                    delete this._avg[item];
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (resources_1_1 && !resources_1_1.done && (_a = resources_1.return)) _a.call(resources_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            this.daily.clear();
        };
        return History;
    }());
    return History;
});
