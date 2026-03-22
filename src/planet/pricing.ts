/**
 * planet/pricing - market price computation pipeline.
 *
 * Computes buy and sell prices for resources at this planet. The price
 * pipeline applies need-based markup, trait adjustments, scarcity,
 * condition effects, availability distance, and random fuzz.
 */

import data from '../data';
import system from '../system';
import Physics from '../physics';
import { resources } from '../resource';
import { Person } from '../person';
import { PlanetState } from './state';
import { Economy } from './economy';
import * as t from '../common';
import * as util from '../util';
import * as FastMath from '../fastmath';


/** Callback that checks if a planet body is a net exporter of a resource.
 * Injected to avoid Pricing needing access to window.game.planets. */
export type ExporterCheckFn = (body: t.body, item: t.resource) => boolean;


export class Pricing {
  constructor(
    private state: PlanetState,
    private economy: Economy,
    private isBodyNetExporter: ExporterCheckFn,
  ) {}

  /**
   * Distance-based price markup for non-exporters.
   * Net exporters sell at a 20% discount (0.8).
   * Non-exporters get a markup based on distance to the nearest exporter.
   */
  getAvailabilityMarkup(item: t.resource) {
    if (this.economy.isNetExporter(item)) {
      return 0.8;
    }

    let distance: number | undefined;
    let nearest: t.body | undefined;

    for (const body of t.bodies) {
      if (body == this.state.body) {
        continue;
      }

      if (!this.isBodyNetExporter(body, item)) {
        continue;
      }

      const d = system.distance(this.state.body, body);

      if (distance == undefined || distance > d) {
        nearest  = body;
        distance = d;
      }
    }

    if (distance != undefined && nearest != undefined) {
      let markup = 1;

      if (data.bodies[nearest].faction != data.bodies[this.state.body].faction) {
        markup += 0.1;
      }

      const au = FastMath.ceil(distance / Physics.AU);
      for (let i = 0; i < au; ++i) {
        markup *= 1.05;
      }

      return markup;
    }
    else {
      return 1;
    }
  }

  /** Scarcity markup for necessity goods (food, fuel, medicine, etc.). */
  getScarcityMarkup(item: t.resource) {
    if (data.necessity[item]) {
      return 1 + data.scarcity_markup;
    } else {
      return 1;
    }
  }

  /** Condition-based markup: consumption raises price, production lowers it. */
  getConditionMarkup(item: t.resource) {
    let markup = 1;

    for (const condition of this.state.conditions) {
      const consumption = this.state.scale(condition.consumes[item] || 0);
      const production  = this.state.scale(condition.produces[item] || 0);
      const amount      = consumption - production;
      markup += amount;
    }

    return markup;
  }

  /**
   * Computes and caches the market price for an item.
   * See module doc for the full pipeline.
   */
  price(item: t.resource) {
    if (this.state._price[item] == undefined) {
      const value = resources[item].value;
      const need  = this.economy.getNeed(item);

      let price = 0;

      if (need > 1) {
        price = value + (value * Math.log(need));
      } else if (need < 1) {
        price = value * need;
      } else {
        price = value;
      }

      for (const trait of this.state.traits)
        price -= price * (trait.price[item] || 0);

      price *= this.getScarcityMarkup(item);
      price *= this.getConditionMarkup(item);
      price  = resources[item].clampPrice(price);
      price *= this.getAvailabilityMarkup(item);
      price  = util.fuzz(price, 0.05);

      this.state._price[item] = util.R(price);
    }

    return this.state._price[item];
  }

  /** Price at which this market will buy goods from the player. */
  sellPrice(item: t.resource) {
    return this.price(item);
  }

  /**
   * Price at which this market sells goods to the player.
   * Adds sales tax; subtracts a standing discount if a player is provided.
   */
  buyPrice(item: t.resource, player?: Person): number {
    const price = this.price(item) * (1 + this.state.faction.sales_tax);
    return player
      ? FastMath.ceil(price * (1 - player.getStandingPriceAdjustment(this.state.faction.abbrev)))
      : FastMath.ceil(price);
  }

  /** Price per tonne of fuel (buy price / fuel mass), with a 3.5% handling margin. */
  fuelPricePerTonne(player?: Person): number {
    return FastMath.ceil(this.buyPrice('fuel', player) * 1.035 / data.resources.fuel.mass);
  }
}
