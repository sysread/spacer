/*
 * TODO
 *  * new conflict types
 *  * Trade ban:
 *    * notifications when player violates trade ban
 *    * standing loss when player violates trade ban
 */

import data from './data';

import * as t from './common';
import * as util from './util';


declare var window: {
  game: any;
  addEventListener: (ev: string, cb: Function) => void;
}


interface Production  { production: t.ResourceCounter }
interface Consumption { consumption: t.ResourceCounter }
interface Patrol      { patrol_rate: number, against?: t.faction }
interface Piracy      { piracy_rate: number, against?: t.faction }
interface Tariff      { tariff: true, item: t.resource, rate: number }
interface TradeBan    { trade_ban: true }

type Effect =
  | Production
  | Consumption
  | Patrol
  | Piracy
  | Tariff
  | TradeBan
;

const isProductionEffect  = (e: Effect): e is Production  => (<Production>e).production   != undefined;
const isConsumptionEffect = (e: Effect): e is Consumption => (<Consumption>e).consumption != undefined;
const isPatrolEffect      = (e: Effect): e is Patrol      => (<Patrol>e).patrol_rate      != undefined;
const isPiracyEffect      = (e: Effect): e is Piracy      => (<Piracy>e).piracy_rate      != undefined;
const isTradeBan          = (e: Effect): e is TradeBan    => (<TradeBan>e).trade_ban      != undefined;
const isTariff            = (e: Effect): e is Tariff      => (<Tariff>e).tariff           != undefined;


interface ItemTrigger { item: t.resource; chance: number }
interface Shortage extends ItemTrigger { shortage: true }
interface Surplus extends ItemTrigger { surplus: true }
interface Random { random: true, chance: number }

type Trigger =
  | Shortage
  | Surplus
  | Random
;

const isShortageTrigger = (tr: Trigger): tr is Shortage => (<Shortage>tr).shortage;
const isSurplusTrigger  = (tr: Trigger): tr is Surplus  => (<Surplus>tr).surplus;
const isRandomTrigger   = (tr: Trigger): tr is Random   => (<Random>tr).random;


interface Duration {
  starts: number;
  ends:   number;
}


abstract class Condition {
  name:      string;
  duration?: Duration;

  constructor(name: string, init: any) {
    this.name     = name;
    this.duration = init.duration;

    if (this.is_started && !this.is_over) {
      this.install_event_watchers();
    }
  }

  abstract get key(): string;
  abstract chance(): boolean;
  abstract install_event_watchers(): void;

  get is_started() {
    return this.duration && this.duration.starts <= window.game.turns;
  }

  get is_over() {
    return this.duration && this.duration.ends <= window.game.turns;
  }

  start(turns: number) {
    this.duration = {
      starts: window.game.turns,
      ends:   window.game.turns + turns,
    };

    this.install_event_watchers();
  }
}


export abstract class Conflict extends Condition {
  proponent: t.faction;
  target:    t.faction;

  constructor(name: string, init: any) {
    super(name, init);
    this.proponent = init.proponent;
    this.target = init.target;
  }

  get key(): string {
    return [this.name, this.proponent, this.target].join('_');
  }
}


export class Embargo extends Conflict {
  constructor(init: any) {
    super('trade ban', init);
  }

  chance(): boolean {
    if (this.proponent == this.target)
      return false;

    const standing = data.factions[this.proponent].standing[this.target] || 0;
    let chance = 0;

    if (standing < 0) {
      chance = Math.abs(standing) / 2000;
    } else if (standing > 0) {
      chance = (Math.log(100) - Math.log(standing)) / 2000;
    } else {
      chance = 0.00025;
    }

    return util.chance(chance);
  }

  install_event_watchers() {
    window.addEventListener("itemsBought", (event: CustomEvent) => {
      const {body, item, count} = event.detail;
      this.violation(body, item, count);
    });

    /*window.addEventListener("itemsSold", (event: CustomEvent) => {
      const {body, item, count} = event.detail;
      this.violation(body, item, count);
    });*/
  }

  violation(body: t.body, item: t.resource, count: number) {
    if (!this.is_started || this.is_over) return true;
    if (this.target != data.bodies[body].faction) return false;

    let loss = count * 2;

    if (item == 'weapons')
      loss *= 2;

    window.game.player.decStanding(this.proponent, loss);
    window.game.notify(`You are in violation of ${this.proponent}'s trade ban against ${this.target}. Your standing has decreased by ${loss}.`);

    return false;
  }
}
