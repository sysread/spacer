var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "./data"], function (require, exports, data_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    data_1 = __importDefault(data_1);
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
        }
        get desc() { return data_1.default.factions[this.abbrev].desc; }
        toString() { return this.abbrev; }
    }
    exports.Faction = Faction;
});
