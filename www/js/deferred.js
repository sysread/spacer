define(["require", "exports"], function (require, exports) {
    "use strict";
    class Deferred {
        constructor() {
            this.resolve = () => { };
            this.reject = () => { };
            this.promise = new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            });
        }
    }
    return Deferred;
});
