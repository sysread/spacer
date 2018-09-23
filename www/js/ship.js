define(function(require, exports, module) {
  const data    = require('data');
  const util    = require('util');
  const Physics = require('physics');
  const model   = require('model');

  return class {
    constructor(init) {
      init = init || {'type': 'shuttle'};

      if (!data.shipclass.hasOwnProperty(init.type)) {
        throw new Error(`Ship type not recognized: ${init.type}`);
      }

      this.type   = init.type;
      this.addons = init.addons || [];
      this.damage = init.damage || {hull: 0, armor: 0};
      this.fuel   = init.fuel   || this.tank;
      this.cargo  = new model.Store(init.cargo);
    }

    get shipclass()      { return data.shipclass[this.type] }
    get hardpoints()     { return this.shipclass.hardpoints }
    get drive()          { return data.drives[this.shipclass.drive] }
    get drives()         { return this.shipclass.drives }
    get driveMass()      { return this.drives * this.drive.mass }
    get mass()           { return this.shipclass.mass + this.driveMass }
    get tank()           { return this.shipclass.tank }
    get restricted()     { return this.shipclass.restricted }
    get faction()        { return this.shipclass.faction }
    get thrust()         { return this.drives * this.drive.thrust }
    get fuelrate()       { return this.drives * this.drive.burn_rate }
    get acceleration()   { return Physics.deltav(this.thrust, this.mass) }
    get fullHull()       { return Math.max(0,    this.attr('hull', true)) }
    get fullArmor()      { return Math.max(0,    this.attr('armor', true)) }
    get hull()           { return Math.max(0,    this.attr('hull')) }
    get armor()          { return Math.max(0,    this.attr('armor')) }
    get stealth()        { return Math.min(0.5,  this.attr('stealth')) }
    get cargoSpace()     { return Math.max(0,    this.attr('cargo')) }
    get intercept()      { return Math.min(0.35, this.attr('intercept')) }
    get powerMassRatio() { return this.thrust / this.mass }

    /*
     * Base dodge chance based on power-mass ratio
     */
    get rawDodge() {
      const ratio = this.powerMassRatio;
      return ratio / 100;
    }

    /*
     * Dodge chance accounting for upgrades
     */
    get dodge() {
      return Math.min(0.7, this.rawDodge + this.attr('dodge'));
    }

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
      const sc = this.shipclass;

      let price
        = (sc.mass   * data.ship.mass.value)
        + (sc.hull   * data.ship.hull.value)
        + (sc.armor  * data.ship.armor.value)
        + (sc.tank   * data.ship.tank.value)
        + (sc.cargo  * data.ship.cargo.value)
        + (sc.drives * data.drives[sc.drive].value);

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

    damageValue() {
      let price = 0;

      if (this.hasDamage()) {
        price -= this.damage.hull  * data.ship.hull.repair;
        price -= this.damage.armor * data.ship.armor.repair;
      }

      return price;
    }

    price(tradein) {
      const cargo = this.cargoValue();
      const fuel  = this.fuelValue();
      const dmg   = this.damageValue();

      let ship = this.shipValue() + this.addOnValue();

      if (tradein)
        ship = Math.ceil(ship * 0.7);

      return ship + cargo + fuel + dmg;
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

    hasDamage() {
      return this.damage.hull > 0
          || this.damage.armor > 0;
    }

    repairDamage(hull=0, armor=0) {
      this.damage.hull = Math.max(this.damage.hull - hull, 0);
      this.damage.armor = Math.max(this.damage.armor - armor, 0);
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
