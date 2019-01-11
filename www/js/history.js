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
        }
        History.prototype.keys = function () {
            return common_1.resources;
        };
        History.prototype.inc = function (item, amt) {
            this.daily.inc(item, amt);
        };
        History.prototype.dec = function (item, amt) {
            this.daily.dec(item, amt);
        };
        History.prototype.get = function (item) {
            return this.sum.get(item);
        };
        History.prototype.count = function (item) {
            return this.sum.count(item);
        };
        History.prototype.avg = function (item) {
            if (!(item in this.history)) {
                return 0;
            }
            if (this.history[item].length == 0) {
                return 0;
            }
            return this.sum.get(item) / this.history[item].length;
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
            for (var _i = 0, resources_1 = common_1.resources; _i < resources_1.length; _i++) {
                var item = resources_1[_i];
                this.add(item, this.daily.get(item));
            }
            this.daily.clear();
        };
        return History;
    }());
    return History;
});
