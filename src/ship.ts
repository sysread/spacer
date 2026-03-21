/**
 * ship - player and NPC ship model.
 *
 * Ship encapsulates everything about a physical vessel: its class, installed
 * addons, damage state, fuel, and cargo. It is owned by a Person and is
 * serialized as part of the game save.
 *
 * Attribute system:
 *   attr(name, nominal) aggregates a property from the ship class data plus
 *   all installed addons. When nominal=false, damage is subtracted from hull
 *   and armor. This powers all derived stats (thrust, dodge, intercept, etc.)
 *   from a single source of truth.
 *
 * Mass accounting:
 *   currentMass() = base class mass + drive mass + addon mass + cargo mass + fuel mass
 *   nominalMass()  = base class mass + drive mass (no addons/cargo/fuel)
 *   Used by NavComp to compute available acceleration.
 *
 * Fuel and burn:
 *   Fuel is stored in tonnes. burnRate(deltav) computes the fuel consumed per
 *   turn at a given acceleration by scaling fuelrate by the fraction of full
 *   thrust required. burn() deducts from the tank.
 *
 * Damage model:
 *   Incoming damage depletes armor first, then hull. isDestroyed when both are 0.
 *   damageMalus() reduces combat effectiveness (dodge/intercept) as hull depletes.
 *
 * Valuation:
 *   shipValue(), cargoValue(), fuelValue(), addOnValue(), damageValue() support
 *   the shipyard trade-in pricing. price(tradein, market) assembles the total.
 *
 * On arrival, the ship signals demand for fuel and metal (for repairs) at the
 * current planet, nudging the local market toward restocking those goods.
 */

import data from './data';
import Store from './store';

import { watch, Arrived } from "./events";

import * as util from './util';
import * as t from './common';
import * as FastMath from './fastmath';


declare var window: {
  game: any;
}


