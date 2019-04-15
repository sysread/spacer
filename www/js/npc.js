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
define(["require", "exports", "./data", "./ship", "./person", "./common", "./util"], function (require, exports, data_1, ship_1, person_1, t, util) {
    "use strict";
    data_1 = __importDefault(data_1);
    ship_1 = __importDefault(ship_1);
    t = __importStar(t);
    util = __importStar(util);
    var NPC = /** @class */ (function (_super) {
        __extends(NPC, _super);
        function NPC(opt) {
            var e_1, _a;
            var _this = this;
            /*
             * Random ship selection; override by explicitly setting opt.ship.
             * Otherwise, randomly selects one of opt.options.shipclass; if that is
             * not specified, defaults to all ship classes, excluding those that
             * are both restricted and are not a faction ship for the NPC's
             * faction.
             */
            var ship = new ship_1.default({ type: util.oneOf(opt.ship) });
            /*
             * Randomly select addons from opt.options.addons, if specified. Will
             * install between 0 and opt.ship.hardpoints addons; the least number
             * of addons to install may be specified using opt.options.min_addons.
             *
             * TODO Need some way to ensure that the add on mix has at least some
             * offensive capability.
             */
            if (opt.addons) {
                if (opt.always_addons) {
                    try {
                        for (var _b = __values(opt.always_addons), _c = _b.next(); !_c.done; _c = _b.next()) {
                            var addon = _c.value;
                            ship.installAddOn(addon);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                }
                var min_addons = Math.min(opt.min_addons || 0, ship.availableHardPoints());
                var amt_addons = util.getRandomInt(min_addons, ship.availableHardPoints());
                var addons = opt.addons;
                for (var i = 0; i < amt_addons; ++i) {
                    var addon = util.oneOf(addons);
                    if (addon) {
                        ship.installAddOn(addon);
                    }
                }
            }
            /*
             * Randomly select cargo from opt.options.cargo, defaulting to all
             * non-contraband cargo (with the exception of TRANSA, which may be
             * carrying contraband). A minimum count may be specified with
             * opt.options.min_cargo (default is 0).
             */
            var min_cargo = Math.min(opt.min_cargo || 0, ship.cargoLeft);
            var amt_cargo = util.getRandomInt(min_cargo, Math.floor(ship.cargoLeft / 2));
            var items = opt.cargo || t.resources;
            while (ship.cargoUsed < amt_cargo) {
                var item = util.oneOf(items);
                if (data_1.default.resources[item].contraband && opt.faction !== 'TRANSA')
                    continue;
                ship.loadCargo(item, 1);
            }
            var init = {
                name: opt.name,
                faction_name: opt.faction,
                home: data_1.default.factions[opt.faction].capital,
                standing: {},
                money: 0,
                ship: {
                    type: ship.type,
                    addons: ship.addons,
                    cargo: ship.cargo.store,
                },
            };
            _this = _super.call(this, init) || this;
            return _this;
        }
        return NPC;
    }(person_1.Person));
    return NPC;
});
