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
    var Events = /** @class */ (function () {
        function Events() {
        }
        Events.watch = function (event, cb) {
            if (!Events.watcher[event]) {
                Events.watcher[event] = [];
            }
            Events.watcher[event].push(cb);
        };
        Events.signal = function (event, param) {
            //console.log('event', event, param);
            var e_1, _a;
            if (Events.watcher[event]) {
                var retain = [];
                try {
                    for (var _b = __values(Events.watcher[event]), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var fn = _c.value;
                        if (!fn(event, param)) {
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
                Events.watcher[event] = retain;
            }
        };
        Events.Turn = function (turn) {
            Events.signal('Turn', turn);
        };
        Events.Arrived = function (dest) {
            Events.signal('Arrived', dest);
        };
        Events.BoughtItems = function (payload) {
            Events.signal('BoughtItems', payload);
        };
        Events.SoldItems = function (payload) {
            Events.signal('SoldItems', payload);
        };
        Events.watcher = {};
        return Events;
    }());
    exports.Events = Events;
    var Passengers = /** @class */ (function () {
        function Passengers(opt) {
            this.accepted = false;
            this.deadline = opt.deadline;
            this.dest = opt.destination;
        }
        Passengers.prototype.accept = function () {
            var _this = this;
            this.accepted = true;
            Events.watch('Turn', function (turn) {
                if (turn < _this.deadline /* && this.completed */) {
                }
                else {
                }
            });
            Events.watch('Arrived', function (dest) {
                if (dest == _this.dest) {
                }
            });
        };
        return Passengers;
    }());
});