// Minimal interface used by valuation methods to get sell prices without
// requiring a full Planet reference (avoids a circular import).
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

    // On arrival, signal demand for repair materials and fuel so the local
    // market has a chance to stock up before the player tries to buy.
    watch("arrived", (_event: Arrived) => {
      if (window && this === window.game.player.ship) {
        if (this.hasDamage()) {
          const want = this.damage.armor + this.damage.hull;
          window.game.here.requestResource('metal', want);
        }

        if (this.needsFuel()) {
          const want = this.refuelUnits();
          window.game.here.requestResource('fuel', want);
        }
      }

      return {complete: false};
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
  get acceleration()   { return this.thrust / this.mass }
  get tank()           { return Math.max(0, this.attr('tank', true)) }
  get fullHull()       { return Math.max(0, this.attr('hull', true)) }
  get fullArmor()      { return Math.max(0, this.attr('armor', true)) }
  get hull()           { return Math.max(0, this.attr('hull')) }
  get armor()          { return Math.max(0, this.attr('armor')) }
  get stealth()        { return Math.min(0.5,  this.attr('stealth')) }
  get cargoSpace()     { return Math.max(0,    this.attr('cargo')) }
  get intercept()      { return Math.min(0.35, this.attr('intercept')) }    // PDS intercept cap
  get powerMassRatio() { return this.thrust / this.mass }

  get fuelrate() {
    const base   = this.drives * this.drive.burn_rate;
    const linear = this.attr('burn_rate', true);
    const pct    = 1 - this.attr('burn_rate_pct', true);
    const rate   = (base + linear) * pct;
    return Math.max(0.001, rate);
  }

  /** Base dodge chance from power-mass ratio alone (no addon bonuses). */
  get rawDodge() {
    const ratio = this.powerMassRatio;
    return ratio / 100;
  }

  /** Dodge chance including ECM and other defensive addons. Capped at 0.7. */
  get dodge() {
    return Math.min(0.7, this.rawDodge + this.attr('dodge'));
  }

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

  /**
   * Sums a numeric attribute from the ship class and all installed addons.
   * When nominal=false, subtracts current damage from hull/armor.
   * nominal=true gives the undamaged maximum (used for display and planning).
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

  /** Returns the fraction of full thrust needed to achieve deltav m/s². */
  thrustRatio(deltav: number, mass?: number) {
    if (mass === undefined) mass = this.currentMass();
    const thrust = mass * deltav;
    return thrust / this.thrust;
  }

  /**
   * Fuel consumption rate (tonnes/turn) at a given acceleration.
   * Scales fuelrate by the fraction of full thrust in use.
   */
  burnRate(deltav: number, mass?: number) {
    const thrustRatio = this.thrustRatio(deltav, mass);
    return Math.max(0.001, this.fuelrate * thrustRatio);
  }

  /**
   * Maximum burn time in turns at a given acceleration.
   * nominal=true uses full tank and nominal mass (for route planning).
   * nominal=false uses current fuel and current mass (for actual transit).
   */
  maxBurnTime(accel: number, nominal=false, extra_mass=0) {
    let mass, fuel;

    if (nominal) {
      fuel = this.tank;
      mass = this.nominalMass(true) + extra_mass;
      if (accel === undefined) accel = this.thrust / mass;
    }
    else {
      fuel = this.fuel;
      mass = this.currentMass() + extra_mass;
      if (accel === undefined) accel = this.currentAcceleration(extra_mass);
    }

    return FastMath.floor(fuel / this.burnRate(accel, mass));
  }

  fuelMass()  { return this.fuel }

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

  /** Base mass without addons, cargo, or fuel. full_tank=true adds the fuel tank capacity. */
  nominalMass(full_tank=false) {
    let m = this.mass;
    if (full_tank) m += this.tank;
    return m;
  }

  currentMass() {
    return this.mass + this.cargoMass() + this.addOnMass() + this.fuelMass();
  }

  currentAcceleration(extra_mass=0) {
    return this.thrust / (this.currentMass() + extra_mass);
  }

  refuelUnits() { return FastMath.ceil(this.tank - this.fuel) }
  needsFuel()   { return this.fuel < this.tank }
  tankIsFull()  { return FastMath.floor(this.fuel) >= this.tank }
  tankIsEmpty() { return util.R(this.fuel) === 0 }

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

  /**
   * Computes the ship's base trade-in value from its class properties.
   * Hull contributes proportionally to class mass (denser ships cost more metal).
   * The restricted flag adds a 50% premium for allegiance-class ships.
   */
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

    return FastMath.ceil(price);
  }

  cargoValue(market: MarketShim) {
    let price = 0;
    for (const item of this.cargo.keys()) {
      price += this.cargo.count(item) * market.sellPrice(item);
    }
    return price;
  }

  fuelValue(market: MarketShim) {
    return market.sellPrice('fuel') * FastMath.floor(this.fuel);
  }

  addOnValue() {
    let price = 0;
    for (const addon of this.addons) {
      price += data.addons[addon].price;
    }
    return price;
  }

  /** Returns a negative value representing the repair cost for current damage. */
  damageValue() {
    let price = 0;

    if (this.hasDamage()) {
      price -= this.damage.hull  * data.ship.hull.repair;
      price -= this.damage.armor * data.ship.armor.repair;
    }

    return price;
  }

  /** Total value for trade-in (tradein=true) or full purchase. */
  price(tradein: boolean, market: MarketShim) {
    const cargo = this.cargoValue(market);
    const fuel  = this.fuelValue(market);
    const dmg   = this.damageValue();

    let ship = this.shipValue(market) + this.addOnValue();

    if (tradein)
      ship = FastMath.ceil(ship * 0.7);

    return ship + cargo + fuel + dmg;
  }

  numAddOns()           { return this.addons.length }
  availableHardPoints() { return this.hardpoints - this.numAddOns() }

  installAddOn(addon: t.addon)  { this.addons.push(addon) }
  removeAddOn(addon: t.addon)   { this.addons = this.addons.filter(x => {return x !== addon}) }

  hasAddOn(addon: t.addon) {
    let count = 0;
    for (let a of this.addons) {
      if (a === addon) {
        ++count;
      }
    }
    return count;
  }

  /**
   * Combat effectiveness penalty proportional to hull damage.
   * At full hull: 0. At zero hull (before destruction): 0.5.
   * Applied to intercept and dodge in Combatant.
   */
  damageMalus() {
    return this.damage.hull / this.hull / 2;
  }

  hasDamage() {
    return this.damage.hull > 0
        || this.damage.armor > 0;
  }

  repairDamage(hull=0, armor=0) {
    this.damage.hull  = Math.max(this.damage.hull  - hull,  0);
    this.damage.armor = Math.max(this.damage.armor - armor, 0);
  }

  /**
   * Applies damage to the ship, depleting armor first, then hull.
   * Returns true if the ship was destroyed (armor=0 AND hull=0).
   */
  applyDamage(dmg: number) {
    const armor_dmg = Math.min(this.armor, dmg);
    this.damage.armor += armor_dmg;
    dmg -= armor_dmg;

    const hull_dmg = Math.min(this.hull, dmg);
    this.damage.hull += hull_dmg;
    dmg -= hull_dmg;

    return this.isDestroyed;
  }
}

export default Ship;
