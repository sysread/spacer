/**
 * planet/work - labor tasks and resource extraction.
 *
 * Handles player work actions at a planet: pay calculation, resource
 * collection via mining, and picket line detection.
 */

import data from '../data';
import Store from '../store';
import { Person } from '../person';
import { PlanetState } from './state';
import * as t from '../common';
import * as util from '../util';
import * as FastMath from '../fastmath';


/** Function that returns the per-turn production rate for a resource. */
export type ProductionFn = (item: t.resource) => number;


export class Work {
  constructor(
    private state: PlanetState,
    private production: ProductionFn,
  ) {}

  /** True if a workers' strike condition is active, preventing work. */
  hasPicketLine() {
    return this.state.hasCondition("workers' strike");
  }

  /**
   * Returns the credit pay rate for a work task, scaled by planet size,
   * adjusted by player standing (bonus), and reduced by sales tax.
   */
  payRate(player: Person, task: t.Work) {
    let rate = this.state.scale(task.pay);
    rate += rate * player.getStandingPriceAdjustment(this.state.faction.abbrev);
    rate -= rate * this.state.faction.sales_tax;
    return FastMath.ceil(rate);
  }

  /**
   * Executes a work task for `days` days. Returns the total pay and any
   * resources harvested. Resource collection is probabilistic: each turn,
   * each reward resource has a chance to yield 1 unit if the planet produces it.
   */
  work(player: Person, task: t.Work, days: number) {
    const pay       = this.payRate(player, task) * days;
    const turns     = days * 24 / data.hours_per_turn;
    const rewards   = task.rewards;
    const collected = new Store;

    for (let turn = 0; turn < turns; ++turn) {
      for (const item of rewards) {
        collected.inc(item, this.mine(item));
      }
    }

    return {pay: pay, items: collected};
  }

  /**
   * Probabilistically yields 1 unit of an item from the environment.
   * Only possible if the planet produces the item; capped at 1 unit per attempt.
   */
  mine(item: t.resource) {
    const prod = this.production(item);
    if (prod > 0 && util.chance(data.market.minability)) {
      const amt = util.getRandomNum(0, prod);
      return Math.min(1, amt);
    }

    return 0;
  }
}
