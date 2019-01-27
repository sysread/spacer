import data from './data';
import Physics from './physics';
import Store from './store';

import { Ev, Events, Arrived } from './events';

import * as util from './util';
import * as t from './common';


declare var window: { game: any; }


interface MarketShim {
  sellPrice(item: t.resource): number;
}


interface SavedShip {
  type:    t.shiptype;
  addons?: string[];
  damage?: t.ShipDamage;
  fuel?:   number;
  cargo?:  t.ResourceCounter;
}


class Ship {
  type:   t.shiptype;
  addons: string[];
  damage: t.ShipDamage;
  fuel:   number;
  cargo:  Store;

  constructor(init: SavedShip) {
    init = init || {'type': 'shuttle'};

    if (!data.shipclass.hasOwnProperty(init.type)) {
      throw new Error(`Ship type not recognized: ${init.type}`);
    }

    this.type   = init.type;
    this.addons = init.addons || [];
    this.damage = init.damage || {hull: 0, armor: 0};
    this.fuel   = init.fuel   || this.tank;
    this.cargo  = new Store(init.cargo);

    /*
     * When the player arrives at dock, increase demand for any resources
     * related to ship's maintenance (fuel, metal) that are not currently
     * available.
     */
    Events.watch(Ev.Arrived, (ev: Arrived) => {
      // metal to repair damage to the ship
      if (this.hasDamage()) {
        const want = this.damage.armor + this.damage.hull;
        window.game.here.requestResource('metal', want);
      }

      // fuel for the tank
      if (this.needsFuel()) {
        const want = this.refuelUnits();
        window.game.here.requestResource('fuel', want);
      }
    });
  }

  get shipclass()      { return data.shipclass[this.type] }
  get drive()          { return data.drives[ this.shipclass.drive ] }
  get hardpoints()     { return this.shipclass.hardpoints }
  get drives()         { return this.shipclass.drives }
  get driveMass()      { return this.drives * this.drive.mass }
  get mass()           { return this.shipclass.mass + this.driveMass }
  get restricted()     { return this.shipclass.restricted }
  get faction()        { return this.shipclass.faction }
  get thrust()         { return this.drives * this.drive.thrust + Math.max(0, this.attr('thrust', true)) }
  get acceleration()   { return Physics.deltav(this.thrust, this.mass) }
  get tank()           { return Math.max(0,    this.attr('tank', true)) }
  get fullHull()       { return Math.max(0,    this.attr('hull', true)) }
  get fullArmor()      { return Math.max(0,    this.attr('armor', true)) }
  get hull()           { return Math.max(0,    this.attr('hull')) }
  get armor()          { return Math.max(0,    this.attr('armor')) }
  get stealth()        { return Math.min(0.5,  this.attr('stealth')) }
  get cargoSpace()     { return Math.max(0,    this.attr('cargo')) }
  get intercept()      { return Math.min(0.35, this.attr('intercept')) }
  get powerMassRatio() { return this.thrust / this.mass }

  get fuelrate() {
    const base   = this.drives * this.drive.burn_rate;
    const linear = this.attr('burn_rate', true);
    const pct    = 1 - this.attr('burn_rate_pct', true);
    const rate   = (base + linear) * pct;
    return Math.max(0.001, rate);
  }

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
  get cargoUsed()   { return this.cargo.sum() }
  get cargoLeft()   { return this.cargoSpace - this.cargoUsed }
  get holdIsFull()  { return this.cargoLeft === 0 }
  get holdIsEmpty() { return this.cargoUsed === 0 }

