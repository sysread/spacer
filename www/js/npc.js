define(function(require, exports, module) {
  const data   = require('data');
  const util   = require('util');
  const Ship   = require('ship');
  const Person = require('person');

  return class extends Person {
    constructor(opt) {
      if (opt.options) {
        /*
         * Random ship selection; override by explicitly setting opt.ship.
         * Otherwise, randomly selects one of opt.options.shipclass; if that is
         * not specified, defaults to all ship classes, excluding those that
         * are both restricted and are not a faction ship for the NPC's
         * faction.
         */
        if (!opt.ship) {
          const ships
              = opt.options.ship
                  .filter(s => !data.shipclass[s].faction                 // either not a faction ship
                            || data.shipclass[s].faction == opt.faction)  // ...or of the npc's faction
             || Object.keys(data.shipclass)
                  .filter(s => !data.shipclass[s].restricted              // either unrestricted
                            || data.shipclass[s].faction == opt.faction); // ...or of the npc's faction

          opt.ship = new Ship({ type: util.oneOf(opt.options.ship) });
        }

        /*
         * Randomly select addons from opt.options.addons, if specified. Will
         * install between 0 and opt.ship.hardpoints addons; the least number
         * of addons to install may be specified using opt.options.min_addons.
         *
         * TODO Need some way to ensure that the add on mix has at least some
         * offensive capability.
         */
        if (opt.options.addons) {
          const min    = Math.min(opt.options.min_addons || 0, opt.ship.availableHardPoints());
          const count  = util.getRandomInt(min, opt.ship.availableHardPoints());
          const addons = opt.options.addons;

          for (let i = 0; i < count; ++i) {
            const addon = util.oneOf(addons);

            if (addon) {
              opt.ship.installAddOn(addon);
            }
          }
        }

        /*
         * Randomly select cargo from opt.options.cargo, defaulting to all
         * non-contraband cargo (with the exception of TRANSA, which may be
         * carrying contraband). A minimum count may be specified with
         * opt.options.min_cargo (default is 0).
         */
        if (opt.ship.holdIsEmpty) {
          const min   = Math.min(opt.options.min_cargo || 0, opt.ship.cargoLeft);
          const count = util.getRandomInt(min, opt.ship.cargoLeft);
          const items = opt.options.cargo || Object.keys(data.resources);

          while (opt.ship.cargoUsed < count) {
            const item = util.oneOf(items);

            if (data.resources[item].contraband && opt.faction !== 'TRANSA')
              continue;

            opt.ship.loadCargo(item, 1);
          }
        }
      }

      super(opt);
    }
  };
});
