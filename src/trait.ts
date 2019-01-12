import data from './data';
import * as t from './common';

export class Trait {
  name:     string;
  produces: t.ResourceCounter;
  consumes: t.ResourceCounter;
  price:    t.PriceAdjustmentCounter;

  constructor(name: string) {
    this.name = name;
    this.produces = data.traits[name].produces || {};
    this.consumes = data.traits[name].consumes || {};
    this.price    = data.traits[name].price    || {};
  }
};
