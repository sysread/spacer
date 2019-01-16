import data from './data';
import * as t from './common';
import * as util from './util';

function craftValue(item: t.Craft): number {
  let value = 0;

  for (const mat of Object.keys(item.recipe.materials)) {
    const amt: number = item.recipe.materials[mat as t.resource] || 0;
    const val: number = resourceValue(data.resources[mat]);
    value += amt * val;
  }

  value += Math.max(1, util.R(data.craft_fee * value, 2));

  for (let i = 0; i < item.recipe.tics; ++i) {
    value *= 1.5;
  }

  return value;
}

function resourceValue(item: t.Resource): number {
  if ((<t.Craft>item).recipe) {
    return craftValue((<t.Craft>item));
  }
  else if ((<t.Raw>item).mine) {
    return (<t.Raw>item).mine.value;
  }
  else {
    return 0;
  }
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
    this.value      = resourceValue(data.resources[name]);
    this.minPrice   = this.calcMinPrice();
    this.maxPrice   = this.calcMaxPrice();
  }

  calcMaxPrice() {
    let value  = this.value;
    let factor = 9;

    while (value > 10) {
      value  /= 10;
      factor /= 2;
    }

    return Math.ceil(this.value * Math.max(1.5, factor));
  }

  calcMinPrice() {
    let value  = this.value;
    let factor = 9;

    while (value > 10) {
      value  /= 10;
      factor /= 2;
    }

    return Math.ceil(this.value / Math.max(1.5, factor));
  }

  clampPrice(price: number) {
    return Math.ceil(util.clamp(price, this.minPrice, this.maxPrice));
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
