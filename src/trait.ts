import data from './data';
import * as t from './common';

export class Trait {
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  get produces() { return data.traits[this.name].produces || {} }
  get consumes() { return data.traits[this.name].consumes || {} }
  get price()    { return data.traits[this.name].price    || {} }

  priceOf(item: keyof t.PriceAdjustmentCounter): number {
    return this.price[item] || 0;
  }
};
