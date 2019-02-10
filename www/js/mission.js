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
define(["require", "exports", "./data", "./system", "./physics", "./resource", "./navcomp", "./util"], function (require, exports, data_1, system_1, physics_1, resource_1, navcomp_1, util) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    data_1 = __importDefault(data_1);
    system_1 = __importDefault(system_1);
    physics_1 = __importDefault(physics_1);
    util = __importStar(util);
    function estimateTransitTimeAU(au) {
        var turns = 0;
        for (var i = 0, inc = 15; i < au; ++i, inc *= 0.8) {
            turns += inc * data_1.default.turns_per_day;
        }
        return Math.ceil(turns);
    }
    exports.estimateTransitTimeAU = estimateTransitTimeAU;
    function estimateTransitTime(orig, dest) {
        var au = util.R(system_1.default.distance(orig, dest) / physics_1.default.AU);
        return estimateTransitTimeAU(au);
    }
    exports.estimateTransitTime = estimateTransitTime;
    var Status;
    (function (Status) {
        Status[Status["Ready"] = 0] = "Ready";
        Status[Status["Accepted"] = 1] = "Accepted";
        Status[Status["Complete"] = 2] = "Complete";
        Status[Status["Success"] = 3] = "Success";
        Status[Status["Failure"] = 4] = "Failure";
    })(Status = exports.Status || (exports.Status = {}));
    function restoreMission(opt) {
        if (opt.dest) {
            return new Passengers(opt);
        }
        if (opt.item) {
            return new Smuggler(opt);
        }
        throw new Error('mission data does not match recognized mission type');
    }
    exports.restoreMission = restoreMission;
    var Mission = /** @class */ (function () {
        function Mission(opt) {
            this.status = opt.status || Status.Ready;
            this.standing = opt.standing || 0;
            this.reward = opt.reward || 0;
            this.turns = opt.turns || 0;
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
        Object.defineProperty(Mission.prototype, "time_total", {
            get: function () {
                var days = util.csn(Math.floor(this.turns / data_1.default.turns_per_day));
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
        Object.defineProperty(Mission.prototype, "end_date", {
            get: function () {
                var date = new Date(window.game.date);
                date.setDate(date.getDate() + (this.turns_left * data_1.default.turns_per_day));
                return window.game.strdate(date);
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
            // If not already set, this is a new mission, rather than an already
            // accepted mission being reinitialized.
            if (this.status < Status.Accepted) {
                // Ask issuer to remove it from its list of offered work
                window.game.planets[this.issuer].acceptMission(this);
                // Set the deadline
                this.deadline = window.game.turns + this.turns;
            }
            // Either way, set the status to Accepted
            this.status = Status.Accepted;
            // ...and ask the player object to retain it
            window.game.player.acceptMission(this);
            window.addEventListener('turn', function () {
                if (_this.turns_left <= 0) {
                    console.log('mission complete:', _this.title);
                    _this.complete();
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
            window.game.notify("Contract completed: " + this.short_title + ". " + util.csn(this.price) + " credits have been deposited in your account.");
        };
        Mission.prototype.cancel = function () {
            this.setStatus(Status.Failure);
            window.game.player.decStanding(this.faction, this.standing / 2);
            window.game.player.completeMission(this);
            window.game.save_game();
            window.game.notify("Contract cancelled: " + this.short_title);
        };
        return Mission;
    }());
    exports.Mission = Mission;
    var Passengers = /** @class */ (function (_super) {
        __extends(Passengers, _super);
        function Passengers(opt) {
            var _this = this;
            var est = estimateTransitTime(opt.issuer, opt.dest);
            // TODO race condition here; the orig and dest are moving so long as the
            // contract is offered, which may make the deadline impossible after
            // several days.
            // NOTE these are NOT restored from opt when reinitialized from game data.
            // they should always be fresh.
            var params = Passengers.mission_parameters(opt.issuer, opt.dest);
            opt.turns = params.turns;
            opt.reward = params.reward;
            opt.standing = Math.ceil(Math.log10(params.reward));
            _this = _super.call(this, opt) || this;
            _this.dest = opt.dest;
            return _this;
        }
        Passengers.mission_parameters = function (orig, dest) {
            var nav = new navcomp_1.NavComp(window.game.player, orig, false, data_1.default.shipclass.schooner.tank);
            var transit = nav.guestimate(dest);
            if (transit) {
                var rate = 3 * window.game.planets[orig].buyPrice('fuel');
                var cost = util.fuzz(Math.max(500, Math.ceil(transit.au * rate)), 0.05);
                var turns = Math.ceil(transit.turns * 1.5);
                return { reward: cost, turns: turns };
            }
            else {
                throw new Error('no transits possible');
            }
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
                    "They must arrive at their destination within " + this.time_total + " by " + this.end_date + "; you will receive " + reward + " credits on arrival.",
                    "These passengers are legal citizens of " + faction + " and are protected by the laws of their government.",
                    "Failure to complete the contract will result in a loss of standing and/or monetary penalties.",
                    "You have " + this.time_left + " remaining to complete this contract.",
                ].join(' ');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Passengers.prototype, "description_remaining", {
            get: function () {
                return "You have " + this.time_left + " remaining to complete this contract.";
            },
            enumerable: true,
            configurable: true
        });
        Passengers.prototype.accept = function () {
            var _this = this;
            _super.prototype.accept.call(this);
            window.addEventListener('arrived', function (event) {
                if (!_this.is_expired && event.detail.dest == _this.dest) {
                    console.log("passengers mission complete:", _this.short_title);
                    _this.setStatus(Status.Complete);
                    _this.complete();
                }
            });
        };
        return Passengers;
    }(Mission));
    exports.Passengers = Passengers;
    var Smuggler = /** @class */ (function (_super) {
        __extends(Smuggler, _super);
        function Smuggler(opt) {
            var _this = this;
            opt.turns = 2 * Math.max(data_1.default.turns_per_day * 3, estimateTransitTimeAU(10));
            opt.reward = 4 * resource_1.resources[opt.item].value * opt.amt;
            opt.standing = Math.ceil(Math.log10(opt.reward));
            _this = _super.call(this, opt) || this;
            _this.item = opt.item;
            _this.amt = opt.amt;
            _this.amt_left = opt.amt_left || opt.amt;
            return _this;
        }
        Object.defineProperty(Smuggler.prototype, "title", {
            get: function () {
                var name = window.game.planets[this.issuer].name;
                return "Smuggle " + this.amt + " units of " + this.item + " to " + name;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Smuggler.prototype, "short_title", {
            get: function () {
                var name = window.game.planets[this.issuer].name;
                return "Smuggle " + this.item + " to " + name;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Smuggler.prototype, "description", {
            get: function () {
                var reward = util.csn(this.price);
                var factions = window.game.get_conflicts({
                    name: 'trade ban',
                    target: this.issuer,
                }).map(function (c) { return c.proponent; });
                return [
                    "There is currently a ban in trade against our faction.",
                    "As a result, we are in desparate need of " + this.item + " as our supplies dwindle.",
                    "We are asking you to acquire " + this.amt + " units of " + this.item + " and return them here within " + this.time_total + " by " + this.end_date + ".",
                    "These goods will be quietly removed from your hold by our people when you arrive at the dock.",
                    "We will offer you " + reward + " credits you for the completion of this contract in a timely fashion.",
                ].join(' ');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Smuggler.prototype, "description_remaining", {
            get: function () {
                return [
                    "You have " + this.amt_left + " remaining units to deliver.",
                    "You have " + this.time_left + " remaining to complete this contract.",
                ].join(' ');
            },
            enumerable: true,
            configurable: true
        });
        Smuggler.prototype.accept = function () {
            var _this = this;
            _super.prototype.accept.call(this);
            window.addEventListener('arrived', function (event) {
                if (!_this.is_expired && !_this.is_complete && event.detail.dest == _this.issuer) {
                    var amt = Math.min(_this.amt_left, window.game.player.ship.cargo.count(_this.item));
                    if (amt > 0) {
                        _this.amt_left -= amt;
                        window.game.player.ship.unloadCargo(_this.item, amt);
                        window.game.planets[_this.issuer].sell(_this.item, amt);
                        if (_this.amt_left == 0) {
                            _this.setStatus(Status.Complete);
                            _this.complete();
                        }
                        else {
                            window.game.notify("You have delivered " + amt + " units of " + _this.item + ". " + _this.description_remaining + ".");
                        }
                    }
                }
            });
            window.addEventListener('caughtSmuggling', function (event) {
                if (!_this.is_expired && !_this.is_complete) {
                    _this.setStatus(Status.Failure);
                    _this.complete();
                }
            });
        };
        return Smuggler;
    }(Mission));
    exports.Smuggler = Smuggler;
});
