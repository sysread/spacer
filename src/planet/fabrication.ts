/**
 * planet/fabrication - fabricator health and crafting mechanics.
 *
 * Manages the planet's fabrication capacity: availability tracking,
 * time/fee computation, health consumption, and auto-replenishment.
 */

import data from '../data';
import { isCraft, resources } from '../resource';
import { Person } from '../person';
import { PlanetState } from './state';
import { Pricing } from './pricing';
import { Commerce } from './commerce';
import * as t from '../common';
import * as FastMath from '../fastmath';


export class Fabrication {
  constructor(
    private state: PlanetState,
    private pricing: Pricing,
    private commerce: Commerce,
  ) {}

  /** Returns fabricator availability as a percentage [0, 100]. */
  fabricationAvailability() {
    return FastMath.ceil(Math.min(100, this.state.fab_health / this.state.max_fab_health * 100));
  }

  /**
   * The reduction rate applied to fabrication time when fab_health > 0.
   * Manufacturing hubs are fastest, then tech hubs, then baseline.
   */
  fabricationReductionRate() {
    if (this.state.hasTrait('manufacturing hub'))
      return 0.35;

    if (this.state.hasTrait('tech hub'))
      return 0.5;

    return 0.65;
  }

  /**
   * Computes the turns required to fabricate `count` units.
   * While fab_health remains, each unit takes craftTurns * reductionRate turns.
   * Once health is exhausted, remaining units take the full craftTurns each.
   */
  fabricationTime(item: t.resource, count=1) {
    const resource = resources[item];

    if (!isCraft(resource)) {
      throw new Error(`${item} is not craftable`);
    }

    const reduction = this.fabricationReductionRate();
    let health = this.state.fab_health;
    let turns  = 0;

    while (count > 0 && health > 0) {
      turns  += resource.craftTurns * reduction;
      health -= resource.craftTurns * reduction;
      --count;
    }

    turns += count * resource.craftTurns;

    return Math.max(1, FastMath.ceil(turns));
  }

  /**
   * Returns true if fab_health is sufficient to cover `count` units without
   * falling to zero mid-batch.
   */
  hasFabricationResources(item: t.resource, count=1) {
    const resource = resources[item];

    if (!isCraft(resource)) {
      throw new Error(`${item} is not craftable`);
    }

    const reduction = this.fabricationReductionRate();
    let health = this.state.fab_health;

    for (let i = 0; i < count && health > 0; ++i) {
      health -= resource.craftTurns * reduction;

      if (health == 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * Computes the credit fee to fabricate `count` units.
   * Standing discount is applied to the total.
   */
  fabricationFee(item: t.resource, count=1, player: Person): number {
    const resource = resources[item];

    if (!isCraft(resource)) {
      throw new Error(`${item} is not craftable`);
    }

    const price    = this.pricing.sellPrice(item);
    const discount = 1.0 - player.getStandingPriceAdjustment(this.state.faction);

    let fee = 0;

    for (let i = 0, health = this.state.fab_health; i < count; ++i, --health) {
      if (health > 0) {
        fee += price * data.craft_fee;
      } else {
        fee += price * data.craft_fee_nofab;
      }
    }

    return FastMath.ceil(fee * discount);
  }

  /**
   * Consumes fab_health for one fabrication run. Returns the turns taken.
   */
  fabricate(item: t.resource) {
    const resource = resources[item];

    if (!isCraft(resource)) {
      throw new Error(`${item} is not craftable`);
    }

    const reduction = this.fabricationReductionRate() * resource.craftTurns;
    let turns  = 0;

    if (this.state.fab_health > 0) {
      turns += reduction;
      this.state.fab_health -= Math.min(this.state.fab_health, reduction);
    }
    else {
      turns += resource.craftTurns;
    }

    return Math.max(1, FastMath.ceil(turns));
  }

  /**
   * Attempts to buy cybernetics to restore fab_health when it falls below 50%.
   */
  replenishFabricators() {
    if (this.state.fab_health < this.state.max_fab_health / 2) {
      const want = FastMath.ceil((this.state.max_fab_health - this.state.fab_health) / data.fab_health);
      const [bought] = this.commerce.buy('cybernetics', want);
      this.state.fab_health += bought * data.fab_health;
    }

    this.state.fab_health = Math.min(this.state.fab_health, this.state.max_fab_health);
  }
}
