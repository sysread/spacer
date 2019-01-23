var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "./common", "./store"], function (require, exports, common_1, store_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    store_1 = __importDefault(store_1);
    class History {
        constructor(length, init) {
            this.length = length;
            this.history = {};
            for (const item of common_1.resources)
                this.history[item] = [];
            if (!init) {
                this.sum = new store_1.default;
                this.daily = new store_1.default;
            }
            else {
                this.sum = new store_1.default(init.sum);
                this.daily = new store_1.default(init.daily);
                if (init.history)
                    for (const item of common_1.resources)
                        this.history[item] = init.history[item] || [];
            }
            // poor man's delegation to avoid the overhead of an extra funcall
            this.get = this.sum.get;
            this.count = this.sum.count;
            this._avg = {};
        }
        keys() {
            return common_1.resources;
        }
        inc(item, amt) {
            this.daily.inc(item, amt);
            delete this._avg[item];
        }
        dec(item, amt) {
            this.daily.dec(item, amt);
            delete this._avg[item];
        }
        avg(item) {
            if (!this.history[item].length)
                return 0;
            if (this._avg[item] === undefined)
                this._avg[item] = this.sum.get(item) / this.history[item].length;
            return this._avg[item];
        }
        add(item, amt) {
            this.history[item].unshift(amt);
            this.sum.inc(item, amt);
            while (this.history[item].length > this.length) {
                this.sum.dec(item, this.history[item].pop());
            }
        }
        rollup() {
            for (const item of common_1.resources)
                this.add(item, this.daily.get(item));
            this.daily.clear();
        }
    }
    exports.default = History;
});
