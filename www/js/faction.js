var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "./data"], function (require, exports, data_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    data_1 = __importDefault(data_1);
    var Faction = /** @class */ (function () {
        function Faction(abbrev) {
            if (typeof abbrev == 'object') {
                abbrev = abbrev.abbrev;
            }
            this.abbrev = abbrev;
        }
        Object.defineProperty(Faction.prototype, "desc", {
            get: function () { return data_1.default.factions[this.abbrev].desc; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Faction.prototype, "full_name", {
            get: function () { return data_1.default.factions[this.abbrev].full_name; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Faction.prototype, "capital", {
            get: function () { return data_1.default.factions[this.abbrev].capital; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Faction.prototype, "sales_tax", {
            get: function () { return data_1.default.factions[this.abbrev].sales_tax; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Faction.prototype, "patrol", {
            get: function () { return data_1.default.factions[this.abbrev].patrol; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Faction.prototype, "inspection", {
            get: function () { return data_1.default.factions[this.abbrev].inspection; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Faction.prototype, "standing", {
            get: function () { return data_1.default.factions[this.abbrev].standing; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Faction.prototype, "consumes", {
            get: function () { return data_1.default.factions[this.abbrev].consumes; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Faction.prototype, "produces", {
            get: function () { return data_1.default.factions[this.abbrev].produces; },
            enumerable: true,
            configurable: true
        });
        Faction.prototype.toString = function () { return this.abbrev; };
        return Faction;
    }());
    exports.Faction = Faction;
});
