/**
 * mission - player contracts offered at planets.
 *
 * Two mission types are currently implemented:
 *
 * Passengers - transport a group of passengers to a specific destination.
 *   Reward and deadline are calculated from the fastest possible transit time
 *   (using a schooner as the benchmark ship), fuzzed by 50% to add variance.
 *   The player must physically arrive at the destination before the deadline.
 *   Cannot be accepted remotely.
 *
 * Smuggler - acquire a quantity of contraband (or blockaded goods) and deliver
 *   it to the issuing planet.
 *   Deadline is based on a random 5-10 AU transit estimate at 1.5x. Can be
 *   accepted remotely (the contract is off-the-books by nature).
 *   Cancelled automatically if the player is caught smuggling before delivery.
 *   Partial deliveries are tracked; mission completes when amt_left reaches 0.
 *
 * Mission lifecycle:
 *   Ready -> Accepted -> Complete (expired) / Success / Failure
 *   setStatus() enforces forward-only transitions.
 *   accept() sets the deadline and installs event watchers.
 *   finish() pays out reward and grants standing.
 *   cancel() applies a standing penalty.
 *
 * Standing reward uses log10(reward) so that higher-paying missions give
 * proportionally more standing without scaling out of bounds.
 *
 * Price adjustment:
 *   The displayed price is reward * (1 + standingBonus). Standing can shift
 *   the payout up or down. The bonus is locked in at accept() time.
 *   TODO: there is a known race condition where standing changes during a
 *   mission alter the payout; price should be fixed at accept() time.
 */

import data from './data';
import system from './system';
import Physics from './physics';
import { resources } from './resource';
import { NavComp, travel_time } from './navcomp';
import { watch, Arrived, CaughtSmuggling } from "./events";

import * as t from './common';
import * as util from './util';
import * as FastMath from './fastmath';


// Shims for global browser objects
declare var console: any;
declare var window: {
  game: any;
}


/**
 * Estimates transit turns for a given distance in AU, assuming a schooner
 * with 5% of standard gravity acceleration. Used for deadline calculation.
 */
export function estimateTransitTimeAU(au: number): number {
  const s   = au * Physics.AU;
  const a   = 0.05 * Physics.G;
  const t   = travel_time(s, a);
  const spt = data.hours_per_turn * 3600;
  return FastMath.ceil(t / spt);
}

/** Estimates transit turns between two bodies at current positions. */
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
  issuer?:   t.body;
  status?:   number;
  deadline?: number;   // absolute game turn when mission expires
  standing?: number;   // standing change on completion
  reward?:   number;   // base credit reward
  turns?:    number;   // turns allowed to complete the mission
}

export interface SavedPassengers extends BaseSavedMission {
  orig: t.body;
  dest: t.body;
}

export interface SavedSmuggler extends BaseSavedMission {
  item:      t.resource;
  amt:       number;    // total units to deliver
  amt_left?: number;    // units still to deliver (partial progress)
}

export type SavedMission =
  | SavedPassengers
  | SavedSmuggler
;


/** Reconstructs a Mission subclass from saved state. */
export function restoreMission(opt: SavedMission, body: t.body): Mission {
  if ((<SavedPassengers>opt).dest) {
    opt.orig = opt.orig || body; // back-compat: old saves may lack orig
    return new Passengers( <SavedPassengers>opt );
  }

  if ((<SavedSmuggler>opt).item) {
    return new Smuggler( <SavedSmuggler>opt );
  }

  throw new Error('mission data does not match recognized mission type');
}


export abstract class Mission {
  status:    Status;
  deadline?: number;   // absolute game turn at expiry
  issuer:    t.body;

  readonly standing: number;
  readonly reward:   number;
  readonly turns:    number;

  constructor(opt: SavedMission) {
    this.status   = opt.status   || Status.Ready;
    this.standing = opt.standing || 0;
    this.reward   = opt.reward   || 0;
    this.turns    = opt.turns    || 0;
    this.issuer   = opt.issuer as t.body;
    this.deadline = opt.deadline;
  }

  abstract get title(): string;
  abstract get short_title(): string;
  abstract get description(): string;
  abstract get description_remaining(): string;
  abstract get mission_type(): string;
  abstract get can_accept_remotely(): boolean;

  get faction(): t.faction {
    return data.bodies[this.issuer].faction;
  }

