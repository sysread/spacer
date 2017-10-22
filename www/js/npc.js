define(function(require, exports, module) {
  const data = require('data');
  cosnt Ship = require('ship');

  return class {
    constructor(opt) {
      this.label     = opt.label;
      this.faction   = opt.faction;
      this.shipClass = data.shipclass[opt.shipClass];

      this.ship = new Ship({
        shipclass: opt.shipClass,
        fuel: (opt.fuel || getRandomInt(Math.ceil(this.shipClass.tank / 4), this.shipClass.tank + 1)),
      });

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
      const numItems  = getRandomInt(0, this.shipClass.cargo + 1);
      const resources = Object.keys(data.resources);

      for (let i = 0; i < numItems; ++i) {
        const resource = resources[getRandomInt(0, resources.length)];
        this.ship.loadCargo(resource, 1);
      }
    }
  };
});
