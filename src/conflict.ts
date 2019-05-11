import data from './data';

import { factions } from './faction';
import { watch, CaughtSmuggling } from "./events";

import * as t from './common';
import * as util from './util';


declare var window: {
  game: any;
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


export class Blockade extends Conflict {
  constructor(init: any) {
    super('blockade', init);
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
    watch("caughtSmuggling", (ev: CaughtSmuggling) => {
      const {faction, found} = ev.detail;
      this.violation(faction, found);
      return {complete: true};
    });
  }

  violation(faction_name: t.faction, found: t.ResourceCounter) {
    if (!this.is_started || this.is_over)
      return true;

    if (this.target != faction_name)
      return false;

    const faction = factions[faction_name];
    let loss = 0;
    let fine = 0;

    for (let item of Object.keys(found) as t.resource[]) {
      let count = found[item] || 0;
      loss += (item == 'weapons') ? count * 4 : count * 2;
      fine += count * faction.inspectionFine(window.game.player);
      window.game.player.ship.unloadCargo(item, count);
    }

    window.game.player.debit(fine);
    window.game.player.decStanding(this.proponent, loss);
    window.game.notify(`You are in violation of ${this.proponent}'s blockade against ${this.target}. You have been fined ${fine} credits and your standing decreased by ${loss}.`);

    return false;
  }
}
