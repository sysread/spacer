define(function(require, exports, module) {
  const data    = require('data');
  const util    = require('util');
  const Physics = require('physics');
  const Game    = require('game');

  return class {
    constructor(opt) {
      this.opt    = opt || {};
      this.fuel   = opt.fuel || data.shipclass[opt.shipclass].tank;
      this.addons = new Array;
      this.cargo  = new util.ResourceCounter;
      this.damage = {
        hull   : 0,
        armor  : 0,
        drives : 0,
      };
    }

    save() {
      return {
        opt    : this.opt,
        fuel   : this.fuel,
        addons : this.addons,
        cargo  : this.cargo.save(),
        damage : this.damage,
      };
    }

    load(info) {
      this.opt    = info.opt;
      this.fuel   = info.fuel;
      this.addons = info.addons;
      this.cargo.load(info.cargo);
      this.damage = info.damage;
    }

    /*
     * Shipclass properties or those derived from them
     */
    get shipclass()    { return data.shipclass[this.opt.shipclass] }
    get tank()         { return this.shipclass.tank }
    get drive()        { return data.drives[this.shipclass.drive] }
    get drives()       { return this.shipclass.drives }
    get driveMass()    { return this.drives * this.drive.mass }
    get mass()         { return this.shipclass.mass + this.driveMass }
    get thrust()       { return this.shipclass.drives * this.drive.thrust }
    get acceleration() { return Physics.deltav(this.thrust, this.mass) }
    get hardPoints()   { return this.shipclass.hardpoints }

    get cargoSpace() {
      let space = this.shipclass.cargo;

      for (let addon of this.addons) {
        if (data.shipAddOns[addon].hasOwnProperty('cargo')) {
          space += data.shipAddOns[addon].cargo;
        }
      }

      return Math.max(0, space);
    }

    get hull() {
      let hull = this.shipclass.hull;

      for (let addon of this.addons) {
        if (data.shipAddOns[addon].hasOwnProperty('hull')) {
          hull += data.shipAddOns[addon].hull;
        }
      }

      return Math.max(1, hull);
    }

    get armor() {
      let armor = this.shipclass.armor;

      for (let addon of this.addons) {
        if (data.shipAddOns[addon].hasOwnProperty('armor')) {
          armor += data.shipAddOns[addon].armor;
        }
      }

      return Math.max(0, armor);
    }

    /*
     * Properties of the ship itself
     */
    get cargoUsed()  { return this.cargo.sum() }
    get cargoLeft()  { return this.cargoSpace - this.cargoUsed }
    get holdIsFull() { return this.cargoLeft === 0 }

    get hasContraband() {
      for (let [item, amt] of this.cargo.entries()) {
        if (amt > 0 && data.resources[item].contraband) {
          return true;
        }
      }

      return false;
    }

    thrustRatio(deltav, mass) {
      if (mass === undefined) mass = this.currentMass();

      // Calculate thrust required to accelerate our mass at deltav
      let thrust = Physics.force(mass, deltav);

      // Calculate fraction of full thrust required
      return thrust / this.thrust;
    }

    burnRate(deltav, mass) {
      // Calculate fraction of full thrust required
      let thrustRatio = this.thrustRatio(deltav, mass);

      // Calculate nominal burn rate
      let burnRate = this.drives * this.drive.burn_rate;

      // Reduce burn rate by the fraction of thrust being used
      return burnRate * thrustRatio;
    }

    cargoMass() {
      let m = 0;
      this.cargo.each((item, amt) => {m += data.resources[item].mass * amt});
      return m;
    }

    addOnMass() {
      return this.addons.reduce((a, b) => {return a + data.shipAddOns[b].mass}, 0);
    }

    nominalMass(full_tank=false) {
      let m = this.mass;
      if (full_tank) m += this.tank;
      return m;
    }

    currentMass() {
      return this.mass + this.cargoMass() + this.addOnMass() + (data.resources['fuel'].mass * this.fuel);
    }

    currentAcceleration() {
      return Physics.deltav(this.thrust, this.currentMass());
    }

    accelerationWithMass(mass) {
      return Physics.deltav(this.thrust, this.currentMass() + mass);
    }

    maxBurnTime(accel, nominal=false) {
      let fuel = this.fuel;
      let mass = this.currentMass();

      if (nominal) {
        fuel = this.tank;
        mass = this.nominalMass(true);
        if (accel === undefined) accel = Physics.deltav(this.thrust, mass);
      }
      else {
        if (accel === undefined) accel = this.currentAcceleration();
      }

      return Math.floor(fuel / this.burnRate(accel, mass));
    }

    refuelUnits() {return Math.ceil((this.tank - this.fuel) / data.resources.fuel.mass) }
    tankIsFull()  {return this.fuel === this.tank}
    tankIsEmpty() {return this.fuel === 0}

    refuel(units) {
      this.fuel = Math.min(this.tank, this.fuel + (units * data.resources.fuel.mass));
    }

    burn(deltav) {
      this.fuel = Math.max(0, this.fuel - this.burnRate(deltav));
      return this.fuel;
    }

    loadCargo(resource, amount) {
      if (this.cargoLeft < amount)
        throw new Error('no room left in the hold');
      this.cargo.inc(resource, amount);
    }

    unloadCargo(resource, amount) {
      if (this.cargo.get(resource) < amount)
        throw new Error('you do not have that many units available');
      this.cargo.dec(resource, amount);
    }

    shipValue() {
      let sc = this.shipclass;

      let price
        = (sc.mass  * 80)
        + (sc.hull  * 1000)
        + (sc.armor * 8000)
        + (sc.tank  * 150)
        + (sc.cargo * 65);

      if (this.shipclass.drive === 'ion')
        price += 500 + (this.shipclass.drives * 30);
      else if (this.shipclass.drive === 'fusion')
        price += 100000 + (this.shipclass.drives * 5000);

      return Math.ceil(price);
    }

    cargoValue() {
      let place = Game.game.place();
      let price = 0;
      this.cargo.each((item, amt) => {price += place.sellPrice(item) * amt});
      return price;
    }

    fuelValue() {
      let place = Game.game.place();
      return place.sellPrice('fuel') * Math.floor(this.fuel / data.resources.fuel.mass);
    }

    addOnValue() {
      let price = 0;
      for (let addon of this.addons) {
        price += data.shipAddOns[addon].price;
      }
      return price;
    }

    price(tradein) {
      let cargo = this.cargoValue();
      let fuel  = this.fuelValue();
      let ship  = this.shipValue() + this.addOnValue();
      if (tradein) ship = Math.ceil(ship * 0.7);
      return ship + cargo + fuel;
    }

    availableHardPoints() {
      return this.hardPoints - this.addons.length;
    }

    installAddOn(addon) {
      this.addons.push(addon);
    }

    hasAddOn(addon) {
      for (let a of this.addons) {
        if (a === addon) {
          return true;
        }
      }

      return false;
    }

    removeAddOn(addon) {
      this.addons = this.addons.filter(x => {return x !== addon});
    }
  };
});
