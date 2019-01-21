import data from './data';
import system from './system';
import Physics from './physics';
import * as t from './common';
import * as util from './util';


// Shims for global browser objects
declare var window: { game: any; }
declare var console: any;


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


enum Status {
  Ready    = 0,
  Accepted = 1,
  Complete = 2,
  Success  = 3,
  Failure  = 4,
}


export abstract class Mission {
  status:    Status = Status.Ready;
  deadline?: number;
  issuer:    t.body;

  readonly standing: number;
  readonly reward:   number;
  readonly turns:    number;

  constructor(opt: any) {
    this.standing = opt.standing;
    this.reward   = opt.reward;
    this.turns    = opt.turns;
    this.issuer   = opt.issuer;
  }

  abstract get title(): string;

  get faction(): t.faction {
    return data.bodies[this.issuer].faction;
  }

  get turns_left(): number {
    let left = 0;

    if (this.deadline) {
      left = this.deadline - window.game.turns;
    } else {
      left = this.turns;
    }

    return Math.max(0, left);
  }

  get is_complete(): boolean {
    return this.status >= Status.Complete;
  }

  setStatus(status: Status) {
    if (this.status >= status) {
      throw new Error('invalid state transition');
    }

    this.status = status;
  }

  accept() {
    this.status = Status.Accepted;
    this.deadline = window.game.turns + this.turns;

    Events.watch(Ev.Turn, (event: Turn) => {
      if (this.turns_left == 0) {
        this.setStatus(Status.Failure);
        this.complete();
      }
    });
  }

  complete() {
    // TODO notification system
    if (this.turns_left > 0) {
      this.setStatus(Status.Success);
      window.game.player.credit(this.reward);
      window.game.player.incStanding(this.faction, this.standing);
      window.game.player.completeMission(this);
    }
    else {
      window.game.player.decStanding(this.faction, this.standing / 2);
      window.game.player.completeMission(this);
    }
  }
}


export class Passengers extends Mission {
  dest: t.body;

  constructor(opt: any) {
    const dist = util.R(system.distance(opt.issuer, opt.dest) / Physics.AU);

    opt.turns = data.turns_per_day * 7 * dist;
    opt.reward = Math.max(500, dist * 500);
    opt.standing = Math.ceil(Math.log10(opt.reward));

    super(opt);

    this.dest = opt.dest;
  }

  get title(): string {
    const dest   = data.bodies[this.dest].name;
    const days   = util.csn(this.turns_left / data.turns_per_day);
    const reward = util.csn(this.reward);
    return `Passengers to ${dest} in ${days} days for ${reward} c`;
  }

  accept() {
    super.accept();

    Events.watch(Ev.Arrived, (event: Arrived) => {
      if (event.dest == this.dest) {
        this.setStatus(Status.Complete);
        this.complete();
      }
    });
  }
}
