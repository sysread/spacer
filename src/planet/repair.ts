/**
 * planet/repair - hull/armor repair and addon pricing.
 */

import data from '../data';
import { isRaw, resources } from '../resource';
import { Person } from '../person';
import { PlanetState, isImportTask, isCraftTask } from './state';
import { Economy } from './economy';
import * as t from '../common';
import * as FastMath from '../fastmath';


export class Repair {
  constructor(
    private state: PlanetState,
    private economy: Economy,
  ) {}

  /** Price for an addon at this market: base + tax - standing discount, then trait adjustment. */
  addonPrice(addon: t.addon, player: Person) {
    const base     = data.addons[addon].price;
    const standing = base * player.getStandingPriceAdjustment(this.state.faction.abbrev);
    const tax      = base * this.state.faction.sales_tax;

    let price = base - standing + tax;

    for (const trait of this.state.traits) {
      if ('price' in trait && 'addons' in trait.price) {
        price *= trait.price['addons'] || 1;
      }
    }

    return price;
  }

  /**
   * Estimates turns until `item` becomes available (stock > 0).
   * Returns 0 if in stock, 3 if a raw producer, or the minimum
   * turns_left of any queued import or craft task for this item.
   * Returns undefined if nothing is scheduled.
   */
  estimateAvailability(item: t.resource): number|undefined {
    let turns: number | undefined = undefined;

    if (this.economy.getStock(item) > 0)
      return 0;

    const res = resources[item];
    if (isRaw(res) && this.economy.netProduction(item) > 0) {
      return 3;
    }

    for (const task of this.state.queue) {
      if (isImportTask(task)
        && task.item == item
        && (turns == undefined || turns > task.turns))
      {
        turns = task.turns;
      }
      else if (isCraftTask(task)
        && task.item == item
        && (turns == undefined || turns > task.turns))
      {
        turns = task.turns;
      }
    }

    return turns;
  }

  /**
   * Price adjustment factor based on how scarce or surplus a resource dependency is.
   */
  resourceDependencyPriceAdjustment(resource: t.resource) {
    if (this.economy.hasShortage(resource)) {
      return this.economy.getNeed(resource);
    } else if (this.economy.hasSurplus(resource)) {
      return 1 / this.economy.getNeed(resource);
    } else {
      return 1;
    }
  }

  /** True if metal is in stock (repairs are possible). */
  hasRepairs() {
    return this.economy.getStock('metal');
  }

  /** Hull repair price: base rate adjusted for tax, standing, and metal scarcity. */
  hullRepairPrice(player: Person) {
    const base     = data.ship.hull.repair;
    const tax      = this.state.faction.sales_tax;
    const standing = player.getStandingPriceAdjustment(this.state.faction.abbrev);
    const scarcity = this.resourceDependencyPriceAdjustment('metal');
    return FastMath.ceil((base + (base * tax) - (base * standing)) * scarcity);
  }

  /** Armor repair price: base rate adjusted for tax, standing, and metal scarcity. */
  armorRepairPrice(player: Person) {
    const base     = data.ship.armor.repair;
    const tax      = this.state.faction.sales_tax;
    const standing = player.getStandingPriceAdjustment(this.state.faction.abbrev);
    const scarcity = this.resourceDependencyPriceAdjustment('metal');
    return FastMath.ceil((base + (base * tax) - (base * standing)) * scarcity);
  }
}
