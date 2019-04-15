var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
define(["require", "exports", "./data", "./faction", "./util"], function (require, exports, data_1, faction_1, util) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    data_1 = __importDefault(data_1);
    util = __importStar(util);
    var isProductionEffect = function (e) { return e.production != undefined; };
    var isConsumptionEffect = function (e) { return e.consumption != undefined; };
    var isPatrolEffect = function (e) { return e.patrol_rate != undefined; };
    var isPiracyEffect = function (e) { return e.piracy_rate != undefined; };
    var isTradeBan = function (e) { return e.trade_ban != undefined; };
    var isTariff = function (e) { return e.tariff != undefined; };
    var isShortageTrigger = function (tr) { return tr.shortage; };
    var isSurplusTrigger = function (tr) { return tr.surplus; };
    var isRandomTrigger = function (tr) { return tr.random; };
    var Condition = /** @class */ (function () {
        function Condition(name, init) {
            this.name = name;
            this.duration = init.duration;
            if (this.is_started && !this.is_over) {
                this.install_event_watchers();
            }
        }
        Object.defineProperty(Condition.prototype, "is_started", {
            get: function () {
                return this.duration && this.duration.starts <= window.game.turns;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Condition.prototype, "is_over", {
            get: function () {
                return this.duration && this.duration.ends <= window.game.turns;
            },
            enumerable: true,
            configurable: true
        });
        Condition.prototype.start = function (turns) {
            this.duration = {
                starts: window.game.turns,
                ends: window.game.turns + turns,
            };
            this.install_event_watchers();
        };
        return Condition;
    }());
    var Conflict = /** @class */ (function (_super) {
        __extends(Conflict, _super);
        function Conflict(name, init) {
            var _this = _super.call(this, name, init) || this;
            _this.proponent = init.proponent;
            _this.target = init.target;
            return _this;
        }
        Object.defineProperty(Conflict.prototype, "key", {
            get: function () {
                return [this.name, this.proponent, this.target].join('_');
            },
            enumerable: true,
            configurable: true
        });
        return Conflict;
    }(Condition));
    exports.Conflict = Conflict;
    var Blockade = /** @class */ (function (_super) {
        __extends(Blockade, _super);
        function Blockade(init) {
            return _super.call(this, 'blockade', init) || this;
        }
        Blockade.prototype.chance = function () {
            if (this.proponent == this.target)
                return false;
            var standing = data_1.default.factions[this.proponent].standing[this.target] || 0;
            var chance = 0;
            if (standing < 0) {
                chance = Math.abs(standing) / 2000;
            }
            else if (standing > 0) {
                chance = (Math.log(100) - Math.log(standing)) / 2000;
            }
            else {
                chance = 0.00025;
            }
            return util.chance(chance);
        };
        Blockade.prototype.install_event_watchers = function () {
            var _this = this;
            window.addEventListener("caughtSmuggling", function (event) {
                var _a = event.detail, faction = _a.faction, found = _a.found;
                _this.violation(faction, found);
            });
        };
        Blockade.prototype.violation = function (faction_name, found) {
            var e_1, _a;
            if (!this.is_started || this.is_over)
                return true;
            if (this.target != faction_name)
                return false;
            var faction = faction_1.factions[faction_name];
            var loss = 0;
            var fine = 0;
            try {
                for (var _b = __values(Object.keys(found)), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var item = _c.value;
                    var count = found[item] || 0;
                    loss += (item == 'weapons') ? count * 4 : count * 2;
                    fine += count * faction.inspectionFine(window.game.player);
                    window.game.player.ship.unloadCargo(item, count);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            window.game.player.debit(fine);
            window.game.player.decStanding(this.proponent, loss);
            window.game.notify("You are in violation of " + this.proponent + "'s blockade against " + this.target + ". You have been fined " + fine + " credits and your standing decreased by " + loss + ".");
            return false;
        };
        return Blockade;
    }(Conflict));
    exports.Blockade = Blockade;
});
