import data  from './data';
import Store from './store';
import NPC   from './npc';

import { Person } from './person';

import * as util from './util';
import * as t from './common';
import * as FastMath from './fastmath';


// Shims for global browser objects
declare var window: { game: any; }
declare var console: any;


export type effect =
    'miss'
  | 'intercepted'
  | 'dodged'
  | 'hit'
  | 'destroyed'
  | 'flee'
  | 'chase'
  | 'surrender'
  | 'pass';

interface ActionResult {
  type:    string;
  source:  string;
  effect:  effect;
  hits?:   number;
  damage?: number;
  pct?:    number;
}

abstract class Action {
  abstract use(from: Combatant, to: Combatant): ActionResult;
  get isReady() { return true }
  nextRound(): void { };
}

export class Attack extends Action {
  public    opt:       t.OffensiveAddon;
  public    count:     number;
  protected _round:    number;
  protected _reload:   number;
  protected _magazine: number;

  constructor(opt: t.OffensiveAddon) {
    super();
    this.opt       = opt;
    this.count     = 1;
    this._round    = 0;
    this._reload   = 0;
    this._magazine = this.magazine;
  }

  get name()          { return this.opt.name }
  get rate()          { return this.count * this.opt.rate }
  get magazine()      { return this.count * this.opt.magazine }
  get accuracy()      { return this.opt.accuracy }
  get reload()        { return this.opt.reload }
  get damage()        { return this.opt.damage }
  get interceptable() { return this.opt.interceptable ? true : false }

  get isReloading() {
    return this._magazine === 0;
  }

  get isReady() {
    return this._magazine > 0;
  }

  get roundsUntilReload() {
    return this._reload;
  }

  get magazineRemaining() {
    return this._magazine;
  }

  addUnit() {
    this._magazine += this.magazine;
    ++this.count;
  }

  nextRound() {
    ++this._round;

    if (this._magazine === 0 && --this._reload === 0) {
      this._reload = 0;
      this._magazine = this.magazine;
    }
  }

  use(from: Combatant, to: Combatant): ActionResult {
    if (!this.isReady) {
      throw new Error('action.use: action is not ready');
    }

    let damage = 0;
    let hits   = 0;
    let rate   = this.rate     || 1;
    let acc    = this.accuracy || 1;
    let dmg    = this.damage   || 0;

    for (let i = 0; i < rate; ++i) {
      if (util.chance(acc)) { // TODO: modified by skill?
        damage += Math.max(0.1, util.getRandomNum(0, dmg));
        ++hits;
      }

      --this._magazine;

      if (this._magazine === 0) {
        this._reload = this.reload;
        break;
      }
    }

    const effect = !hits                        ? 'miss'
      : this.interceptable && to.tryIntercept() ? 'intercepted'
      : to.tryDodge()                           ? 'dodged'
      : to.ship.applyDamage(damage)             ? 'destroyed'
                                                : 'hit';

    const pct = effect === 'hit'
      ? damage / (to.fullHull + to.fullArmor) * 100
      : 0;

    return {
      type:   this.name,
      source: from.name,
      hits:   hits,
      damage: util.R(damage, 2),
      effect: effect,
      pct:    pct,
    };
  }
}

export class Flight extends Action {
  public name: string;

  constructor() {
    super();
    this.name = 'Flee';
  }

  use(from: Combatant, to: Combatant): ActionResult {
    const effect = from.tryFlight(to);

    return {
      type:   this.name,
      source: from.name,
      effect: effect ? 'flee' : 'chase',
    };
  }
}

export class Surrender extends Action {
  public name: string;

  constructor() {
    super();
    this.name = 'Surrender';
  }

  use(from: Combatant, to: Combatant): ActionResult {
    return {
      type:   this.name,
      source: from.name,
      effect: 'surrender',
    };
  }
}

export class Pass extends Action {
  public name: string;

  constructor() {
    super();
    this.name = 'Pass';
  }

  use(from: Combatant, to: Combatant): ActionResult {
    return {
      type:   this.name,
      source: from.name,
      effect: 'pass',
    };
  }
}


export class Combatant {
  combatant: Person;
  flight:    Flight;
  surrender: Surrender;
  pass:      Pass;
  _actions:  { [key: string]: Attack };

  constructor(combatant: Person) {
    this.combatant = combatant;
    this.flight    = new Flight;
    this.surrender = new Surrender;
    this.pass      = new Pass;
    this._actions  = {};

    for (const addon of this.ship.addons) {
      const info = data.addons[addon];

      if (t.isOffensive(info)) {
        if (this._actions[addon]) {
          this._actions[addon].addUnit();
        } else {
          this._actions[addon] = new Attack(info);
        }
      }
    }
  }

