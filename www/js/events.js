define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function trigger(ev) {
        window.dispatchEvent(ev);
    }
    exports.trigger = trigger;
    function watch(event, cb) {
        const opt = { passive: true, once: true };
        window.addEventListener(event, (ev) => {
            const rs = cb(ev);
            if (!rs.complete) {
                watch(event, cb);
            }
        }, opt);
    }
    exports.watch = watch;
    class EventBase extends CustomEvent {
        constructor(name, detail) {
            super(name, { detail: detail });
        }
    }
    class GameLoaded extends EventBase {
        constructor() { super("gameLoaded", null); }
    }
    exports.GameLoaded = GameLoaded;
    class GameTurn extends EventBase {
        constructor(detail) { super("turn", detail); }
    }
    exports.GameTurn = GameTurn;
    class NewDay extends EventBase {
        constructor(detail) { super("day", detail); }
    }
    exports.NewDay = NewDay;
    class Arrived extends EventBase {
        constructor(detail) { super("arrived", detail); }
    }
    exports.Arrived = Arrived;
    class ItemsBought extends EventBase {
        constructor(detail) { super("itemsBought", detail); }
    }
    exports.ItemsBought = ItemsBought;
    class ItemsSold extends EventBase {
        constructor(detail) { super("itemsSold", detail); }
    }
    exports.ItemsSold = ItemsSold;
    class CaughtSmuggling extends EventBase {
        constructor(detail) { super("caughtSmuggling", detail); }
    }
    exports.CaughtSmuggling = CaughtSmuggling;
});
