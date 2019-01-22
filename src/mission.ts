import data from './data';
import system from './system';
import Physics from './physics';
import * as t from './common';
import * as util from './util';


// Shims for global browser objects
declare var console: any;
declare var window: {
  game: any;
  Events: Events;
  setTimeout(cb: Function, intvl: number): any;
}


export enum Ev {
  Turn        = 'Turn',
  Arrived     = 'Arrived',
  ItemsBought = 'ItemsBought',
  ItemsSold   = 'ItemsSold',
};


interface Turn {
  type: Ev.Turn;
  turn: number;
}

interface Arrived {
  type: Ev.Arrived;
  dest: t.body;
}

interface ItemsBought {
  type:  Ev.ItemsBought;
  item:  t.resource;
  count: number;
  price: number;
}

interface ItemsSold {
  type:     Ev.ItemsSold;
  item:     t.resource;
  count:    number;
  price:    number;
  standing: number;
}

type Event =
  | Turn
  | Arrived
  | ItemsBought
  | ItemsSold;


export class Events {
  static watcher: {[key: string]: Function[]} = {};

  static watch(ev: Ev, cb: Function) {
    if (!Events.watcher[ev]) {
      Events.watcher[ev] = [];
    }

    Events.watcher[ev].push(cb);
  }

  static signal(event: Event) {
    if (Events.watcher[event.type]) {
      const retain: Function[] = [];

      for (const fn of Events.watcher[event.type]) {
        if (!fn(event)) {
          retain.push(fn);
        }
      }

      Events.watcher[event.type] = retain;
    }
  }
}

window.Events = Events;


export enum Status {
  Ready    = 0,
  Accepted = 1,
  Complete = 2,
  Success  = 3,
  Failure  = 4,
}


export interface SavedMissionData {
  [key: string]: any;
  status?:   number;
  deadline?: number;
  issuer:    string;
  standing:  number;
  reward:    number;
  turns:     number;
}


export abstract class Mission {
  status:    Status;
  deadline?: number;
  issuer:    t.body;

  readonly standing: number;
  readonly reward:   number;
  readonly turns:    number;

  constructor(opt: SavedMissionData) {
    this.status   = opt.status || Status.Ready;
    this.standing = opt.standing;
    this.reward   = opt.reward;
    this.turns    = opt.turns;
    this.issuer   = opt.issuer as t.body;
    this.deadline = opt.deadline;
  }

  abstract get title(): string;
  abstract get short_title(): string;
  abstract get description(): string;

  get faction(): t.faction {
    return data.bodies[this.issuer].faction;
  }

  // TODO race condition: if player gains or loses standing during mission,
  // the pay rate changes.
  get price(): number {
    if (window.game && window.game.player) {
      const bonus = window.game.player.getStandingPriceAdjustment(this.faction);
      return Math.ceil(this.reward * (1 + bonus));
    }
    else {
      return this.reward;
    }
  }

  get turns_left(): number {
    let left = 0;

    if (this.deadline) {
      left = Math.max(0, this.deadline - window.game.turns);
    } else {
      left = this.turns;
    }

    return Math.max(0, left);
  }

  get is_expired(): boolean {
    return this.status != Status.Success
        && this.turns_left <= 0;
  }

  get is_complete(): boolean {
    return this.status >= Status.Complete;
  }

  get time_left(): string {
    const days  = util.csn(Math.floor(this.turns_left / data.turns_per_day));
    const hours = Math.floor((this.turns_left % data.turns_per_day) * data.hours_per_turn);
    if (hours) {
      return `${days} days, ${hours} hours`;
    } else {
      return `${days} days`;
    }
  }

  setStatus(status: Status) {
    if (this.status >= status) {
      const info = JSON.stringify(this);
      throw new Error(`invalid state transition: ${this.status} to ${status}: ${info}`);
    }

    this.status = status;
  }

  accept() {
    // If status is already set, this is a saved mission that is being
    // reinitialized.
    if (this.status < Status.Accepted) {
      this.status = Status.Accepted;
      this.deadline = window.game.turns + this.turns;

      window.game.planets[this.issuer].acceptMission(this);
      window.game.player.acceptMission(this);
    }

    Events.watch(Ev.Turn, (event: Turn) => {
      if (this.turns_left <= 0) {
        this.complete();
        return false;
      }
      else {
        return true;
      }
    });
  }

  complete() {
    // Mission was already completed
    if (this.status > Status.Complete) {
      return;
    }

    // TODO notification system
    if (this.turns_left >= 0) {
      this.finish();
    } else {
      this.cancel();
    }
  }

  finish() {
    this.setStatus(Status.Success);
    window.game.player.credit(this.price); // this must happen first, as price is affected by standing
    window.game.player.incStanding(this.faction, this.standing);
    window.game.player.completeMission(this);
    window.game.save_game();
  }

  cancel() {
    this.setStatus(Status.Failure);
    window.game.player.decStanding(this.faction, this.standing / 2);
    window.game.player.completeMission(this);
    window.game.save_game();
  }
}


export class Passengers extends Mission {
  dest: t.body;

  constructor(opt: any) {
    const dist = util.R(system.distance(opt.issuer, opt.dest) / Physics.AU);

    opt.turns = Math.max(data.turns_per_day * 3, data.turns_per_day * 7 * dist);
    opt.reward = Math.max(500, dist * 500);
    opt.standing = Math.ceil(Math.log10(opt.reward));

    super(opt);

    this.dest = opt.dest;
  }

  get destination(): string {
    return data.bodies[this.dest].name;
  }

  get title(): string {
    const reward = util.csn(this.price);
    return `Passengers to ${this.destination} in ${this.time_left} for ${reward}c`;
  }

  get short_title(): string {
    const dest = util.ucfirst(this.dest);
    return `Passengers to ${dest}`;
  }

  get description(): string {
    const reward = util.csn(this.price);

    let faction = data.factions[data.bodies[this.issuer].faction].full_name;
    if (!faction.startsWith('The '))
      faction = 'The ' + faction;

    return [
      `Provide legal transport to these passengers to ${this.destination}.`,
      `They must arrive at their destination within ${this.time_left}; you will receive ${reward} credits on arrival.`,
      `These passengers are legal citizens of ${faction} and are protected by the laws of their government.`,
      `Failure to complete the contract will result in a loss of standing and/or monetary penalties.`,
    ].join(' ');
  }

  accept() {
    super.accept();

    Events.watch(Ev.Arrived, (event: Arrived) => {
      if (this.is_expired) {
        return false;
      }

      if (event.dest == this.dest) {
        this.setStatus(Status.Complete);
        this.complete();
        return false;
      }
      else {
        return true;
      }
    });
  }
}
