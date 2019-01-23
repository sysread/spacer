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
    class Mission {
        constructor(opt) {
            this.status = opt.status || Status.Ready;
            this.standing = opt.standing;
            this.reward = opt.reward;
            this.turns = opt.turns;
            this.issuer = opt.issuer;
            this.deadline = opt.deadline;
        }
        get faction() {
            return data_1.default.bodies[this.issuer].faction;
        }
        // TODO race condition: if player gains or loses standing during mission, the pay rate changes
        get price() {
            if (window.game && window.game.player) {
                const bonus = window.game.player.getStandingPriceAdjustment(this.faction);
                return Math.ceil(this.reward * (1 + bonus));
            }
            else {
                return this.reward;
            }
        }
        get turns_left() {
            let left = 0;
            if (this.deadline) {
                left = Math.max(0, this.deadline - window.game.turns);
            }
            else {
                left = this.turns;
            }
            return Math.max(0, left);
        }
        get is_expired() {
            return this.status != Status.Success
                && this.turns_left <= 0;
        }
        get is_complete() {
            return this.status >= Status.Complete;
        }
        get time_left() {
            const days = util.csn(Math.floor(this.turns_left / data_1.default.turns_per_day));
            const hours = Math.floor((this.turns_left % data_1.default.turns_per_day) * data_1.default.hours_per_turn);
            if (hours) {
                return `${days} days, ${hours} hours`;
            }
            else {
                return `${days} days`;
            }
        }
        setStatus(status) {
            if (this.status >= status) {
                const info = JSON.stringify(this);
                throw new Error(`invalid state transition: ${this.status} to ${status}: ${info}`);
            }
            this.status = status;
        }
        accept() {
            // If already set, this is a saved mission being reinitialized
            if (this.status < Status.Accepted) {
                this.status = Status.Accepted;
                this.deadline = window.game.turns + this.turns;
                window.game.planets[this.issuer].acceptMission(this);
                window.game.player.acceptMission(this);
            }
            events_1.Events.watch(events_1.Ev.Turn, (event) => {
                if (this.turns_left <= 0) {
                    this.complete();
                    return false;
                }
                else {
                    return true;
                }
            });
        }
        complete() {
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
        }
        finish() {
            this.setStatus(Status.Success);
            window.game.player.credit(this.price); // this must happen first, as price is affected by standing
            window.game.player.incStanding(this.faction, this.standing);
            window.game.player.completeMission(this);
            window.game.save_game();
        }
        cancel() {
            this.setStatus(Status.Failure);
            window.game.player.decStanding(this.faction, this.standing / 2);
            window.game.player.completeMission(this);
            window.game.save_game();
        }
    }
    exports.Mission = Mission;
    class Passengers extends Mission {
        constructor(opt) {
            const dist = util.R(system_1.default.distance(opt.issuer, opt.dest) / physics_1.default.AU);
            //opt.turns = Math.max(data.turns_per_day * 3, data.turns_per_day * 7 * dist);
            // TODO race condition here; the orig and dest are moving so long as the
            // contract is offered, which may make the deadline impossible after
            // several days.
            opt.turns = Math.max(data_1.default.turns_per_day * 3, Passengers.estimateTimeNeeded(opt.issuer, opt.dest));
            opt.reward = Math.max(500, Math.ceil(Math.log(1 + opt.turns) * 2500));
            opt.standing = Math.ceil(Math.log10(opt.reward));
            super(opt);
            this.dest = opt.dest;
        }
        static estimateTimeNeeded(orig, dest) {
            let au = util.R(system_1.default.distance(orig, dest) / physics_1.default.AU);
            let turns = 0;
            for (let i = 0, inc = 15; i < au; ++i, inc *= 0.8) {
                turns += inc * data_1.default.turns_per_day;
            }
            return Math.ceil(turns);
        }
        get destination() {
            return data_1.default.bodies[this.dest].name;
        }
        get title() {
            const reward = util.csn(this.price);
            return `Passengers to ${this.destination} in ${this.time_left} for ${reward}c`;
        }
        get short_title() {
            const dest = util.ucfirst(this.dest);
            return `Passengers to ${dest}`;
        }
        get description() {
            const reward = util.csn(this.price);
            let faction = data_1.default.factions[data_1.default.bodies[this.issuer].faction].full_name;
            if (!faction.startsWith('The '))
                faction = 'The ' + faction;
            return [
                `Provide legal transport to these passengers to ${this.destination}.`,
                `They must arrive at their destination within ${this.time_left}; you will receive ${reward} credits on arrival.`,
                `These passengers are legal citizens of ${faction} and are protected by the laws of their government.`,
                `Failure to complete the contract will result in a loss of standing and/or monetary penalties.`,
            ].join(' ');
        }
        accept() {
            super.accept();
            events_1.Events.watch(events_1.Ev.Arrived, (event) => {
                if (this.is_expired) {
                    return false;
                }
                if (event.dest == this.dest) {
                    this.setStatus(Status.Complete);
                    this.complete();
                    return false;
                }
                else {
                    return true;
                }
            });
        }
    }
    exports.Passengers = Passengers;
});
