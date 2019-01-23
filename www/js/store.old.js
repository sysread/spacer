define(["require", "exports", "./common"], function (require, exports, common_1) {
    "use strict";
    class Store {
        constructor(init) {
            this.store = {};
            // The store must be initialized with a complete set of keys for each
            // resource so that Vue.js watchers can proxy changes to them.
            for (const item of common_1.resources) {
                this.store[item] = 0;
            }
            if (init != null) {
                if (init.store !== undefined) {
                    for (const elt of Object.keys(init.store)) {
                        this.store[elt] = init.store[elt];
                    }
                }
                else {
                    for (const elt of Object.keys(init)) {
                        this.store[elt] = init[elt];
                    }
                }
            }
        }
        keys() {
            return common_1.resources;
        }
        clear() {
            for (const item of this.keys()) {
                this.store[item] = 0;
            }
        }
        set(item, amt) {
            if (isNaN(amt))
                throw new Error('not a number');
            this.store[item] = amt < 0 ? 0 : amt;
        }
        get(item) {
            return this.store[item] || 0;
        }
        count(item) {
            return Math.floor(this.store[item] || 0);
        }
        sum() {
            let n = 0;
            for (const item of this.keys()) {
                n += this.store[item] || 0;
            }
            return n;
        }
        dec(item, amt = 0) {
            if (isNaN(amt))
                throw new Error('not a number');
            this.store[item] = (this.store[item] || 0) - amt;
        }
        inc(item, amt = 0) {
            if (isNaN(amt))
                throw new Error('not a number');
            this.store[item] = (this.store[item] || 0) + amt;
        }
    }
    return Store;
});
