define(function(require, exports, module) {
  const data    = require('data');
  const util    = require('util');
  const Physics = require('physics');
  const model   = require('model');

  return class {
    constructor(init) {
      init = init || {'type': 'shuttle'};

      this.type         = init.type;
      this.shipclass    = data.shipclass[this.type];
      this.hardpoints   = this.shipclass.hardpoints;
      this.drive        = data.drives[this.shipclass.drive];
      this.drives       = this.shipclass.drives;
      this.driveMass    = this.drives * this.drive.mass;
      this.mass         = this.shipclass.mass + this.driveMass;
      this.tank         = this.shipclass.tank;
      this.restricted   = this.shipclass.restricted;
      this.faction      = this.shipclass.faction;
      this.thrust       = this.drives * this.drive.thrust;
      this.acceleration = Physics.deltav(this.thrust, this.mass);

      this.addons = init.addons || [];
      this.damage = init.damage || {hull: 0, armor: 0, drives: 0};
      this.fuel   = init.fuel   || this.tank;
      this.cargo  = new model.Store(init.cargo);
    }

    get cargoSpace() { return Math.max(0, this.attr('cargo')) }
    get stealth()    { return Math.min(0.8, this.attr('stealth')) }
    get armor()      { return Math.max(0, this.attr('armor')) }
    get hull()       { return Math.max(1, this.attr('hull')) }

    /*
     * Calculated properties of the ship itself
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

    get isDestroyed() {
      return this.armor === 0
          && this.hull  === 0;
    }

    /*
     * Methods
     */
    isPlayerShipType()  { return this.type === game.player.ship.type }
    playerHasStanding() { return !this.restricted || game.player.hasStanding(game.here.faction, this.restricted) }

    attr(name, nominal=false) {
      let value = 0;

      if (this.shipclass.hasOwnProperty(name)) {
        value += this.shipclass[name];
      }

      for (const addon of this.addons) {
        if (data.addons[addon].hasOwnProperty(name)) {
          value += data.addons[addon][name];
        }
      }

      if (!nominal) {
        if (this.damage.hasOwnProperty(name)) {
          value -= this.damage[name];
        }
      }

      return value;
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
      let mass = 0;
      for (const item of this.cargo.keys) {
        mass += data.resources[item].mass * this.cargo.get(item);
      }

      return mass;
    }

    addOnMass() {
      return this.addons.reduce((a, b) => {return a + data.addons[b].mass}, 0);
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

    refuelUnits() {return Math.ceil(this.tank - this.fuel)}
    tankIsFull()  {return Math.floor(this.fuel) >= this.tank}
    tankIsEmpty() {return this.fuel === 0}

    refuel(units) {
      this.fuel = Math.min(this.tank, this.fuel + units);
    }

    burn(deltav) {
      this.fuel = Math.max(0, this.fuel - this.burnRate(deltav, this.currentMass()));
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
      let price = 0;
      for (const item of this.cargo.keys) {
        price += this.cargo.count(item) * game.here.sellPrice(item);
      }

      return price;
    }

    fuelValue() {
      return game.here.sellPrice('fuel') * Math.floor(this.fuel);
    }

    addOnValue() {
      let price = 0;
      for (const addon of this.addons) {
        price += data.addons[addon].price;
      }

      return price;
    }

    price(tradein) {
      const cargo = this.cargoValue();
      const fuel  = this.fuelValue();
      let ship  = this.shipValue() + this.addOnValue();
      if (tradein) ship = Math.ceil(ship * 0.7);
      return ship + cargo + fuel;
    }

    availableHardPoints() {
      return this.hardpoints - this.addons.length;
    }

    installAddOn(addon) {
      this.addons.push(addon);
    }

    hasAddOn(addon) {
      let count = 0;
      for (let a of this.addons) {
        if (a === addon) {
          ++count;
        }
      }

      return count;
    }

    removeAddOn(addon) {
      this.addons = this.addons.filter(x => {return x !== addon});
    }

    applyDamage(dmg) {
      const armor = this.armor;
      const hull  = this.hull;

      const armor_dmg = Math.min(this.armor, dmg);
      this.damage.armor += armor_dmg;
      dmg -= armor_dmg;

      const hull_dmg = Math.min(this.hull, dmg);
      this.damage.hull += hull_dmg;
      dmg -= hull_dmg;

      // Return true if the ship is destroyed
      return this.isDestroyed;
    }
  };
});
