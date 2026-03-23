/**
 * npc - procedurally generated non-player character for combat encounters.
 *
 * NPC extends Person with a constructor that randomly assembles a ship from
 * the provided options: ship class, addons, and cargo. Used by the transit
 * component to create pirates and patrol ships on-the-fly.
 *
 * Construction options:
 *   ship          - array of ship types to pick from (one is chosen randomly)
 *   addons        - optional pool of addons; a random subset is installed
 *   always_addons - addons always installed regardless of randomization
 *   min_addons    - minimum number of random addons to install (default 0)
 *   cargo         - optional pool of resource types to fill the hold with
 *   min_cargo     - minimum cargo units to load (default 0)
 *
 * TRANSA-faction NPCs may carry contraband (reflects the lawless outer system).
 * All other factions only carry legal goods.
 *
 * TODO: NPC_Opt.ship is a list to pick from, but is documented ambiguously;
 * clarify whether it should be a shiptype[] or a single type.
 */

import data from './data';
import Ship from './ship';
import { Person } from './person';
import * as t from './common';
import * as util from './util';
import * as FastMath from './fastmath';

interface NPC_Opt {
  name:           string;
  faction:        t.faction;
  ship:           t.shiptype[];   // pool to randomly select ship class from

  addons?:        t.addon[];      // optional addon pool
  always_addons?: t.addon[];      // addons always installed
  min_addons?:    number;         // minimum random addons (default 0)

  cargo?:         t.resource[];   // optional cargo pool (defaults to all legal resources)
  min_cargo?:     number;         // minimum cargo units (default 0)
}

class NPC extends Person {
  constructor(opt: NPC_Opt) {
    const ship = new Ship({ type: util.oneOf(opt.ship) });

    // Install guaranteed addons first, then fill remaining hardpoints randomly.
    // TODO: ensure the addon mix has at least some offensive capability.
    if (opt.addons) {
      if (opt.always_addons) {
        for (const addon of opt.always_addons) {
          ship.installAddOn(addon);
        }
      }

      const min_addons = Math.min(opt.min_addons || 0, ship.availableHardPoints());
      const amt_addons = util.getRandomInt(min_addons, ship.availableHardPoints());
      const addons     = opt.addons;

      for (let i = 0; i < amt_addons; ++i) {
        const addon = util.oneOf(addons);
        if (addon) {
          ship.installAddOn(addon);
        }
      }
    }

    // Load cargo up to half the hold capacity, skipping contraband unless
    // this NPC is TRANSA-aligned (outer-system NPCs may carry contraband).
    const min_cargo = Math.min(opt.min_cargo || 0, ship.cargoLeft);
    const amt_cargo = util.getRandomInt(min_cargo, FastMath.floor(ship.cargoLeft / 2));
    const items     = opt.cargo || t.resources;

    while (ship.cargoUsed < amt_cargo) {
      const item = util.oneOf(items);

      if (data.resources[item].contraband && opt.faction !== 'TRANSA')
        continue;

      ship.loadCargo(item, 1);
    }

    const init = {
      name:         opt.name,
      faction_name: opt.faction,
      home:         data.factions[opt.faction].capital,
      standing:     {},
      money:        0,
      ship:         {
        type:   ship.type,
        addons: ship.addons,
        cargo:  ship.cargo,
      },
    };

    super(init);
  }
}

export default NPC;
