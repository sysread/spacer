/**
 * condition - timed economic events that alter a planet's production and consumption.
 *
 * Conditions are activated on a planet when trigger thresholds are met (a
 * resource shortage or surplus, or another condition being active). Once
 * active, they modify the planet's per-turn resource flows for a randomized
 * duration.
 *
 * Duration and early expiry:
 *   A condition runs for turns_total turns, counting up via turns_done.
 *   Each turn, it checks its own triggers against the current planet state.
 *   If a trigger condition is no longer met (e.g. a shortage was resolved),
 *   the remaining duration is reduced by 20% (multiplied by 0.8). This
 *   means conditions naturally wind down as the underlying cause is addressed,
 *   rather than running out their full timer regardless of circumstances.
 *
 * Chaining:
 *   Conditions can trigger other conditions via their triggers.condition map.
 *   Planet.processTurn() calls testForChance() on all known conditions each
 *   turn to check whether any should newly activate.
 *
 * Serialization:
 *   SavedCondition holds the minimal state needed to restore a Condition from
 *   localStorage (name + turn counters). The rest is reconstructed from data.ts.
 */

import data from './data';
import * as t from './common';
import * as util from './util';
import {Planet} from './planet';
import * as FastMath from './fastmath';

/** Minimal saved state for restoring a Condition from localStorage. */
export interface SavedCondition {
  name:        string;
  turns_total: number;
  turns_done:  number;
}

export class Condition {
  name:              string;
  turns_total:       number;  // total turns this condition will last
  turns_done:        number;  // turns elapsed so far
  produces:          t.ResourceCounter;
  consumes:          t.ResourceCounter;
  triggers:          t.ConditionTriggers;
  affectedResources: t.ResourceCounter;  // union of produces + consumes keys for quick lookup

  /**
   * Creates a new Condition, either fresh (random duration) or restored
   * from saved state (fixed duration from init).
   */
  constructor(name: string, init?: SavedCondition) {
    this.name     = name;
    this.produces = data.conditions[this.name].produces || {};
    this.consumes = data.conditions[this.name].consumes || {};
    this.triggers = data.conditions[this.name].triggers || {};

    // Pre-compute the union of affected resources for callers that need to
    // know which resources this condition touches without iterating both maps.
    this.affectedResources = {};
    Object.assign(this.affectedResources, this.produces, this.consumes);

    if (init) {
      this.turns_total = init.turns_total;
      this.turns_done  = init.turns_done;
    }
    else {
      this.turns_total = this.randomDuration();
      this.turns_done  = 0;
    }
  }

  get minDays()   { return data.conditions[this.name].days[0] }
  get maxDays()   { return data.conditions[this.name].days[1] }
  get turnsLeft() { return this.turns_total - this.turns_done }
  get isOver()    { return this.turns_done >= this.turns_total }

  randomDuration() {
    return data.turns_per_day * util.getRandomInt(this.minDays, this.maxDays);
  }

  /** Multiplies the remaining duration by fraction. Used to accelerate expiry. */
  reduceDuration(fraction: number) {
    this.turns_total = FastMath.ceil(this.turns_total * fraction);
  }

  /**
   * Advances the condition by one turn.
   * For each trigger that is no longer met on the planet, cuts the remaining
   * duration by 20%. This lets conditions expire early when their cause resolves
   * rather than always running to full duration.
   */
  turn(p: Planet) {
    for (const item of Object.keys(this.triggers.shortage) as t.resource[]) {
      if (!p.economy.hasShortage(item)) {
        this.reduceDuration(0.8);
      }
    }

    for (const item of Object.keys(this.triggers.surplus) as t.resource[]) {
      if (!p.economy.hasSurplus(item)) {
        this.reduceDuration(0.8);
      }
    }

    for (const cond of Object.keys(this.triggers.condition)) {
      if (!p.hasCondition(cond) && !p.hasTrait(cond)) {
        this.reduceDuration(0.8);
      }
    }

    ++this.turns_done;
  }

  /**
   * Tests whether this condition should newly activate on planet p.
   * Returns false immediately if already active. Otherwise checks each
   * trigger type in order: shortage, surplus, condition/trait. Returns
   * true on the first trigger whose chance roll succeeds.
   */
  testForChance(p: Planet): boolean {
    if (p.hasCondition(this.name)) {
      return false;
    }

    for (const item of Object.keys(this.triggers.shortage) as t.resource[]) {
      if (p.economy.hasShortage(item)) {
        if (util.chance(this.triggers.shortage[item])) {
          return true;
        }
      }
    }

    for (const item of Object.keys(this.triggers.surplus) as t.resource[]) {
      if (p.economy.hasSurplus(item)) {
        if (util.chance(this.triggers.surplus[item])) {
          return true;
        }
      }
    }

    for (const cond of Object.keys(this.triggers.condition)) {
      if (p.hasCondition(cond) || p.hasTrait(cond)) {
        if (util.chance(this.triggers.condition[cond])) {
          return true;
        }
      }
    }

    return false;
  }
}
