var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "./data"], function (require, exports, data_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    data_1 = __importDefault(data_1);
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
        constructor(detail) {
            super("turn", detail);
            this.detail.isNewDay = this.detail.turn % data_1.default.turns_per_day == 0;
        }
    }
    exports.GameTurn = GameTurn;
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
