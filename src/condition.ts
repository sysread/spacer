import data from './data';
import * as t from './common';
import * as util from './util';
import {Planet} from './planet';
import * as FastMath from './fastmath';

export interface SavedCondition {
  name:        string;
  turns_total: number;
  turns_done:  number;
}

export class Condition {
  name:              string;
  turns_total:       number;
  turns_done:        number;
  produces:          t.ResourceCounter;
  consumes:          t.ResourceCounter;
  triggers:          t.ConditionTriggers;
  affectedResources: t.ResourceCounter;

  constructor(name: string, init?: SavedCondition) {
    this.name     = name;
    this.produces = data.conditions[this.name].produces || {};
    this.consumes = data.conditions[this.name].consumes || {};
    this.triggers = data.conditions[this.name].triggers || {};

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

  reduceDuration(fraction: number) {
    this.turns_total = FastMath.ceil(this.turns_total * fraction);
  }

  turn(p: Planet) {
    for (const item of Object.keys(this.triggers.shortage) as t.resource[]) {
      if (!p.hasShortage(item)) {
        this.reduceDuration(0.8);
      }
    }

    for (const item of Object.keys(this.triggers.surplus) as t.resource[]) {
      if (!p.hasSurplus(item)) {
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
   * Tests for the chance that this condition might befall a market. Always
   * false if the market is already suffering from the condition. Otherwise,
   * the chance is based on the probability for the given resource
   * shortage/surplus or existence of another condition for trait (see
   * data.conditions.triggers).
   */
  testForChance(p: Planet): boolean {
    // False if already active
    if (p.hasCondition(this.name)) {
      return false;
    }

    // Shortages
    for (const item of Object.keys(this.triggers.shortage) as t.resource[]) {
      if (p.hasShortage(item)) {
        if (util.chance(this.triggers.shortage[item])) {
          return true;
        }
      }
    }

    // Surpluses
    for (const item of Object.keys(this.triggers.surplus) as t.resource[]) {
      if (p.hasSurplus(item)) {
        if (util.chance(this.triggers.surplus[item])) {
          return true;
        }
      }
    }

    // Conditions
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
