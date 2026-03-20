/**
 * fabricators - player-driven on-planet manufacturing queue.
 *
 * FabricationQueue manages a batch crafting job: the player requests N units
 * of a craftable resource, and fabricate() executes one unit per call, driving
 * the game clock forward by the required turns each time.
 *
 * Fabricator health:
 *   Planets have a fab_health value representing fabricator capacity. Each
 *   fabrication consumes health. If health is depleted, fabrication is still
 *   possible but takes longer and costs more (the planet charges a premium for
 *   overworked equipment). The player is warned and can opt in via
 *   ignore_fab_health.
 *
 * Fabrication sequence per unit:
 *   1. Check fabricator health (skip if ignore_fab_health is set)
 *   2. Check player has required materials
 *   3. Check player has money for the fabrication fee
 *   4. Debit fee from player's wallet
 *   5. Remove materials from player's cargo
 *   6. Call planet.fabricate() to consume fabricator health
 *   7. Load the crafted item into player's cargo
 *   8. Advance game clock by craftTurns (via game.turn())
 *   9. Increment completed count; return true to continue, false when done
 *
 * result and success are set after each call for the UI to display feedback.
 *
 * NOTE: fabricators.ts imports `game` as a default (singleton) import, which
 * creates a potential circular dependency. This should be resolved during the
 * ESM migration.
 */

import data from "./data";
import game from "./game";
import { Person } from "./person";
import { Planet } from "./planet";
import * as t from "./common";


interface FabricationQueueOpts {
  item:  t.resource;
  goal?: number;  // number of units to fabricate (default 1)
}

export class FabricationQueue {
  item:      t.resource;
  goal:      number;
  player:    Person;
  planet:    Planet;
  recipe:    t.ResourceCounter;   // input materials per unit
  completed: number;
  result:    any;    // human-readable outcome message for the UI
  success:   any;    // true on success, false on failure/blocked

  /** When true, skips the fab_health check and proceeds despite depletion. */
  ignore_fab_health: boolean;

  constructor(opt: FabricationQueueOpts) {
    const res = data.resources[opt.item];

    if (t.isCraft(res)) {
      this.item                = opt.item;
      this.goal                = opt.goal || 1;
      this.player              = game.player;
      this.planet              = game.here;
      this.recipe              = res.recipe.materials;
      this.completed           = 0;
      this.result              = null;
      this.success             = null;
      this.ignore_fab_health   = false;
    }
    else {
      throw new Error('expected craftable resource');
    }
  }

  /** Updates the target quantity and resets progress state. */
  set_goal(new_goal: number) {
    this.goal                = new_goal;
    this.completed           = 0;
    this.result              = null;
    this.ignore_fab_health   = false;
  }

  /** Units remaining to reach the goal. */
  get remaining() {
    return this.goal - this.completed;
  }

  /** Turns required to fabricate the next unit at current planet conditions. */
  get next_turns() {
    return this.planet.fabricationTime(this.item, 1);
  }

  /** Credit cost to fabricate the next unit, adjusted for standing and planet state. */
  get next_fee() {
    return this.planet.fabricationFee(this.item, 1, this.player);
  }

  /** True if the player's cargo holds all required materials for one unit. */
  get has_materials() {
    return this.player.canCraft(this.item) > 0;
  }

  /** True if the player has enough money to pay the next fabrication fee. */
  get has_money() {
    return this.next_fee <= this.player.money;
  }

  get goal_reached() {
    return this.completed == this.goal;
  }

  /** True if fabricator health is sufficient to fully cover the batch without penalty. */
  get has_fab_resources() {
    return this.planet.hasFabricationResources(this.item, this.goal);
  }

  /**
   * Fabricates one unit. Returns true to continue the batch, false when done
   * or blocked. Sets result and success for the UI after each call.
   *
   * Does NOT save the game or refresh the status bar - the caller is
   * responsible for those after the batch completes.
   */
  fabricate() {
    if (!this.ignore_fab_health && !this.has_fab_resources) {
      this.result  = 'Fabricator availability is temporarily depleted. You may continue, but it will cost more and take longer.';
      this.success = false;
      return false;
    }

    if (!this.has_materials) {
      this.result  = 'Materials required for fabrication have been exhausted.';
      this.success = false;
      return false;
    }

    if (!this.has_money) {
      this.result  = 'You do not have enough money to pay for the fabrication fee.';
      this.success = false;
      return false;
    }

    const turns = this.next_turns;
    const fee   = this.next_fee;

    this.player.debit(fee);

    for (const mat of Object.keys(this.recipe) as t.resource[]) {
      this.player.ship.unloadCargo(mat, this.recipe[mat] || 0);
    }

    this.planet.fabricate(this.item);
    this.player.ship.loadCargo(this.item, 1);
    game.turn(turns);

    ++this.completed;

    if (this.goal_reached) {
      this.result  = `Successfully fabricated ${this.completed} units of ${this.item}. They have been placed in your ship's cargo hold.`;
      this.success = true;
      return false;
    }
    else {
      return true;
    }
  }
}
