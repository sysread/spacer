import data from './data';
import * as t from './common';
import * as util from './util';

export interface SavedCondition {
  name:        string;
  turns_total: number;
  turns_done:  number;
}

export class Condition {
  name:        string;
  turns_total: number;
  turns_done:  number;

  constructor(name: string, init?: SavedCondition) {
    this.name = name;

    if (init) {
      this.turns_total = init.turns_total;
      this.turns_done  = init.turns_done;
    }
    else {
      this.turns_total = data.turns_per_day * util.getRandomInt(this.min_days, this.max_days);
      this.turns_done  = 0;
    }
  }

  get min_days()     { return data.conditions[this.name].days[0] }
  get max_days()     { return data.conditions[this.name].days[1] }
  get produces()     { return data.conditions[this.name].produces || {} }
  get consumes()     { return data.conditions[this.name].consumes || {} }
  get triggers()     { return data.conditions[this.name].triggers }
  get on_shortage()  { return this.triggers.shortage  || {} }
  get on_surplus()   { return this.triggers.surplus   || {} }
  get on_condition() { return this.triggers.condition || {} }
  get turns_left()   { return this.turns_total - this.turns_done }
  get is_over()      { return this.turns_done >= this.turns_total }

  inc_turns() { ++this.turns_done }
};
