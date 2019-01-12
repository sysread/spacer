import data from './data';
import * as t from './common';
import * as util from './util';


/*
 * Global storage of resource objects
 */
export const resources: { [key: string]: Resource } = {};

export function getResource(item: t.resource): Resource {
  if (!resources[item]) {
    if (t.isCraft(data.resources[item])) {
      resources[item] = new Craft(item);
    } else if (t.isRaw(data.resources[item])) {
      resources[item] = new Raw(item);
    }
  }

  return resources[item];
}

export function isRaw(res: Resource): res is Raw {
  return (<Raw>res).mine !== undefined;
}

export function isCraft(res: Resource): res is Craft {
  return (<Craft>res).recipe !== undefined;
}


export abstract class Resource {
  name:        t.resource;
  mass:        number;
  contraband?: number;
  _value?:     number;

  constructor(name: t.resource) {
    this.name       = name;
    this.mass       = data.resources[name].mass;
    this.contraband = data.resources[name].contraband;
  }

  abstract calculateBaseValue(): number;

  get value(): number {
    if (this._value == null) {
      this._value = this.calculateBaseValue();
    }

    return this._value;
  }
}

export class Raw extends Resource {
  mine: t.Mining;

  constructor(name: t.resource) {
    super(name);

    const res = data.resources[name];

    if (!t.isRaw(res)) {
      throw new Error(`not a raw material: ${name}`);
    }

    this.mine = res.mine;
  }

  get mineTurns(): number { return this.mine.tics }

  calculateBaseValue(): number {
    return this.mine.value;
  }
}

export class Craft extends Resource {
  recipe: t.Recipe;

  constructor(name: t.resource) {
    super(name);

    const res = data.resources[name];

    if (!t.isCraft(res)) {
      throw new Error(`not a craftable resource: ${name}`);
    }

    this.recipe = res.recipe;
  }

  get craftTurns():  number       { return this.recipe.tics }
  get ingredients(): t.resource[] { return Object.keys(this.recipe.materials) as t.resource[] }

  calculateBaseValue(): number {
    let value = 0;

    for (const mat of this.ingredients) {
      const amt: number = this.recipe.materials[mat as t.resource] || 0;
      const val: number = getResource(mat as t.resource).calculateBaseValue();
      value += amt * val;
    }

    value += Math.max(1, util.R(data.craft_fee * value, 2));

    for (let i = 0; i < this.recipe.tics; ++i) {
      value *= 1.5;
    }

    return value;
  }
}

