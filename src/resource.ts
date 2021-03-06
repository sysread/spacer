import data from './data';
import * as t from './common';
import * as util from './util';
import * as FastMath from './fastmath';

function craftValue(item: t.Craft): number {
  let value = 0;

  for (const mat of Object.keys(item.recipe.materials) as t.resource[]) {
    const amt: number = item.recipe.materials[mat as t.resource] || 0;
    const val: number = resourceValue(mat);
    value += amt * val;
  }

  value += data.craft_fee * value;                  // craft fee
  value += value * (1 + (0.05 * item.recipe.tics)); // time to craft

  return value;
}

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

  // Adjust value due to expense in reaction mass to move it
  value += value * (0.005 * item.mass);

  return value;
}

/*
 * Global storage of resource objects
 */
export function isRaw(res: Resource): res is Raw {
  return (<Raw>res).mine !== undefined;
}

export function isCraft(res: Resource): res is Craft {
  return (<Craft>res).recipe !== undefined;
}


export abstract class Resource {
  readonly name:        t.resource;
  readonly mass:        number;
  readonly contraband?: number;
  readonly value:       number;
  readonly minPrice:    number;
  readonly maxPrice:    number;

  constructor(name: t.resource) {
    this.name       = name;
    this.mass       = data.resources[name].mass;
    this.contraband = data.resources[name].contraband;
    this.value      = FastMath.ceil(resourceValue(name));
    this.minPrice   = FastMath.ceil(this.calcMinPrice());
    this.maxPrice   = FastMath.ceil(this.calcMaxPrice());
  }

  calcMaxPrice() {
    let factor = data.necessity[this.name] ? 9 : 3;

    for (let i = 10; i < this.value; i *= 10) {
      factor /= 2;
    }

    return this.value * Math.max(1.2, factor);
  }

  calcMinPrice() {
    let factor = data.necessity[this.name] ? 3 : 9;

    for (let i = 10; i < this.value; i *= 10) {
      factor /= 2;
    }

    return this.value / Math.max(1.2, factor);
  }

  clampPrice(price: number) {
    return FastMath.ceil(util.clamp(price, this.minPrice, this.maxPrice));
  }
}


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


export class Craft extends Resource {
  readonly recipe:      t.Recipe;
  readonly craftTurns:  number;
  readonly ingredients: t.resource[];

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


export const resources: { [key: string]: Resource } = {};

for (const item of t.resources) {
  if ((<t.Craft>data.resources[item]).recipe) {
    resources[item] = new Craft(item);
  } else if ((<t.Raw>data.resources[item]).mine) {
    resources[item] = new Raw(item);
  }
}
