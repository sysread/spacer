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
define(["require", "exports", "./data", "./system", "./physics", "./events", "./util"], function (require, exports, data_1, system_1, physics_1, events_1, util) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    data_1 = __importDefault(data_1);
    system_1 = __importDefault(system_1);
    physics_1 = __importDefault(physics_1);
    util = __importStar(util);
    var Status;
    (function (Status) {
        Status[Status["Ready"] = 0] = "Ready";
        Status[Status["Accepted"] = 1] = "Accepted";
        Status[Status["Complete"] = 2] = "Complete";
        Status[Status["Success"] = 3] = "Success";
        Status[Status["Failure"] = 4] = "Failure";
    })(Status = exports.Status || (exports.Status = {}));
    var Mission = /** @class */ (function () {
        function Mission(opt) {
            this.status = opt.status || Status.Ready;
            this.standing = opt.standing;
            this.reward = opt.reward;
            this.turns = opt.turns;
            this.issuer = opt.issuer;
            this.deadline = opt.deadline;
        }
        Object.defineProperty(Mission.prototype, "faction", {
            get: function () {
                return data_1.default.bodies[this.issuer].faction;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Mission.prototype, "price", {
            // TODO race condition: if player gains or loses standing during mission, the pay rate changes
            get: function () {
                if (window.game && window.game.player) {
                    var bonus = window.game.player.getStandingPriceAdjustment(this.faction);
                    return Math.ceil(this.reward * (1 + bonus));
                }
                else {
                    return this.reward;
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Mission.prototype, "turns_left", {
            get: function () {
                var left = 0;
                if (this.deadline) {
                    left = Math.max(0, this.deadline - window.game.turns);
                }
                else {
                    left = this.turns;
                }
                return Math.max(0, left);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Mission.prototype, "is_expired", {
            get: function () {
                return this.status != Status.Success
                    && this.turns_left <= 0;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Mission.prototype, "is_complete", {
            get: function () {
                return this.status >= Status.Complete;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Mission.prototype, "time_left", {
            get: function () {
                var days = util.csn(Math.floor(this.turns_left / data_1.default.turns_per_day));
                var hours = Math.floor((this.turns_left % data_1.default.turns_per_day) * data_1.default.hours_per_turn);
                if (hours) {
                    return days + " days, " + hours + " hours";
                }
                else {
                    return days + " days";
                }
            },
            enumerable: true,
            configurable: true
        });
        Mission.prototype.setStatus = function (status) {
            if (this.status >= status) {
                var info = JSON.stringify(this);
                throw new Error("invalid state transition: " + this.status + " to " + status + ": " + info);
            }
            this.status = status;
        };
        Mission.prototype.accept = function () {
            var _this = this;
            // If already set, this is a saved mission being reinitialized
            if (this.status < Status.Accepted) {
                this.status = Status.Accepted;
                this.deadline = window.game.turns + this.turns;
                window.game.planets[this.issuer].acceptMission(this);
                window.game.player.acceptMission(this);
            }
            events_1.Events.watch(events_1.Ev.Turn, function (event) {
                if (_this.turns_left <= 0) {
                    _this.complete();
                    return false;
                }
                else {
                    return true;
                }
            });
        };
        Mission.prototype.complete = function () {
            // Mission was already completed
            if (this.status > Status.Complete) {
                return;
            }
            // TODO notification system
            if (this.turns_left >= 0) {
                this.finish();
            }
            else {
                this.cancel();
            }
        };
        Mission.prototype.finish = function () {
            this.setStatus(Status.Success);
            window.game.player.credit(this.price); // this must happen first, as price is affected by standing
            window.game.player.incStanding(this.faction, this.standing);
            window.game.player.completeMission(this);
            window.game.save_game();
        };
        Mission.prototype.cancel = function () {
            this.setStatus(Status.Failure);
            window.game.player.decStanding(this.faction, this.standing / 2);
            window.game.player.completeMission(this);
            window.game.save_game();
        };
        return Mission;
    }());
    exports.Mission = Mission;
    var Passengers = /** @class */ (function (_super) {
        __extends(Passengers, _super);
        function Passengers(opt) {
            var _this = this;
            var dist = util.R(system_1.default.distance(opt.issuer, opt.dest) / physics_1.default.AU);
            //opt.turns = Math.max(data.turns_per_day * 3, data.turns_per_day * 7 * dist);
            // TODO race condition here; the orig and dest are moving so long as the
            // contract is offered, which may make the deadline impossible after
            // several days.
            opt.turns = Math.max(data_1.default.turns_per_day * 3, Passengers.estimateTimeNeeded(opt.issuer, opt.dest));
            opt.reward = Math.max(500, Math.ceil(Math.log(1 + opt.turns) * 2500));
            opt.standing = Math.ceil(Math.log10(opt.reward));
            _this = _super.call(this, opt) || this;
            _this.dest = opt.dest;
            return _this;
        }
        Passengers.estimateTimeNeeded = function (orig, dest) {
            var au = util.R(system_1.default.distance(orig, dest) / physics_1.default.AU);
            var turns = 0;
            for (var i = 0, inc = 15; i < au; ++i, inc *= 0.8) {
                turns += inc * data_1.default.turns_per_day;
            }
            return Math.ceil(turns);
        };
        Object.defineProperty(Passengers.prototype, "destination", {
            get: function () {
                return data_1.default.bodies[this.dest].name;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Passengers.prototype, "title", {
            get: function () {
                var reward = util.csn(this.price);
                return "Passengers to " + this.destination + " in " + this.time_left + " for " + reward + "c";
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Passengers.prototype, "short_title", {
            get: function () {
                var dest = util.ucfirst(this.dest);
                return "Passengers to " + dest;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Passengers.prototype, "description", {
            get: function () {
                var reward = util.csn(this.price);
                var faction = data_1.default.factions[data_1.default.bodies[this.issuer].faction].full_name;
                if (!faction.startsWith('The '))
                    faction = 'The ' + faction;
                return [
                    "Provide legal transport to these passengers to " + this.destination + ".",
                    "They must arrive at their destination within " + this.time_left + "; you will receive " + reward + " credits on arrival.",
                    "These passengers are legal citizens of " + faction + " and are protected by the laws of their government.",
                    "Failure to complete the contract will result in a loss of standing and/or monetary penalties.",
                ].join(' ');
            },
            enumerable: true,
            configurable: true
        });
        Passengers.prototype.accept = function () {
            var _this = this;
            _super.prototype.accept.call(this);
            events_1.Events.watch(events_1.Ev.Arrived, function (event) {
                if (_this.is_expired) {
                    return false;
                }
                if (event.dest == _this.dest) {
                    _this.setStatus(Status.Complete);
                    _this.complete();
                    return false;
                }
                else {
                    return true;
                }
            });
        };
        return Passengers;
    }(Mission));
    exports.Passengers = Passengers;
});
