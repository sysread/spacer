import data from './data';
import system from './system';
import Physics from './physics';
import { resources } from './resource';
import { Conflict } from './conflict';

import {
  Events,
  Ev,
  Turn,
  Arrived,
  ItemsSold,
  CaughtSmuggling,
} from './events';

import * as t from './common';
import * as util from './util';


// Shims for global browser objects
declare var console: any;
declare var window: { game: any; }


export function estimateTransitTimeAU(au: number): number {
  let turns = 0;
  for (let i = 0, inc = 15; i < au; ++i, inc *= 0.8) {
    turns += inc * data.turns_per_day;
  }

  return Math.ceil(turns);
}


export function estimateTransitTime(orig: t.body, dest: t.body): number {
  let au = util.R(system.distance(orig, dest) / Physics.AU);
  return estimateTransitTimeAU(au);
}



export enum Status {
  Ready    = 0,
  Accepted = 1,
  Complete = 2,
  Success  = 3,
  Failure  = 4,
}


interface BaseSavedMission {
  [key: string]: any;
  issuer:    t.body;
  status?:   number;
  deadline?: number;
  standing?: number;
  reward?:   number;
  turns?:    number;
}

export interface SavedPassengers extends BaseSavedMission {
  dest: t.body;
}

export interface SavedSmuggler extends BaseSavedMission {
  item:      t.resource;
  amt:       number;
  amt_left?: number;
}

export type SavedMission =
  | SavedPassengers
  | SavedSmuggler
;


export function restoreMission(opt: SavedMission): Mission {
  if ((<SavedPassengers>opt).dest) {
    return new Passengers( <SavedPassengers>opt );
  }

  if ((<SavedSmuggler>opt).item) {
    return new Smuggler( <SavedSmuggler>opt );
  }

  throw new Error('mission data does not match recognized mission type');
}


export abstract class Mission {
  status:    Status;
  deadline?: number;
  issuer:    t.body;

  readonly standing: number;
  readonly reward:   number;
  readonly turns:    number;

  constructor(opt: SavedMission) {
    this.status   = opt.status || Status.Ready;
    this.standing = opt.standing || 0;
    this.reward   = opt.reward || 0;
    this.turns    = opt.turns || 0;
    this.issuer   = opt.issuer as t.body;
    this.deadline = opt.deadline;
  }

  abstract get title(): string;
  abstract get short_title(): string;
  abstract get description(): string;
  abstract get description_remaining(): string;

  get faction(): t.faction {
    return data.bodies[this.issuer].faction;
  }

  // TODO race condition: if player gains or loses standing during mission, the pay rate changes
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

  get time_total(): string {
    const days  = util.csn(Math.floor(this.turns / data.turns_per_day));
    const hours = Math.floor((this.turns_left % data.turns_per_day) * data.hours_per_turn);
    if (hours) {
      return `${days} days, ${hours} hours`;
    } else {
      return `${days} days`;
    }
  }

  get end_date(): string {
    const date = new Date(window.game.date);
    date.setDate(date.getDate() + (this.turns_left * data.turns_per_day));
    return window.game.strdate(date);
  }

  setStatus(status: Status) {
    if (this.status >= status) {
      const info = JSON.stringify(this);
      throw new Error(`invalid state transition: ${this.status} to ${status}: ${info}`);
    }

    this.status = status;
  }

  accept() {
    // If already set, this is a saved mission being reinitialized
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
    window.game.notify(`Contract completed: ${this.short_title}. ${util.csn(this.price)} credits have been deposited in your account.`);
  }

  cancel() {
    this.setStatus(Status.Failure);
    window.game.player.decStanding(this.faction, this.standing / 2);
    window.game.player.completeMission(this);
    window.game.save_game();
    window.game.notify(`Contract cancelled: ${this.short_title}`);
  }
}


export class Passengers extends Mission {
  dest: t.body;

  constructor(opt: SavedPassengers) {
    const est = estimateTransitTime(opt.issuer, opt.dest);

    // TODO race condition here; the orig and dest are moving so long as the
    // contract is offered, which may make the deadline impossible after
    // several days.
    // NOTE these are NOT restored from opt when reinitialized from game data.
    // they should always be fresh.
    opt.turns    = Math.max(data.turns_per_day * 3, est);
    opt.reward   = util.fuzz(Math.max(500, Math.ceil(Math.log(1 + est) * 1500)), 0.05);
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
      `They must arrive at their destination within ${this.time_total} by ${this.end_date}; you will receive ${reward} credits on arrival.`,
      `These passengers are legal citizens of ${faction} and are protected by the laws of their government.`,
      `Failure to complete the contract will result in a loss of standing and/or monetary penalties.`,
      `You have ${this.time_left} remaining to complete this contract.`,
    ].join(' ');
  }

  get description_remaining(): string {
    return `You have ${this.time_left} remaining to complete this contract.`;
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

      return true;
    });
  }
}


export class Smuggler extends Mission {
  item:     t.resource;
  amt:      number;
  amt_left: number;

  constructor(opt: SavedSmuggler) {
    opt.turns    = 2 * Math.max(data.turns_per_day * 3, estimateTransitTimeAU(10));
    opt.reward   = 4 * resources[opt.item].value * opt.amt;
    opt.standing = Math.ceil(Math.log10(opt.reward));

    super(opt);

    this.item     = opt.item;
    this.amt      = opt.amt;
    this.amt_left = opt.amt_left || opt.amt;
  }

  get title(): string {
    const name = window.game.planets[this.issuer].name;
    return `Smuggle ${this.amt} units of ${this.item} to ${name}`;
  }

  get short_title(): string {
    const name = window.game.planets[this.issuer].name;
    return `Smuggle ${this.item} to ${name}`;
  }

  get description(): string {
    const reward = util.csn(this.price);

    const factions = window.game.get_conflicts({
      name: 'trade ban',
      target: this.issuer,
    }).map((c: Conflict) => c.proponent);

    return [
      `There is currently a ban in trade against our faction.`,
      `As a result, we are in desparate need of ${this.item} as our supplies dwindle.`,
      `We are asking you to acquire ${this.amt} units of ${this.item} and return them here within ${this.time_total} by ${this.end_date}.`,
      `These goods will be quietly removed from your hold by our people when you arrive at the dock.`,
      `We will offer you ${reward} credits you for the completion of this contract in a timely fashion.`,
    ].join(' ');
  }

  get description_remaining(): string {
    return [
      `You have ${this.amt_left} remaining units to deliver.`,
      `You have ${this.time_left} remaining to complete this contract.`,
    ].join(' ');
  }

  accept() {
    super.accept();

    Events.watch(Ev.Arrived, (event: Arrived) => {
      if (this.is_expired || this.is_complete) {
        return false;
      }

      if (event.dest == this.issuer) {
        const amt = Math.min(this.amt_left, window.game.player.ship.cargo.count(this.item));

        if (amt > 0) {
          this.amt_left -= amt;
          window.game.player.ship.unloadCargo(this.item, amt);
          window.game.planets[this.issuer].sell(this.item, amt);

          if (this.amt_left == 0) {
            this.setStatus(Status.Complete);
            this.complete();
            return false;
          }
          else {
            window.game.notify(`You have delivered ${amt} units of ${this.item}. ${this.description_remaining}.`);
          }
        }
      }

      return true;
    });

    Events.watch(Ev.CaughtSmuggling, (event: CaughtSmuggling) => {
      if (this.is_expired || this.is_complete) {
        return false;
      }

      this.setStatus(Status.Failure);
      this.complete();
      return false;
    });
  }
}
