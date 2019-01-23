define(["require", "exports", "./common"], function (require, exports, common_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class Store {
        constructor(init) {
            this.store = {};
            this.clear();
            if (init && init.store)
                for (const item of common_1.resources)
                    this.store[item] = init.store[item] || 0;
        }
        clear() {
            for (const item of common_1.resources)
                this.store[item] = 0;
        }
        set(item, amt) {
            if (isNaN(amt))
                throw new Error(`not a number: ${amt}`);
            this.store[item] = amt > 0 ? amt : 0;
        }
        sum() {
            let n = 0;
            for (const item of common_1.resources)
                n += this.store[item];
            return n;
        }
        //sum() { return Object.values(this.store).reduce((a, b) => a + b, 0) }
        keys() { return common_1.resources; }
        get(item) { return this.store[item] || 0; }
        count(item) { return Math.floor(this.store[item] || 0); }
        dec(item, amt) { return this.set(item, (this.store[item] || 0) - amt); }
        inc(item, amt) { return this.set(item, (this.store[item] || 0) + amt); }
    }
    exports.default = Store;
});