  get name()        { return this.combatant.name }
  get faction()     { return this.combatant.faction }
  get ship()        { return this.combatant.ship }
  get hull()        { return this.ship.hull }
  get armor()       { return this.ship.armor }
  get fullHull()    { return this.ship.fullHull }
  get fullArmor()   { return this.ship.fullArmor }
  get pctHull()     { return this.ship.hull  / this.ship.fullHull }
  get pctArmor()    { return this.ship.armor / this.ship.fullArmor }
  get rawDodge()    { return this.ship.rawDodge }
  get isDestroyed() { return this.ship.isDestroyed }
  get ready()       { return this.actions.filter(a => a.isReady) }
  get attacks()     { return Object.values(this._actions).filter(a => a.isReady) }
  get intercept()   { return Math.max(0, this.ship.intercept - this.ship.damageMalus()) }

  get dodge() {
    return Math.max(0, this.ship.dodge - this.ship.damageMalus());
  }

  get actions(): Action[] {
    return [...Object.values(this._actions), this.flight, this.surrender, this.pass];
  };

  /*
   * The chance of flight is inversely proportional to the percentage of
   * armor and hull remaining.
   */
  get flightRisk() {
    return (1 - this.pctHull) / 2;
  }

  nextRound() {
    for (const action of this.actions) {
      action.nextRound();
    }
  }

  tryIntercept() { return util.chance(this.intercept) }
  tryDodge()     { return util.chance(this.dodge) }

  /*
   * Compares this combatant's dodge, which takes into account power/mass
   * ratio and defensive gear which enhances dodge, like ecm, against the raw
   * dodge abilit of an opponent (which does not include gear, since ecm
   * would not help the chaser).
   *
   * TODO adjust based on pilots' skill levels
   */
  tryFlight(opponent: Combatant) {
    const chance = this.dodge / opponent.rawDodge / 5;
    return util.chance(chance);
  }
}


interface CombatOpt {
  opponent: NPC;
}

interface LogEntry {
  round:     number;
  player?:   ActionResult;
  opponent?: ActionResult;
}

export class Combat {
  player:      Combatant;
  opponent:    Combatant;
  initiative:  string;

  round:       number = 1;
  log:         LogEntry[] = [];
  escaped:     false | string;
  surrendered: false | string;
  _salvage?:   Store;

  constructor(opt: CombatOpt) {
    this.player      = new Combatant(window.game.player);
    this.opponent    = new Combatant(opt.opponent);
    this.initiative  = util.oneOf(['player', 'opponent']);
    this.round       = 1;
    this.log         = [];
    this.escaped     = false;
    this.surrendered = false;
  }

  get isOver() {
    return this.escaped
        || this.surrendered
        || this.player.isDestroyed
        || this.opponent.isDestroyed;
  }

  get playerSurrendered() {
    return this.surrendered == this.player.name;
  }

  get opponentSurrendered() {
    return this.surrendered == this.opponent.name;
  }

  get playerDestroyed() {
    return this.player.isDestroyed;
  }

  get opponentDestroyed() {
    return this.opponent.isDestroyed;
  }

  get salvage() {
    if (this.opponent.isDestroyed || this.opponentSurrendered) {
      if (!this._salvage) {
        this._salvage = new Store;

        for (const item of this.opponent.ship.cargo.keys()) {
          let amount = this.opponent.ship.cargo.count(item);

          // Randomize the remaining cargo amounts that survived the encounter
          if (!this.surrendered) {
            amount = util.getRandomInt(0, this.opponent.ship.cargo.count(item));
          }

          this._salvage.inc(item, amount);
        }
      }

      return this._salvage;
    }

    return;
  }

  get currentRound() {
    return FastMath.ceil(this.round / 2);
  }

  get isPlayerTurn() {
    if (this.initiative === 'player') {
      return (this.round + 2) % 2 !== 0;
    } else {
      return (this.round + 2) % 2 === 0;
    }
  }

  addLogEntry(entry: ActionResult) {
    const round = this.currentRound;
    if (this.log.length === 0 || this.log[0].round !== round) {
      this.log.unshift({
        round:    round,
        player:   undefined,
        opponent: undefined,
      });
    }

    this.log[0][this.isPlayerTurn ? 'player' : 'opponent'] = entry;
  }

  start() {
    if (!this.isPlayerTurn) {
      this.opponentAction();
    }
  }

  playerAction(action: Action) {
    if (!this.isPlayerTurn) throw new Error("It is not the player's turn");
    this.player.nextRound();
    this.doAction(action, this.player, this.opponent);
  }

  opponentAction() {
    if (this.isPlayerTurn) throw new Error("It is not the opponents's turn");
    this.opponent.nextRound();

    const risk = this.opponent.flightRisk;
    const chance = util.chance(risk);

    let action;

    if (chance) {
      if (this.opponent.pctHull < 25) {
        action = this.opponent.surrender;
      } else {
        action = this.opponent.flight;
      }
    }
    else {
      action = util.oneOf(this.opponent.attacks);
    }

    this.doAction(action, this.opponent, this.player);
  }

  doAction(action: Action, from: Combatant, to: Combatant) {
    const result = action.use(from, to);

    if (result.effect === 'flee') {
      this.escaped = from.name;
    } else if (result.effect === 'surrender') {
      this.surrendered = from.name;
    }

    this.addLogEntry(result);
    ++this.round;
  }
}
