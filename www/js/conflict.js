/*
 * TODO
 *  * new conflict types
 *  * Trade ban:
 *    * notifications when player violates trade ban
 *    * standing loss when player violates trade ban
 */
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
define(["require", "exports", "./data", "./util"], function (require, exports, data_1, util) {
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
    var Embargo = /** @class */ (function (_super) {
        __extends(Embargo, _super);
        function Embargo(init) {
            return _super.call(this, 'trade ban', init) || this;
        }
        Embargo.prototype.chance = function () {
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
        Embargo.prototype.install_event_watchers = function () {
            var _this = this;
            window.addEventListener("itemsBought", function (event) {
                var _a = event.detail, body = _a.body, item = _a.item, count = _a.count;
                _this.violation(body, item, count);
            });
            window.addEventListener("itemsSold", function (event) {
                var _a = event.detail, body = _a.body, item = _a.item, count = _a.count;
                _this.violation(body, item, count);
            });
        };
        Embargo.prototype.violation = function (body, item, count) {
            if (!this.is_started || this.is_over)
                return true;
            if (this.target != data_1.default.bodies[body].faction)
                return false;
            var loss = count * 2;
            if (item == 'weapons')
                loss *= 2;
            window.game.player.decStanding(this.proponent, loss);
            window.game.notify("You are in violation of " + this.proponent + "'s trade ban against " + this.target + ". Your standing has decreased by " + loss + ".");
            return false;
        };
        return Embargo;
    }(Conflict));
    exports.Embargo = Embargo;
});
