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
define(["require", "exports", "./data", "./faction", "./events", "./util"], function (require, exports, data_1, faction_1, events_1, util) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    data_1 = __importDefault(data_1);
    util = __importStar(util);
    const isProductionEffect = (e) => e.production != undefined;
    const isConsumptionEffect = (e) => e.consumption != undefined;
    const isPatrolEffect = (e) => e.patrol_rate != undefined;
    const isPiracyEffect = (e) => e.piracy_rate != undefined;
    const isTradeBan = (e) => e.trade_ban != undefined;
    const isTariff = (e) => e.tariff != undefined;
    const isShortageTrigger = (tr) => tr.shortage;
    const isSurplusTrigger = (tr) => tr.surplus;
    const isRandomTrigger = (tr) => tr.random;
    class Condition {
        constructor(name, init) {
            this.name = name;
            this.duration = init.duration;
            if (this.is_started && !this.is_over) {
                this.install_event_watchers();
            }
        }
        get is_started() {
            return this.duration && this.duration.starts <= window.game.turns;
        }
        get is_over() {
            return this.duration && this.duration.ends <= window.game.turns;
        }
        start(turns) {
            this.duration = {
                starts: window.game.turns,
                ends: window.game.turns + turns,
            };
            this.install_event_watchers();
        }
    }
    class Conflict extends Condition {
        constructor(name, init) {
            super(name, init);
            this.proponent = init.proponent;
            this.target = init.target;
        }
        get key() {
            return [this.name, this.proponent, this.target].join('_');
        }
    }
    exports.Conflict = Conflict;
    class Blockade extends Conflict {
        constructor(init) {
            super('blockade', init);
        }
        chance() {
            if (this.proponent == this.target)
                return false;
            const standing = data_1.default.factions[this.proponent].standing[this.target] || 0;
            let chance = 0;
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
        }
        install_event_watchers() {
            events_1.watch("caughtSmuggling", (ev) => {
                const { faction, found } = ev.detail;
                this.violation(faction, found);
                return { complete: true };
            });
        }
        violation(faction_name, found) {
            if (!this.is_started || this.is_over)
                return true;
            if (this.target != faction_name)
                return false;
            const faction = faction_1.factions[faction_name];
            let loss = 0;
            let fine = 0;
            for (let item of Object.keys(found)) {
                let count = found[item] || 0;
                loss += (item == 'weapons') ? count * 4 : count * 2;
                fine += count * faction.inspectionFine(window.game.player);
                window.game.player.ship.unloadCargo(item, count);
            }
            window.game.player.debit(fine);
            window.game.player.decStanding(this.proponent, loss);
            window.game.notify(`You are in violation of ${this.proponent}'s blockade against ${this.target}. You have been fined ${fine} credits and your standing decreased by ${loss}.`);
            return false;
        }
    }
    exports.Blockade = Blockade;
});
