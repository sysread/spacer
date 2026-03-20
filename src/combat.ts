/**
 * combat - turn-based ship combat system.
 *
 * Combat is a sequence of alternating turns between the player and one NPC
 * opponent. Initiative (who goes first) is randomized at the start. Each
 * combatant chooses an action per turn; the opponent's AI chooses based on
 * flight risk and available weapons.
 *
 * Action types:
 *   Attack    - fires a weapon; handles magazine, reload, accuracy, intercept, dodge
 *   Flight    - attempt to flee; success depends on dodge vs opponent's raw dodge
 *   Surrender - combatant yields; opponent gets access to salvage
 *   Pass      - do nothing (placeholder; currently unused by player UI)
 *
 * Damage model:
 *   - Attacks roll accuracy per shot, then check intercept (PDS) and dodge
 *   - Damage is applied to armor first, then hull
 *   - isDestroyed is true when both armor and hull reach 0
 *   - damageMalus() reduces effective intercept and dodge as the ship is damaged
 *
 * Combat.log records both actions per round as LogEntry objects, displayed
 * by the combat UI component after each full round completes.
 *
 * Salvage:
 *   When the opponent is destroyed or surrenders, a random portion of their
 *   cargo survives (randomized if destroyed, full amount if surrendered).
 */

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


/** All possible outcomes of a single combat action. */
export type effect =
    'miss'
  | 'intercepted'  // torpedo shot down by PDS
  | 'dodged'       // attack evaded
  | 'hit'          // damage applied
  | 'destroyed'    // target destroyed
  | 'flee'         // flight attempt succeeded
  | 'chase'        // flight attempt failed (opponent is in pursuit)
  | 'surrender'    // combatant yields
  | 'pass'         // no action taken
;

interface ActionResult {
  type:    string;   // weapon or action name
  source:  string;   // name of the combatant who acted
  effect:  effect;
  hits?:   number;
  damage?: number;
  pct?:    number;   // damage as % of full combined hull+armor
}

abstract class Action {
  abstract use(from: Combatant, to: Combatant): ActionResult;
  get isReady() { return true }
  nextRound(): void { };
}

/**
 * A weapon attack action. Tracks magazine and reload state across rounds.
 * Multiple installed copies of the same weapon addon are consolidated into
 * a single Attack with count > 1, multiplying rate and magazine.
 */
export class Attack extends Action {
  public    opt:       t.OffensiveAddon;
  public    count:     number;   // number of this weapon installed
  protected _round:    number;
  protected _reload:   number;   // turns remaining until magazine is refilled
  protected _magazine: number;   // shots remaining before reload

  constructor(opt: t.OffensiveAddon) {
    super();
    this.opt       = opt;
    this.count     = 1;
    this._round    = 0;
    this._reload   = 0;
    this._magazine = this.magazine;
  }

  get name()          { return this.opt.name }
  get rate()          { return this.count * this.opt.rate }       // shots per firing action
  get magazine()      { return this.count * this.opt.magazine }   // total shots before reload
  get accuracy()      { return this.opt.accuracy }
  get reload()        { return this.opt.reload }                  // turns to reload
  get damage()        { return this.opt.damage }
  get interceptable() { return this.opt.interceptable ? true : false }

  get isReloading() { return this._magazine === 0 }
  get isReady()     { return this._magazine > 0 }

  get roundsUntilReload() { return this._reload }
  get magazineRemaining() { return this._magazine }

  /** Called when a second copy of the same addon is installed. */
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
      if (util.chance(acc)) { // TODO: modified by pilot skill?
        damage += Math.max(0.1, util.getRandomNum(0, dmg));
        ++hits;
      }

      --this._magazine;

      if (this._magazine === 0) {
        this._reload = this.reload;
        break;
      }
    }

    // Resolution order: miss -> intercepted -> dodged -> hit/destroyed
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

/** Attempt to disengage from combat. Success depends on relative dodge. */
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

/** Yield combat. The surrendering combatant's cargo becomes salvage. */
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

/** Take no action this turn. */
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


/**
 * Wraps a Person for combat, aggregating their ship's weapons into Attack
 * actions and computing derived combat stats (dodge, intercept, flight risk).
 */
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

    // Consolidate duplicate weapons: multiple copies of the same addon share
    // one Attack instance with count > 1.
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

  /** Intercept chance, reduced by hull damage. */
  get intercept() { return Math.max(0, this.ship.intercept - this.ship.damageMalus()) }

  /** Dodge chance, reduced by hull damage. */
  get dodge() { return Math.max(0, this.ship.dodge - this.ship.damageMalus()) }

  get actions(): Action[] {
    return [...Object.values(this._actions), this.flight, this.surrender, this.pass];
  };

  /**
   * Probability that this combatant attempts flight, based on hull damage.
   * A fully intact ship never attempts to flee; a nearly destroyed ship almost
   * always will.
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

  /**
   * Attempts to disengage from the opponent.
   * Compares this combatant's full dodge (including ECM gear) against the
   * opponent's raw dodge (gear doesn't help a chaser). Divided by 5 to keep
   * flight success rates reasonably low.
   *
   * TODO: adjust based on pilot skill
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

/**
 * Manages a complete combat encounter between the player and one NPC opponent.
 *
 * Rounds alternate between player and opponent. The internal round counter
 * increments each half-round; currentRound shows the full-round number.
 * isPlayerTurn is determined by initiative and the current round parity.
 *
 * The encounter ends when: someone escapes, someone surrenders, or either
 * ship is destroyed.
 */
export class Combat {
  player:      Combatant;
  opponent:    Combatant;
  initiative:  string;   // 'player' or 'opponent'

  round:       number = 1;
  log:         LogEntry[] = [];
  escaped:     false | string;     // name of combatant who fled, or false
  surrendered: false | string;     // name of combatant who surrendered, or false
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

  get playerSurrendered()   { return this.surrendered == this.player.name }
  get opponentSurrendered() { return this.surrendered == this.opponent.name }
  get playerDestroyed()     { return this.player.isDestroyed }
  get opponentDestroyed()   { return this.opponent.isDestroyed }

  /**
   * Returns the salvageable cargo from a destroyed or surrendered opponent.
   * If the opponent was destroyed, surviving cargo is randomized (some is lost).
   * If the opponent surrendered, their full cargo is available.
   * Cached after first access.
   */
  get salvage() {
    if (this.opponent.isDestroyed || this.opponentSurrendered) {
      if (!this._salvage) {
        this._salvage = new Store;

        for (const item of this.opponent.ship.cargo.keys()) {
          let amount = this.opponent.ship.cargo.count(item);

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

  /** The current full-round number (each full round = 2 half-rounds). */
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

  /** If the opponent has initiative, fires their first action before the player acts. */
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

  /**
   * NPC AI: flees or surrenders based on flight risk, otherwise attacks.
   * Surrenders instead of fleeing when hull is below 25%.
   */
  opponentAction() {
    if (this.isPlayerTurn) throw new Error("It is not the opponents's turn");
    this.opponent.nextRound();

    const risk  = this.opponent.flightRisk;
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