  /**
   * Credit payout adjusted by the player's current standing with the issuing
   * faction. Standing bonus = standing / 1000 (e.g. +30 standing = +3%).
   * TODO: race condition - standing changes during the mission alter payout;
   * the price should be fixed at accept() time instead.
   */
  get price(): number {
    if (window.game && window.game.player) {
      const bonus = window.game.player.getStandingPriceAdjustment(this.faction);
      return FastMath.ceil(this.reward * (1 + bonus));
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

  get is_accepted(): boolean  { return this.status == Status.Accepted }
  get is_expired(): boolean   { return this.status != Status.Success && this.turns_left <= 0 }
  get is_complete(): boolean  { return this.status >= Status.Complete }

  get time_left(): string {
    const days  = util.csn(FastMath.floor(this.turns_left / data.turns_per_day));
    const hours = FastMath.floor((this.turns_left % data.turns_per_day) * data.hours_per_turn);
    if (hours) {
      return `${days} days, ${hours} hours`;
    } else {
      return `${days} days`;
    }
  }

  get time_total(): string {
    const days  = util.csn(FastMath.floor(this.turns / data.turns_per_day));
    const hours = FastMath.floor((this.turns_left % data.turns_per_day) * data.hours_per_turn);
    if (hours) {
      return `${days} days, ${hours} hours`;
    } else {
      return `${days} days`;
    }
  }

  get end_date(): string {
    const date = new Date(window.game.date);
    date.setTime(date.getTime() + (this.turns_left * data.hours_per_turn * 60 * 60 * 1000));
    return window.game.strdate(date);
  }

  /** Advances status forward. Throws if transition would go backwards. */
  setStatus(status: Status) {
    if (this.status >= status) {
      const info = JSON.stringify(this);
      throw new Error(`invalid state transition: ${this.status} to ${status}: ${info}`);
    }

    this.status = status;
  }

  /**
   * Accepts the mission: sets the deadline, removes it from the planet's
   * offered list, and installs a turn watcher that fires complete() on expiry.
   * Safe to call on a restore - if already Accepted, only re-registers the
   * player reference without resetting the deadline.
   */
  accept() {
    if (this.status < Status.Accepted) {
      window.game.planets[this.issuer].contractMgr.acceptMission(this);
      this.deadline = window.game.turns + this.turns;
    }

    this.status = Status.Accepted;
    window.game.player.acceptMission(this);

    watch('turn', () => {
      if (this.turns_left == 0) {
        console.log('mission over:', this.title);
        this.complete();
        return {complete: true};
      }

      return {complete: false};
    });
  }

  /** Called when the deadline is reached without success. Triggers cancel(). */
  complete() {
    if (this.status > Status.Complete) {
      return;
    }

    window.game.notify(`Contract expired: ${this.short_title}`);
    this.cancel();
  }

  /** Pays reward, grants standing, removes from player's contract list, saves. */
  finish() {
    this.setStatus(Status.Success);
    window.game.player.credit(this.price); // must happen first: price is affected by standing
    window.game.player.incStanding(this.faction, this.standing);
    window.game.player.completeMission(this);
    window.game.save_game();
    window.game.notify(`Contract completed: ${this.short_title}. ${util.csn(this.price)} credits have been deposited in your account.`);
  }

  /** Applies standing penalty and removes from player's contract list. */
  cancel() {
    this.setStatus(Status.Failure);
    window.game.player.decStanding(this.faction, this.standing / 2);
    window.game.player.completeMission(this);
    window.game.save_game();
    window.game.notify(`Contract cancelled: ${this.short_title}`);
  }
}


export class Passengers extends Mission {
  // NavComp instances cached by origin body to avoid recomputing per mission.
  static navcomps: { [key: string]: NavComp } = {};

  orig: t.body;
  dest: t.body;

  constructor(opt: SavedPassengers) {
    // Compute deadline and reward fresh each time (both new and restored missions),
    // since orbital positions change while the contract is on offer.
    // TODO: race condition - if planets have moved significantly since offer,
    // the deadline may become unreachable after several days.
    opt.issuer = opt.issuer || util.oneOf(t.bodies);
    opt.orig   = opt.orig   || opt.issuer;

    const params   = Passengers.mission_parameters(opt.orig, opt.dest);
    opt.turns    = params.turns;
    opt.reward   = params.reward;
    opt.standing = FastMath.ceil(Math.log10(params.reward));

    super(opt);

    this.dest = opt.dest;
    this.orig = opt.orig;
  }

  static mission_parameters(orig: t.body, dest: t.body) {
    if (!this.navcomps[orig]) {
      this.navcomps[orig] = new NavComp(window.game.player, orig, false, data.shipclass.schooner.tank, true);
    }

    const transit = this.navcomps[orig].getFastestTransitTo(dest);

    if (transit) {
      const fuzz  = util.fuzz(2, 0.5);
      const turns = FastMath.ceil(transit.turns * fuzz);
      const fuel  = window.game.player.ship.burnRate(transit.accel) * transit.turns;
      const rate  = util.fuzz(window.game.planets[orig].pricing.fuelPricePerTonne() * 3, 0.1);
      const cost  = FastMath.ceil(fuel * rate * fuzz);
      return {reward: cost, turns: turns};
    }
    else {
      throw new Error(`no transits possible between ${orig} and ${dest}`);
    }
  }

  get can_accept_remotely(): boolean { return false }
  get destination(): string          { return data.bodies[this.dest].name }
  get mission_type(): string         { return 'Passenger' }

  get title(): string {
    const reward = util.csn(this.price);
    return `Passengers to ${this.destination} in ${this.time_left} for ${reward}c`;
  }

  get short_title(): string {
    return `Passengers to ${this.destination}`;
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

    watch('arrived', (ev: Arrived) => {
      if (!this.is_expired && ev.detail.dest == this.dest) {
        console.log("passengers mission complete:", this.short_title);
        this.finish();
        return {complete: true};
      }

      return {complete: false};
    });
  }
}


export class Smuggler extends Mission {
  item:     t.resource;
  amt:      number;     // total units required
  amt_left: number;     // units still to deliver

  constructor(opt: SavedSmuggler) {
    // Deadline: 1.5x the time to cross a random 5-10 AU distance.
    // Reward: 1.5x base resource value for the full quantity.
    opt.turns    = FastMath.ceil(1.5 * estimateTransitTimeAU(util.getRandomInt(5, 10)));
    opt.reward   = FastMath.ceil(1.5 * resources[opt.item].value * opt.amt);
    opt.standing = FastMath.ceil(Math.log10(opt.reward));

    super(opt);

    this.item     = opt.item;
    this.amt      = opt.amt;
    this.amt_left = opt.amt_left || opt.amt;
  }

  get can_accept_remotely(): boolean { return true }
  get mission_type(): string         { return 'Smuggling' }

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

    const lines: string[] = [];

    if (data.resources[this.item].contraband) {
      lines.push(`We wish to acquire some ${this.item} in a quiet fashion. We heard that you were a person of tact who may be able to assist us.`);
    } else if (window.game.planets[this.issuer].hasTradeBan) {
      lines.push(`There is currently a ban in trade against our faction. As a result, we are in desparate need of ${this.item} as our supplies dwindle.`);
    }

    lines.push(
      `We are asking you to acquire ${this.amt} units of ${this.item} and return them here within ${this.time_total} by ${this.end_date}.`,
      `These goods will be quietly removed from your hold by our people when you arrive at the dock.`,
      `We will offer you ${reward} credits you for the completion of this contract in a timely fashion.`,
    );

    return lines.join(' ');
  }

  get description_remaining(): string {
    return [
      `You have ${this.amt_left} remaining units to deliver.`,
      `You have ${this.time_left} remaining to complete this contract.`,
    ].join(' ');
  }

  /**
   * Checks whether the mission can be partially or fully completed at the
   * current location. Called on arrival and on accept() in case the player
   * already has cargo in the hold.
   */
  checkMissionStatus() {
    if (!this.is_expired && !this.is_complete && window.game.locus == this.issuer) {
      const amt = Math.min(this.amt_left, window.game.player.ship.cargo.count(this.item));

      if (amt > 0) {
        this.amt_left -= amt;
        window.game.player.ship.unloadCargo(this.item, amt);
        window.game.planets[this.issuer].commerce.sell(this.item, amt);

        if (this.amt_left == 0) {
          window.game.notify(`All promised units of ${this.item} have been delivered.`);
          this.finish();
          return true;
        }
        else {
          window.game.notify(`You have delivered ${amt} units of ${this.item}. ${this.description_remaining}.`);
          return false;
        }
      }
    }

    return false;
  }

  accept() {
    super.accept();

    // Check immediately in case the player already has the goods.
    this.checkMissionStatus();

    watch('arrived', (_event: Arrived) => {
      if (this.checkMissionStatus()) {
        return {complete: true};
      }

      return {complete: false};
    });

    // Being caught smuggling automatically cancels the contract.
    watch('caughtSmuggling', (_event: CaughtSmuggling) => {
      if (!this.is_expired && !this.is_complete) {
        this.cancel();
        return {complete: true};
      }

      return {complete: false};
    });
  }
}
