/**
 * resource - runtime resource objects with computed pricing.
 *
 * Wraps the static resource definitions from data.ts into class instances
 * that carry pre-computed values used throughout the economy system.
 *
 * Value calculation:
 *   - Raw resources: base value from data.mine.value, adjusted upward by mass
 *     (heavier goods cost more to ship, raising their effective value).
 *   - Crafted resources: sum of input material values, plus a craft_fee markup,
 *     plus a time premium (5% per tic of craft time). Also adjusted by mass.
 *
 * Price range calculation:
 *   - Necessity goods (flagged in data.necessity) have tighter price floors
 *     (harder to find cheap) and higher price ceilings (markets will pay more).
 *   - Luxury/non-necessity goods have the inverse: wide floors, tight ceilings.
 *   - Both bounds compress as base value grows (the factor halves per order of
 *     magnitude), preventing extreme price swings on high-value goods.
 *
 * The module-level `resources` map is populated at load time and shared across
 * the codebase as the single source of truth for resource metadata.
 */

import data from './data';
import * as t from './common';
import * as util from './util';
import * as FastMath from './fastmath';


// Computes the base value of a crafted resource from its recipe.
// Adds a craft_fee percentage on top of raw material costs, then applies a
// time premium: each tic of fabrication time adds 5% to the value.
function craftValue(item: t.Craft): number {
  let value = 0;

  for (const mat of Object.keys(item.recipe.materials) as t.resource[]) {
    const amt: number = item.recipe.materials[mat as t.resource] || 0;
    const val: number = resourceValue(mat);
    value += amt * val;
  }

  value += data.craft_fee * value;                  // fabrication overhead markup
  value += value * (1 + (0.05 * item.recipe.tics)); // time premium per tic

  return value;
}

// Computes the base value of any resource by type, using the cached resources
// map for already-computed values to break the recursion for crafted goods
// whose ingredients are themselves crafted.
function resourceValue(name: t.resource): number {
  if (resources[name] != undefined) {
    return resources[name].value;
  }

  const item: t.Resource = data.resources[name];
  let value = 0;

  if ((<t.Craft>item).recipe) {
    value = craftValue((<t.Craft>item));
  } else if ((<t.Raw>item).mine) {
    value = (<t.Raw>item).mine.value;
  }

  // Heavier goods are more expensive to transport, raising their market value.
  value += value * (0.005 * item.mass);

  return value;
}


export function isRaw(res: Resource): res is Raw {
  return (<Raw>res).mine !== undefined;
}

export function isCraft(res: Resource): res is Craft {
  return (<Craft>res).recipe !== undefined;
}


/**
 * Base class for all runtime resource objects.
 * Holds the pre-computed value and price bounds used by the market system.
 */
export abstract class Resource {
  readonly name:        t.resource;
  readonly mass:        number;
  readonly contraband?: number;  // fine multiplier if found during inspection; absent if legal
  readonly value:       number;  // computed base market value in credits
  readonly minPrice:    number;  // floor price (market will not sell below this)
  readonly maxPrice:    number;  // ceiling price (market will not buy above this)

  constructor(name: t.resource) {
    this.name       = name;
    this.mass       = data.resources[name].mass;
    this.contraband = data.resources[name].contraband;
    this.value      = FastMath.ceil(resourceValue(name));
    this.minPrice   = FastMath.ceil(this.calcMinPrice());
    this.maxPrice   = FastMath.ceil(this.calcMaxPrice());
  }

  // Maximum price a market will offer when buying this resource.
  // Necessity goods (food, fuel, medicine) have a higher ceiling multiplier
  // since buyers will pay more rather than go without.
  calcMaxPrice() {
    let factor = data.necessity[this.name] ? 9 : 3;

    for (let i = 10; i < this.value; i *= 10) {
      factor /= 2;
    }

    return this.value * Math.max(1.2, factor);
  }

  // Minimum price at which a market will sell this resource.
  // Non-necessity goods have a lower floor (more price competition),
  // while necessity goods are always in demand and command a higher floor.
  calcMinPrice() {
    let factor = data.necessity[this.name] ? 3 : 9;

    for (let i = 10; i < this.value; i *= 10) {
      factor /= 2;
    }

    return this.value / Math.max(1.2, factor);
  }

  /** Clamps a computed price to [minPrice, maxPrice], rounded up. */
  clampPrice(price: number) {
    return FastMath.ceil(util.clamp(price, this.minPrice, this.maxPrice));
  }
}


/** A mineable raw resource. mineTurns is the number of turns to extract one unit. */
export class Raw extends Resource {
  readonly mine:      t.Mining;
  readonly mineTurns: number;

  constructor(name: t.resource) {
    super(name);
    const res = data.resources[name];

    if (!t.isRaw(res)) {
      throw new Error(`not a raw material: ${name}`);
    }

    this.mine      = res.mine;
    this.mineTurns = this.mine.tics;
  }
}


/** A fabricatable crafted resource. craftTurns is the turns to produce one unit. */
export class Craft extends Resource {
  readonly recipe:      t.Recipe;
  readonly craftTurns:  number;
  readonly ingredients: t.resource[];  // convenience: keys of recipe.materials

  constructor(name: t.resource) {
    super(name);
    const res = data.resources[name];

    if (!t.isCraft(res)) {
      throw new Error(`not a craftable resource: ${name}`);
    }

    this.recipe      = res.recipe;
    this.craftTurns  = this.recipe.tics;
    this.ingredients = Object.keys(this.recipe.materials) as t.resource[];
  }
}


/**
 * Module-level registry of all resource instances, keyed by resource name.
 * Populated once at load time from data.ts. Used by the economy system,
 * planet markets, and fabricators as the canonical source of resource metadata.
 */
export const resources: { [key: string]: Resource } = {};

for (const item of t.resources) {
  if ((<t.Craft>data.resources[item]).recipe) {
    resources[item] = new Craft(item);
  } else if ((<t.Raw>data.resources[item]).mine) {
    resources[item] = new Raw(item);
  }
}
