define(["require", "exports", "./common"], function (require, exports, common_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class History {
        constructor(length, init) {
            this.length = length;
            this.history = {};
            this.daily = {};
            this.sum = {};
            for (const item of common_1.resources) {
                this.history[item] = [];
                this.daily[item] = 0;
                this.sum[item] = 0;
            }
            if (init) {
                if (init.history)
                    for (const item of common_1.resources)
                        this.history[item] = init.history[item] || [];
                if (init.sum)
                    for (const item of common_1.resources)
                        this.sum[item] = init.sum[item] || 0;
                if (init.daily)
                    for (const item of common_1.resources)
                        this.daily[item] = init.daily[item] || 0;
            }
        }
        get(item) {
            return this.sum[item];
        }
        count(item) {
            return Math.floor(this.sum[item]);
        }
        keys() {
            return common_1.resources;
        }
        inc(item, amt) {
            this.daily[item] += amt;
        }
        dec(item, amt) {
            this.daily[item] -= amt > this.daily[item]
                ? this.daily[item]
                : amt;
        }
        avg(item) {
            if (!this.history[item].length)
                return 0;
            return this.sum[item] / this.history[item].length;
        }
        add(item, amt) {
            this.sum[item] += amt;
            this.history[item].unshift(amt);
            while (this.history[item].length > this.length)
                this.sum[item] -= this.history[item].pop();
            if (this.sum[item] < 0)
                this.sum[item] = 0;
        }
        rollup() {
            for (const item of common_1.resources) {
                this.add(item, this.daily[item]);
                this.daily[item] = 0;
            }
        }
    }
    exports.default = History;
});
