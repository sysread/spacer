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
    class NPC extends person_1.Person {
        constructor(opt) {
            /*
             * Random ship selection; override by explicitly setting opt.ship.
             * Otherwise, randomly selects one of opt.options.shipclass; if that is
             * not specified, defaults to all ship classes, excluding those that
             * are both restricted and are not a faction ship for the NPC's
             * faction.
             */
            const ship = new ship_1.default({ type: util.oneOf(opt.ship) });
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
                    for (const addon of opt.always_addons) {
                        ship.installAddOn(addon);
                    }
                }
                const min_addons = Math.min(opt.min_addons || 0, ship.availableHardPoints());
                const amt_addons = util.getRandomInt(min_addons, ship.availableHardPoints());
                const addons = opt.addons;
                for (let i = 0; i < amt_addons; ++i) {
                    const addon = util.oneOf(addons);
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
            const min_cargo = Math.min(opt.min_cargo || 0, ship.cargoLeft);
            const amt_cargo = util.getRandomInt(min_cargo, Math.floor(ship.cargoLeft / 2));
            const items = opt.cargo || t.resources;
            while (ship.cargoUsed < amt_cargo) {
                const item = util.oneOf(items);
                if (data_1.default.resources[item].contraband && opt.faction !== 'TRANSA')
                    continue;
                ship.loadCargo(item, 1);
            }
            const init = {
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
            super(init);
        }
    }
    return NPC;
});
