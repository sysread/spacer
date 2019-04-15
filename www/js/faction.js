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
define(["require", "exports", "./data", "./common"], function (require, exports, data_1, t) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    data_1 = __importDefault(data_1);
    t = __importStar(t);
    var e_1, _a;
    var Faction = /** @class */ (function () {
        function Faction(abbrev) {
            var _this = this;
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
            window.addEventListener("caughtSmuggling", function (ev) { return _this.onCaughtSmuggling(ev); });
        }
        Object.defineProperty(Faction.prototype, "desc", {
            get: function () {
                return data_1.default.factions[this.abbrev].desc;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Faction.prototype, "hasTradeBan", {
            get: function () {
                var trade_bans = window.game.get_conflicts({
                    target: this.abbrev,
                    name: 'blockade',
                });
                return trade_bans.length > 0;
            },
            enumerable: true,
            configurable: true
        });
        Faction.prototype.toString = function () {
            return this.abbrev;
        };
        Faction.prototype.isContraband = function (item, player) {
            // item is not contraband
            if (!data_1.default.resources[item].contraband)
                return false;
            // special case: weapons are not contraband if local standing is Admired
            if (item == 'weapons' && player.hasStanding(this, 'Admired'))
                return false;
            return true;
        };
        Faction.prototype.inspectionFine = function (player) {
            return Math.max(10, data_1.default.max_abs_standing - player.getStanding(this));
        };
        Faction.prototype.onCaughtSmuggling = function (ev) {
            var e_2, _a;
            var _b = ev.detail, faction = _b.faction, found = _b.found;
            if (faction != this.abbrev)
                return;
            if (this.hasTradeBan)
                return;
            var loss = 0;
            var fine = 0;
            try {
                for (var _c = __values(Object.keys(found)), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var item = _d.value;
                    var count = found[item] || 0;
                    fine += count * exports.factions[faction].inspectionFine(window.game.player);
                    loss += count * 2;
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_2) throw e_2.error; }
            }
            window.game.player.debit(fine);
            window.game.player.decStanding(this.abbrev, loss);
            window.game.notify("Busted! You have been fined " + fine + " credits and your standing decreased by " + loss + ".");
            return false;
        };
        return Faction;
    }());
    exports.Faction = Faction;
    exports.factions = {};
    try {
        for (var _b = __values(t.factions), _c = _b.next(); !_c.done; _c = _b.next()) {
            var abbrev = _c.value;
            exports.factions[abbrev] = new Faction(abbrev);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_1) throw e_1.error; }
    }
});
