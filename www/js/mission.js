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
define(["require", "exports", "./data", "./system", "./physics", "./resource", "./navcomp", "./events", "./util"], function (require, exports, data_1, system_1, physics_1, resource_1, navcomp_1, events_1, util) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    data_1 = __importDefault(data_1);
    system_1 = __importDefault(system_1);
    physics_1 = __importDefault(physics_1);
    util = __importStar(util);
    function estimateTransitTimeAU(au) {
        const s = au * physics_1.default.AU;
        const a = 0.05 * physics_1.default.G;
        const t = navcomp_1.motion.travel_time(s, a);
        const spt = data_1.default.hours_per_turn * 3600;
        return Math.ceil(t / spt);
    }
    exports.estimateTransitTimeAU = estimateTransitTimeAU;
    function estimateTransitTime(orig, dest) {
        let au = util.R(system_1.default.distance(orig, dest) / physics_1.default.AU);
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
    class Mission {
        constructor(opt) {
            this.status = opt.status || Status.Ready;
            this.standing = opt.standing || 0;
            this.reward = opt.reward || 0;
            this.turns = opt.turns || 0;
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
        get is_accepted() {
            return this.status == Status.Accepted;
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
        get time_total() {
            const days = util.csn(Math.floor(this.turns / data_1.default.turns_per_day));
            const hours = Math.floor((this.turns_left % data_1.default.turns_per_day) * data_1.default.hours_per_turn);
            if (hours) {
                return `${days} days, ${hours} hours`;
            }
            else {
                return `${days} days`;
            }
        }
        get end_date() {
            const date = new Date(window.game.date);
            date.setTime(date.getTime() + (this.turns_left * data_1.default.hours_per_turn * 60 * 60 * 1000));
            return window.game.strdate(date);
        }
        setStatus(status) {
            if (this.status >= status) {
                const info = JSON.stringify(this);
                throw new Error(`invalid state transition: ${this.status} to ${status}: ${info}`);
            }
            this.status = status;
        }
        accept() {
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
            events_1.watch('turn', () => {
                if (this.turns_left == 0) {
                    console.log('mission over:', this.title);
                    this.complete();
                    return { complete: true };
                }
                return { complete: false };
            });
        }
        complete() {
            // Mission was already completed
            if (this.status > Status.Complete) {
                return;
            }
            window.game.notify(`Contract expired: ${this.short_title}`);
            this.cancel();
        }
        finish() {
            this.setStatus(Status.Success);
            window.game.player.credit(this.price); // this must happen first, as price is affected by standing
            window.game.player.incStanding(this.faction, this.standing);
            window.game.player.completeMission(this);
            window.game.save_game();
            window.game.notify(`Contract completed: ${this.short_title}. ${util.csn(this.price)} credits have been deposited in your account.`);
        }
        cancel() {
            this.setStatus(Status.Failure);
            window.game.player.decStanding(this.faction, this.standing / 2);
            window.game.player.completeMission(this);
            window.game.save_game();
            window.game.notify(`Contract cancelled: ${this.short_title}`);
        }
    }
    exports.Mission = Mission;
    class Passengers extends Mission {
        constructor(opt) {
            const est = estimateTransitTime(opt.issuer, opt.dest);
            // TODO race condition here; the orig and dest are moving so long as the
            // contract is offered, which may make the deadline impossible after
            // several days.
            // NOTE these are NOT restored from opt when reinitialized from game data.
            // they should always be fresh.
            const params = Passengers.mission_parameters(opt.issuer, opt.dest);
            opt.turns = params.turns;
            opt.reward = params.reward;
            opt.standing = Math.ceil(Math.log10(params.reward));
            super(opt);
            this.dest = opt.dest;
        }
        static mission_parameters(orig, dest) {
            const nav = new navcomp_1.NavComp(window.game.player, orig, false, data_1.default.shipclass.schooner.tank, true);
            const transit = nav.getFastestTransitTo(dest);
            if (transit) {
                const rate = 3 * window.game.planets[orig].buyPrice('fuel');
                const cost = Math.ceil(util.fuzz(Math.max(500, Math.ceil(transit.au * rate)), 0.05));
                const turns = Math.ceil(transit.turns * 2);
                return { reward: cost, turns: turns };
            }
            else {
                throw new Error(`no transits possible between ${orig} and ${dest}`);
            }
        }
        get destination() {
            return data_1.default.bodies[this.dest].name;
        }
        get mission_type() {
            return 'Passenger';
        }
        get title() {
            const reward = util.csn(this.price);
            return `Passengers to ${this.destination} in ${this.time_left} for ${reward}c`;
        }
        get short_title() {
            const dest = util.ucfirst(this.dest);
            return `Passengers to ${this.destination}`;
        }
        get description() {
            const reward = util.csn(this.price);
            let faction = data_1.default.factions[data_1.default.bodies[this.issuer].faction].full_name;
            if (!faction.startsWith('The '))
                faction = 'The ' + faction;
            return [
                `Provide legal transport to these passengers to ${this.destination}.`,
                `They must arrive at their destination within ${this.time_total} by ${this.end_date}; you will receive ${reward} credits on arrival.`,
                `These passengers are legal citizens of ${faction} and are protected by the laws of their government.`,
                `Failure to complete the contract will result in a loss of standing and/or monetary penalties.`,
                `You have ${this.time_left} remaining to complete this contract.`,
            ].join(' ');
        }
        get description_remaining() {
            return `You have ${this.time_left} remaining to complete this contract.`;
        }
        accept() {
            super.accept();
            events_1.watch('arrived', (ev) => {
                if (!this.is_expired && ev.detail.dest == this.dest) {
                    console.log("passengers mission complete:", this.short_title);
                    this.finish();
                    return { complete: true };
                }
                return { complete: false };
            });
        }
    }
    exports.Passengers = Passengers;
    class Smuggler extends Mission {
        constructor(opt) {
            opt.turns = Math.ceil(1.5 * estimateTransitTimeAU(util.getRandomInt(5, 10)));
            opt.reward = 1.5 * resource_1.resources[opt.item].value * opt.amt;
            opt.standing = Math.ceil(Math.log10(opt.reward));
            super(opt);
            this.item = opt.item;
            this.amt = opt.amt;
            this.amt_left = opt.amt_left || opt.amt;
        }
        get mission_type() {
            return 'Smuggling';
        }
        get title() {
            const name = window.game.planets[this.issuer].name;
            return `Smuggle ${this.amt} units of ${this.item} to ${name}`;
        }
        get short_title() {
            const name = window.game.planets[this.issuer].name;
            return `Smuggle ${this.item} to ${name}`;
        }
        get description() {
            const reward = util.csn(this.price);
            const factions = window.game.get_conflicts({
                name: 'blockade',
                target: this.issuer,
            }).map((c) => c.proponent);
            const lines = [];
            if (data_1.default.resources[this.item].contraband) {
                lines.push(`We wish to acquire some ${this.item} in a quiet fashion. We heard that you were a person of tact who may be able to assist us.`);
            }
            else if (window.game.planets[this.issuer].hasTradeBan) {
                lines.push(`There is currently a ban in trade against our faction. As a result, we are in desparate need of ${this.item} as our supplies dwindle.`);
            }
            lines.push(`We are asking you to acquire ${this.amt} units of ${this.item} and return them here within ${this.time_total} by ${this.end_date}.`, `These goods will be quietly removed from your hold by our people when you arrive at the dock.`, `We will offer you ${reward} credits you for the completion of this contract in a timely fashion.`);
            return lines.join(' ');
        }
        get description_remaining() {
            return [
                `You have ${this.amt_left} remaining units to deliver.`,
                `You have ${this.time_left} remaining to complete this contract.`,
            ].join(' ');
        }
        checkMissionStatus() {
            if (!this.is_expired && !this.is_complete && window.game.locus == this.issuer) {
                const amt = Math.min(this.amt_left, window.game.player.ship.cargo.count(this.item));
                if (amt > 0) {
                    this.amt_left -= amt;
                    window.game.player.ship.unloadCargo(this.item, amt);
                    window.game.planets[this.issuer].sell(this.item, amt);
                    if (this.amt_left == 0) {
                        window.game.notify(`All promised units of ${this.item} have been delivered.`);
                        this.finish();
                        return true;
                    }
                    else {
                        window.game.notify(`You have delivered ${amt} units of ${this.item}. ${this.description_remaining}.`);
                        return false;
                    }
                }
            }
            return false;
        }
        accept() {
            super.accept();
            // maybe the player already has some of the goods in the ship's hold
            this.checkMissionStatus();
            events_1.watch('arrived', (event) => {
                if (this.checkMissionStatus()) {
                    return { complete: true };
                }
                return { complete: false };
            });
            events_1.watch('caughtSmuggling', (event) => {
                if (!this.is_expired && !this.is_complete) {
                    this.cancel();
                    return { complete: true };
                }
                return { complete: false };
            });
        }
    }
    exports.Smuggler = Smuggler;
});
