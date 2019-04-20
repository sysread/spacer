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
define(["require", "exports", "./data", "./events", "./common"], function (require, exports, data_1, events_1, t) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    data_1 = __importDefault(data_1);
    t = __importStar(t);
    class Faction {
        constructor(abbrev) {
            if (typeof abbrev == 'object') {
                abbrev = abbrev.abbrev;
            }
            this.abbrev = abbrev;
            this.full_name = data_1.default.factions[this.abbrev].full_name;
            this.capital = data_1.default.factions[this.abbrev].capital;
            this.sales_tax = data_1.default.factions[this.abbrev].sales_tax;
            this.patrol = data_1.default.factions[this.abbrev].patrol;
            this.piracy = data_1.default.factions[this.abbrev].piracy;
            this.inspection = data_1.default.factions[this.abbrev].inspection;
            this.standing = data_1.default.factions[this.abbrev].standing;
            this.consumes = data_1.default.factions[this.abbrev].consumes;
            this.produces = data_1.default.factions[this.abbrev].produces;
            events_1.watch("caughtSmuggling", (ev) => this.onCaughtSmuggling(ev));
        }
        get desc() {
            return data_1.default.factions[this.abbrev].desc;
        }
        get hasTradeBan() {
            const trade_bans = window.game.get_conflicts({
                target: this.abbrev,
                name: 'blockade',
            });
            return trade_bans.length > 0;
        }
        toString() {
            return this.abbrev;
        }
        isContraband(item, player) {
            // item is not contraband
            if (!data_1.default.resources[item].contraband)
                return false;
            // special case: weapons are not contraband if local standing is Admired
            if (item == 'weapons' && player.hasStanding(this, 'Admired'))
                return false;
            return true;
        }
        inspectionFine(player) {
            return Math.max(10, data_1.default.max_abs_standing - player.getStanding(this));
        }
        onCaughtSmuggling(ev) {
            const { faction, found } = ev.detail;
            if (faction == this.abbrev && !this.hasTradeBan) {
                let loss = 0;
                let fine = 0;
                for (let item of Object.keys(found)) {
                    let count = found[item] || 0;
                    fine += count * exports.factions[faction].inspectionFine(window.game.player);
                    loss += count * 2;
                }
                window.game.player.debit(fine);
                window.game.player.decStanding(this.abbrev, loss);
                window.game.notify(`Busted! You have been fined ${fine} credits and your standing decreased by ${loss}.`);
            }
            return { complete: false };
        }
    }
    exports.Faction = Faction;
    exports.factions = {};
    for (const abbrev of t.factions) {
        exports.factions[abbrev] = new Faction(abbrev);
    }
});
