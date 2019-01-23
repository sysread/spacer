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
    class Events {
        static watch(ev, cb) {
            if (!Events.watcher[ev]) {
                Events.watcher[ev] = [];
            }
            Events.watcher[ev].push(cb);
        }
        static signal(event) {
            if (Events.watcher[event.type]) {
                const retain = [];
                for (const fn of Events.watcher[event.type]) {
                    if (!fn(event)) {
                        retain.push(fn);
                    }
                }
                Events.watcher[event.type] = retain;
            }
        }
    }
    Events.watcher = {};
    exports.Events = Events;
});
