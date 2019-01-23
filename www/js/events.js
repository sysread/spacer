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
define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Ev;
    (function (Ev) {
        Ev["Turn"] = "Turn";
        Ev["Arrived"] = "Arrived";
        Ev["ItemsBought"] = "ItemsBought";
        Ev["ItemsSold"] = "ItemsSold";
    })(Ev = exports.Ev || (exports.Ev = {}));
    ;
    var Events = /** @class */ (function () {
        function Events() {
        }
        Events.watch = function (ev, cb) {
            if (!Events.watcher[ev]) {
                Events.watcher[ev] = [];
            }
            Events.watcher[ev].push(cb);
        };
        Events.signal = function (event) {
            var e_1, _a;
            if (Events.watcher[event.type]) {
                var retain = [];
                try {
                    for (var _b = __values(Events.watcher[event.type]), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var fn = _c.value;
                        if (!fn(event)) {
                            retain.push(fn);
                        }
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
                Events.watcher[event.type] = retain;
            }
        };
        Events.watcher = {};
        return Events;
    }());
    exports.Events = Events;
});
