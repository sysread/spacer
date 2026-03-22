/**
 * planet/economy - production, consumption, stock, supply/demand queries.
 *
 * Core economic model for a planet. Reads and writes to PlanetState's
 * stock, supply, demand, need stores. Provides the need metric that
 * drives pricing and import/manufacturing decisions.
 */

import data from '../data';
import { PlanetState } from './state';
import * as t from '../common';


export class Economy {
  constructor(private state: PlanetState) {}

  getStock(item: t.resource) {
    return this.state.stock.count(item);
  }

  getDemand(item: t.resource) {
    return this.state.demand.avg(item);
  }

  getSupply(item: t.resource) {
    return this.state.supply.avg(item);
  }

  avgProduction(item: t.resource) {
    return this.getSupply(item) - this.consumption(item);
  }

  netProduction(item: t.resource) {
    return this.production(item) - this.consumption(item);
  }

  /**
   * Returns the per-turn production output for an item, including condition modifiers.
   * Scaled by data.resource_scale and divided across turns_per_day.
   */
  production(item: t.resource) {
    let amount = this.state.produces.get(item) / data.turns_per_day;

    for (const condition of this.state.conditions) {
      amount += this.state.scale(condition.produces[item] || 0);
    }

    return amount * data.resource_scale;
  }

  /**
   * Returns the per-turn consumption amount for an item, including condition modifiers.
   */
  consumption(item: t.resource) {
    let amount = this.state.consumes.get(item) / data.turns_per_day;

    for (const condition of this.state.conditions) {
      amount += this.state.scale(condition.consumes[item] || 0);
    }

    return amount * data.resource_scale;
  }

  /** Threshold for declaring a shortage. Net exporters have a higher bar (3 vs 6). */
  shortageFactor(item: t.resource) {
    return this.isNetExporter(item) ? 3 : 6;
  }

  hasShortage(item: t.resource) {
    return this.getNeed(item) >= this.shortageFactor(item);
  }

  hasSuperShortage(item: t.resource) {
    return this.getNeed(item) >= (this.shortageFactor(item) * 1.5);
  }

  /** Threshold for declaring a surplus. Net exporters have a lower bar (0.3 vs 0.6). */
  surplusFactor(item: t.resource) {
    return this.isNetExporter(item) ? 0.3 : 0.6;
  }

  hasSurplus(item: t.resource) {
    return this.getNeed(item) <= this.surplusFactor(item);
  }

  hasSuperSurplus(item: t.resource) {
    return this.getNeed(item) <= this.surplusFactor(item) * 0.75;
  }

  /**
   * Signals that the planet wants `amt` units of `item`.
   * If stock is below amt, the deficit is added to demand history.
   */
  requestResource(item: t.resource, amt: number) {
    const avail = this.getStock(item);

    if (amt > avail) {
      this.incDemand(item, amt - avail);
    }
  }

  /**
   * Increases demand for an item and propagates demand upstream to its ingredients.
   * For crafted goods in shortage, also increases demand for their raw materials.
   * Uses a queue (BFS) rather than recursion to avoid stack overflow for deep recipes.
   */
  incDemand(item: t.resource, amt: number) {
    const queue: [t.resource, number][] = [[item, amt]];

    while (queue.length > 0) {
      const elt = queue.shift();

      if (elt != undefined) {
        const [item, amt] = elt;

        this.state.demand.inc(item, amt);

        const res = data.resources[item];

        if (t.isCraft(res) && this.hasShortage(item)) {
          for (const mat of Object.keys(res.recipe.materials) as t.resource[]) {
            queue.push([ mat, (res.recipe.materials[mat] || 0) * amt ]);
          }
        }
      }
    }
  }

  incSupply(item: t.resource, amount: number) {
    this.state.supply.inc(item, amount);
  }

  /**
   * Returns true if this planet is a net exporter of item.
   * For raw resources: netProduction > 1 scaled unit.
   * For crafted resources: true only if the planet is a net exporter of ALL
   * required ingredients (recursive, cached in _exporter).
   */
  isNetExporter(item: t.resource): boolean {
    if (this.state._exporter[item] === undefined) {
      const res = data.resources[item];

      if (t.isCraft(res)) {
        this.state._exporter[item] = true;

        for (const mat of Object.keys(res.recipe.materials)) {
          if (!this.isNetExporter(mat as t.resource)) {
            this.state._exporter[item] = false;
            break;
          }
        }
      }
      else {
        this.state._exporter[item] = this.netProduction(item) > this.state.scale(1);
      }
    }

    return this.state._exporter[item];
  }

  /**
   * Returns the dimensionless need score for an item.
   * Compares demand to a weighted average of stock and supply history:
   *   supply proxy = (stock + 2*avg_supply) / 3
   *
   * Results:
   *   need > 1: shortage signal; log(10*(1+n)) grows with severity
   *   need < 1: surplus signal; d/s fraction below 1
   *   need = 1: exactly balanced
   *
   * Cached in _need until rollups() clears it.
   */
  getNeed(item: t.resource) {
    if (this.state._need[item] === undefined) {
      const d = this.getDemand(item);
      const s = (this.getStock(item) + (2 * this.getSupply(item))) / 3;
      const n = d - s;
      this.state._need[item] =
            n == 0 ? 1
          : n > 0  ? Math.log(10 * (1 + n))
                   : d / s;
    }

    return this.state._need[item];
  }
}