  get hasContraband() {
    for (const item of t.resources) {
      const amt = this.cargo.get(item);

      if (amt == 0)
        continue;

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
  attr(name: string, nominal=false): number {
    let value = 0;

    if (typeof this.shipclass[name] === 'number') {
      value += this.shipclass[name];
    }

    for (const addon of this.addons) {
      if (typeof data.addons[addon][name] === 'number') {
        value += data.addons[addon][name];
      }
    }

    if (!nominal) {
      if (name == 'hull' || name == 'armor') {
        value -= this.damage[name];
      }
    }

    return value;
  }

  thrustRatio(deltav: number, mass?: number) {
    if (mass === undefined) mass = this.currentMass();

    // Calculate thrust required to accelerate our mass at deltav
    let thrust = Physics.force(mass, deltav);

    // Calculate fraction of full thrust required
    return thrust / this.thrust;
  }

  burnRate(deltav: number, mass?: number) {
    // Calculate fraction of full thrust required
    const thrustRatio = this.thrustRatio(deltav, mass);

    // Reduce burn rate by the fraction of thrust being used
    return Math.max(0.001, this.fuelrate * thrustRatio);
  }

  maxBurnTime(accel: number, nominal=false, extra_mass=0) {
    let mass, fuel;

    if (nominal) {
      fuel = this.tank;
      mass = this.nominalMass(true) + extra_mass;
      if (accel === undefined) accel = Physics.deltav(this.thrust, mass);
    }
    else {
      fuel = this.fuel;
      mass = this.currentMass() + extra_mass;
      if (accel === undefined) accel = this.currentAcceleration(extra_mass);
    }

    return Math.floor(fuel / this.burnRate(accel, mass));
  }

  cargoMass() {
    let mass = 0;
    for (const item of this.cargo.keys()) {
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
    return this.mass + this.cargoMass() + this.addOnMass() + this.fuel;
  }

  currentAcceleration(extra_mass=0) {
    return Physics.deltav(this.thrust, this.currentMass() + extra_mass);
  }

  accelerationWithMass(mass: number) {
    return Physics.deltav(this.thrust, this.currentMass() + mass);
  }

  refuelUnits() {return Math.ceil(this.tank - this.fuel)}
  needsFuel()   {return this.fuel < this.tank}
  tankIsFull()  {return Math.floor(this.fuel) >= this.tank}
  tankIsEmpty() {return util.R(this.fuel) === 0}

  refuel(units: number) {
    this.fuel = Math.min(this.tank, this.fuel + units);
  }

  burn(deltav: number) {
    this.fuel = Math.max(0, this.fuel - this.burnRate(deltav, this.currentMass()));
    return this.fuel;
  }

  loadCargo(resource: t.resource, amount: number) {
    if (this.cargoLeft < amount)
      throw new Error('no room left in the hold');
    this.cargo.inc(resource, amount);
  }

  unloadCargo(resource: t.resource, amount: number) {
    if (this.cargo.get(resource) < amount)
      throw new Error('you do not have that many units available');
    this.cargo.dec(resource, amount);
  }

  shipValue(market: MarketShim) {
    const sc       = this.shipclass;
    const metal    = market.sellPrice('metal');
    const ceramics = market.sellPrice('ceramics');

    let price
      = (sc.hull       / sc.mass * metal * 5000)
      + (sc.armor      * 5 * ceramics)
      + (sc.tank       * 1000)
      + (sc.cargo      * 2000)
      + (sc.drives     * data.drives[sc.drive].value)
      + (sc.hardpoints * 20000);

    if (sc.restricted) {
      price *= 1.5;
    }

    return Math.ceil(price);
  }

  cargoValue(market: MarketShim) {
    let price = 0;
    for (const item of this.cargo.keys()) {
      price += this.cargo.count(item) * market.sellPrice(item);
    }

    return price;
  }

  fuelValue(market: MarketShim) {
    return market.sellPrice('fuel') * Math.floor(this.fuel);
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

  price(tradein: boolean, market: MarketShim) {
    const cargo = this.cargoValue(market);
    const fuel  = this.fuelValue(market);
    const dmg   = this.damageValue();

    let ship = this.shipValue(market) + this.addOnValue();

    if (tradein)
      ship = Math.ceil(ship * 0.7);

    return ship + cargo + fuel + dmg;
  }

  numAddOns() {
    return this.addons.length;
  }

  availableHardPoints() {
    return this.hardpoints - this.numAddOns();
  }

  installAddOn(addon: t.addon) {
    this.addons.push(addon);
  }

  hasAddOn(addon: t.addon) {
    let count = 0;
    for (let a of this.addons) {
      if (a === addon) {
        ++count;
      }
    }

    return count;
  }

  removeAddOn(addon: t.addon) {
    this.addons = this.addons.filter(x => {return x !== addon});
  }

  damageMalus() {
    return this.damage.hull / this.hull / 2;
  }

  hasDamage() {
    return this.damage.hull > 0
        || this.damage.armor > 0;
  }

  repairDamage(hull=0, armor=0) {
    this.damage.hull = Math.max(this.damage.hull - hull, 0);
    this.damage.armor = Math.max(this.damage.armor - armor, 0);
  }

  applyDamage(dmg: number) {
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
}

export = Ship;
