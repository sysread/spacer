/**
 * trait - runtime wrapper for planet/station trait definitions.
 *
 * Traits are persistent characteristics of a planet or station that modify
 * its local economy. They adjust the production and consumption rates of
 * specific resources and can shift prices up or down for resources and addons.
 *
 * Trait instances are created by Planet when building its trait list from
 * data.ts. They are not singletons - each Planet constructs its own instances.
 *
 * Examples:
 *   'mineral rich'      - boosts ore/minerals production, lowers their price
 *   'agricultural'      - boosts food production
 *   'tech hub'          - improves electronics/cybernetics availability
 *   'black market'      - enables contraband trading, expands piracy radius
 *   'military'          - expands patrol jurisdiction, contracts piracy radius
 */

import data from './data';
import * as t from './common';

export class Trait {
  name:     string;
  produces: t.ResourceCounter;  // per-turn production bonus per resource
  consumes: t.ResourceCounter;  // per-turn consumption bonus per resource
  price:    t.PriceAdjustmentCounter;  // price multiplier adjustments per resource

  constructor(name: string) {
    this.name     = name;
    this.produces = data.traits[name].produces || {};
    this.consumes = data.traits[name].consumes || {};
    this.price    = data.traits[name].price    || {};
  }
}
