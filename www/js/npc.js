define(function(require, exports, module) {
  const data   = require('data');
  const util   = require('util');
  const Ship   = require('ship');
  const Person = require('Person');

  return class extends Person {
    constructor(opt) {
      super(opt);

      if (opt.cargo) {
        for (let item of Object.keys(opt.cargo)) {
          this.ship.loadCargo(item, opt.cargo[item] || 0);
        }
      }
      else {
        this.addRandomCargo();
      }
    }

    addRandomCargo() {
      const numItems  = util.getRandomInt(0, this.ship.cargoSpace + 1);
      const resources = Object.keys(data.resources);

      while (this.ship.cargoUsed < numItems) {
        const resource = util.oneOf(resources);

        if (data.resources[resource].contraband && this.faction.abbrev !== 'TRANSA')
          continue;

        this.ship.loadCargo(resource, 1);
      }
    }
  };
});
