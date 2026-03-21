/**
 * game - central game singleton: state, clock, save/load, and orchestration.
 *
 * The Game class owns all top-level mutable game state and is the coordination
 * point for the turn clock, transit lifecycle, conflict management, and
 * notification system. It is instantiated once at module load, attached to
 * window.game, initialized from localStorage, and exported as the default.
 *
 * ## State
 *
 *   turns         - total game turns elapsed since the start date
 *   date          - in-game Date object, advanced by hours_per_turn per turn
 *   locus         - the player's current body (null until the game starts)
 *   player        - the player Person object (null until init/new_game)
 *   planets       - map of body -> Planet, shared module-level variable
 *   agents        - array of NPC Agent objects (max_agents count)
 *   conflicts     - map of conflict key -> Conflict (blockades)
 *   transit_plan  - active TransitPlan while in transit (undefined otherwise)
 *   frozen        - true while the game clock is paused during transit
 *   options       - display options (hide map background, orbit paths, etc.)
 *
 * ## Turn clock
 *
 *   turn(n)       - advances n turns; saves unless no_save is true
 *   freeze()      - pauses the clock at the start of transit
 *   unfreeze()    - resumes after transit; replays turns in batches of 1 day
 *                   using setInterval to give the UI time to update between batches
 *
 *   During transit (frozen=true), turn() skips conflict processing and event
 *   dispatch. The system orbit cache is still reset each turn so that position
 *   calculations remain accurate during the transit visualization.
 *
 * ## Conflict system
 *
 *   Every 3 days, start_conflicts() rolls for new Blockades between all faction
 *   pairs. At most 2 conflicts are active at once. Conflicts are checked and
 *   removed in finish_conflicts() each turn.
 *
 * ## Save/load
 *
 *   save_game() serializes turns, locus, player, agents, planets, conflicts,
 *   and options to localStorage as JSON.
 *
 *   init() restores from localStorage. On parse error, falls back to a fresh
 *   game state. After loading, triggers GameLoaded and calls arrive() to fire
 *   the Arrived event for the current locus.
 *
 * ## Notifications
 *
 *   notify(msg, long) queues a [message, dismiss_turns] tuple.
 *   Notifications are suppressed during the initial grace period (is_starting).
 *   Dismiss timers are NOTIFY_SHORT (3) or NOTIFY_LONG (8) turns.
 */

import data from './data';
import system from './system';

import { TransitPlan } from './transitplan';
import { Person, SavedPerson } from './person';
import { Planet, SavedPlanet, isImportTask } from './planet';
import { Agent, SavedAgent } from './agent';
import { Conflict, Blockade } from './conflict';
import { trigger, GameLoaded, GameTurn, Arrived } from "./events";

import * as t from './common';
import * as util from './util';
import * as FastMath from './fastmath';


// Shims for global browser objects
interface localStorage {
  getItem(key: string): string;
  setItem(key: string, val: string): void;
  removeItem(key: string): void;
}

declare var window: {
  game: Game;
  localStorage: localStorage;
}

declare var console: any;


interface Options {
  hideMapBackground?: boolean;
  hidePatrolRadius?:  boolean;
  hideOrbitPaths?:    boolean;
};

const DefaultOptions = {
  hideOrbitPaths: true,
}


// Structure used by trade_routes() to summarize inter-planet import tasks.
interface ImportReport {
  [key: string]: {
    [key: string /* to */]: {
      [key: string /* from */]: Array<{
        hours:  number;
        amount: number;
      }>
    }
  };
};

type notification = [string, number];

// Planets are kept at module scope (not on the instance) so that the `planets`
// getter can return a stable reference that Vue components can observe.
const planets: {[key: string]: Planet} = {};

class Game {
  static readonly NOTIFY_SHORT = 3;  // turns before short notification auto-dismisses
  static readonly NOTIFY_LONG  = 8;  // turns before long notification auto-dismisses

  turns:         number = 0;
  date:          Date = new Date(data.start_date);
  _player:       Person | null = null;
  locus:         t.body | null = null;
  page:          string = 'summary';
  frozen:        boolean = false;
  transit_plan?: TransitPlan;
  agents:        Agent[] = [];
  conflicts:     {[key: string]: Conflict} = {};
  notifications: notification[] = [];
  options:       Options = DefaultOptions;

  constructor() {
    this.reset_date();
  }

  /**
   * Loads game state from localStorage. On success, restores all objects and
   * triggers GameLoaded. On parse/initialization error, resets to a fresh
   * (unstarted) state. Called once at module load time.
   */
  init() {
    const saved = window.localStorage.getItem('game');
    const init  = saved == null ? null : JSON.parse(saved);

    if (init) {
      try {
        this.turns   = FastMath.ceil(init.turns || 0);
        this.locus   = init.locus;
        this.options = init.options || DefaultOptions;
        this._player = new Person(init.player);

        this.date.setHours(this.date.getHours() + (this.turns * data.hours_per_turn));
        console.log('setting system date', this.date);

        this.build_planets(init.planets);
        this.build_agents(init.agents);
        this.build_conflicts(init.conflicts);
      }
      catch (e) {
        console.warn('initialization error:', e);
        this.turns   = 0;
        this.locus   = null;
        this.options = DefaultOptions;
        this._player = null;
        this.build_planets();
        this.build_agents();
        this.build_conflicts();
      }
    }
    else {
      this.options = DefaultOptions;
      this.build_planets();
      this.build_agents();
    }

    trigger(new GameLoaded);
  }

  get planets() {
    return planets;
  }

  get player() {
    if (!this._player) {
      throw new Error('player is not available before the game has started');
    }

    return this._player;
  }

  get here() {
    if (!this.locus) {
      throw new Error('here is not available before the game has started');
    }

    return this.planets[this.locus];
  }

  get is_frozen() {
    return this.frozen;
  }


  start_date() {
    const date = new Date(data.start_date);
    date.setDate(date.getDate() - data.initial_days);
    return date;
  }

  reset_date() {
    this.date = this.start_date();
    console.log('resetting system date', this.date);
  }

  /** Returns the in-game date as "YYYY-MM-DD". */
  strdate(date?: Date) {
    date = date || this.date;
    let y = date.getFullYear();
    let m = date.getMonth() + 1;
    let d = date.getDate();
    return [y, m < 10 ? `0${m}` : m, d < 10 ? `0${d}` : d].join('-');
  }

  /** Returns the in-game date as "YYYY.MM.DD" for the status bar display. */
  status_date(date?: Date) {
    return this.strdate(date).replace(/-/g, '.');
  }

  build_planets(init?: {[key: string]: SavedPlanet}) {
    for (const body of t.bodies) {
      if (init && init[body]) {
        planets[body] = new Planet(body, init[body]);
      } else {
        planets[body] = new Planet(body);
      }
    }
  }

  /**
   * Builds the agent roster. If a saved roster exists with the expected count,
   * it is restored. Otherwise, a fresh set is created: one agent per faction,
   * homed at the faction capital.
   */
  build_agents(init?: any[]) {
    this.agents = [];

    if (init && init.length > 0 && init.length == data.max_agents) {
      for (const opt of init) {
        this.agents.push(new Agent(opt));
      }
    }
    else {
      for (let i = 0; i < data.max_agents; ++i) {
        const faction = util.oneOf(t.factions);
        const body    = data.factions[faction].capital;

        const agent = new Agent({
          name:         'Merchant from ' + data.bodies[body].name,
          ship:         { type: 'schooner' },
          faction_name: faction,
          home:         body,
          money:        1000,
          standing:     data.factions[faction].standing,
        });

        this.agents.push(agent);
      }
    }
  }

  build_conflicts(init?: any) {
    this.conflicts = {};

    if (init != undefined) {
      for (const c of Object.keys(init)) {
        this.conflicts[c] = new Blockade(init[c]);
      }
    }
  }

  new_game(player: Person, home: t.body) {
    window.localStorage.removeItem('game');
    this._player = player;
    this.locus   = home;
    this.turns   = 0;
    this.page    = 'summary';
    this.reset_date();
    this.build_planets();
    this.build_agents();
    this.build_conflicts();
    this.save_game();
  }

  save_game() {
    const data = {
      turns:     this.turns,
      locus:     this.locus,
      player:    this._player,
      agents:    this.agents,
      planets:   this.planets,
      conflicts: this.conflicts,
      options:   this.options,
    };

    window.localStorage.setItem('game', JSON.stringify(data));
  }

  delete_game() {
    window.localStorage.removeItem('game');
  }

  /** True during the initial grace period (turns < initial_days * turns_per_day). */
  get is_starting() {
    return this.turns < (data.initial_days * data.turns_per_day);
  }

  /** True while the player is in transit (frozen and a transit_plan is set). */
  get in_transit() {
    return this.frozen
        && this.transit_plan != undefined;
  }


  set_turns(turn: number) {
    this.turns = FastMath.ceil(turn);
    this.date.setHours(this.date.getHours() + data.hours_per_turn);
  }

  inc_turns(count: number) { this.set_turns(this.turns + count) }
  dec_turns(count: number) { this.set_turns(this.turns - count) }

  /**
   * Advances the game clock by n turns. Each turn:
   *   - If in transit: resets the orbit cache (positions change during flight)
   *   - Otherwise: checks for new/expired conflicts; fires GameTurn event
   * Saves after all turns unless no_save is true.
   */
  turn(n=1, no_save=false) {
    n = FastMath.ceil(n); // guard against fractional turns from caller bugs

    for (let i = 0; i < n; ++i) {
      this.inc_turns(1);

      if (this.in_transit) {
        system.reset_orbit_cache();
      } else {
        if (this.turns % (data.turns_per_day * 3) == 0) {
          this.start_conflicts();
        }

        this.finish_conflicts();
        trigger(new GameTurn({turn: this.turns}));
      }
    }

    if (!no_save) {
      this.save_game();
    }
  }


  /** Pauses the game clock at the start of a transit. */
  freeze() {
    this.frozen = true;
  }

  /**
   * Resumes after a transit completes.
   * Rewinds the turn counter to before the transit, resets orbit caches,
   * then replays the transit turns in day-sized batches via setInterval so
   * the UI can update between each batch. This gives agents and planets a
   * chance to process time passing during the flight.
   */
  unfreeze() {
    if (this.frozen) {
      this.frozen = false;

      if (this.transit_plan) {
        this.dec_turns(this.transit_plan.turns);
        system.reset_orbit_cache();

        const batch = 24 / data.hours_per_turn;
        let left    = this.transit_plan.turns;

        let intvl = setInterval(() => {
          const todo = Math.min(batch, left);
          this.turn(todo);
          left -= todo;

          if (left <= 0) {
            clearInterval(intvl);
          }
        });
      }
    }
  }

  set_transit_plan(transit_plan: TransitPlan) {
    this.transit_plan = transit_plan;
  }

  /**
   * Called when the player arrives at a destination (after transit or on load).
   * Sets locus from the transit_plan destination, clears the plan, then fires
   * the Arrived event. Also called at startup with no transit_plan to fire
   * Arrived for the initial locus.
   */
  arrive() {
    if (this.transit_plan) {
      console.log('arrived:', this.transit_plan.dest);
      this.locus        = this.transit_plan.dest;
      this.transit_plan = undefined;
    }

    if (this.locus) {
      trigger(new Arrived({dest: this.locus}));
    }
  }


  /**
   * Returns a summary of all active inter-planet import tasks, nested by
   * resource -> destination -> source. Used by the debug panel.
   */
  trade_routes(): ImportReport {
    const trade: ImportReport = {};

    for (const planet of Object.values(this.planets)) {
      for (const task of planet.queue) {
        if (isImportTask(task)) {
          const item = task.item as t.resource;
          const to   = task.to   as t.body;
          const from = task.from as t.body;

          if (trade[item] == null)           trade[item] = {};
          if (trade[item][to] == null)       trade[item][to] = {};
          if (trade[item][to][from] == null) trade[item][to][from] = [];

          trade[item][to][from].push({
            hours:  task.turns * data.hours_per_turn,
            amount: task.count,
          });
        }
      }
    }

    return trade;
  }


  /**
   * Queues a notification for the UI. Suppressed during the initial grace
   * period so that economy startup activity doesn't spam the player.
   * long=true uses a longer auto-dismiss timer.
   */
  notify(msg: string, long: boolean = false) {
    if (!this.is_starting) {
      const dismiss = long ? Game.NOTIFY_LONG : Game.NOTIFY_SHORT;
      this.notifications.push([msg, dismiss]);
    }
  }

  dismiss(msg: string) {
    this.notifications = this.notifications.filter(n => n[0] != msg);
  }


  /**
   * Attempts to start new Blockade conflicts between faction pairs.
   * Capped at 2 simultaneous conflicts to avoid overwhelming the economy.
   * TODO: notify players when a new conflict starts.
   */
  start_conflicts() {
    if (Object.keys(this.conflicts).length >= 2)
      return;

    for (const pro of t.factions) {
      for (const target of t.factions) {
        const blockade = new Blockade({proponent: pro, target: target});

        if (this.conflicts[ blockade.key ] == undefined && blockade.chance()) {
          this.conflicts[ blockade.key ] = blockade;

          const turns = FastMath.ceil(util.getRandomNum(data.turns_per_day * 7, data.turns_per_day * 60));
          blockade.start(turns);

          this.notify(`${pro} has declared a ${blockade.name} against ${target}`);
        }
      }
    }
  }

  finish_conflicts() {
    for (const k of Object.keys(this.conflicts)) {
      if (this.conflicts[k].is_over) {
        delete this.conflicts[k];
      }
    }
  }

  /** Filters active conflicts by optional target, proponent, and/or name. */
  get_conflicts(opt?: {
    target?:    t.faction;
    proponent?: t.faction;
    name?:      string;
  }): Conflict[] {
    return Object.values(this.conflicts).filter(c => {
      if (opt) {
        if (opt.target    && c.target    != opt.target)    return false;
        if (opt.proponent && c.proponent != opt.proponent) return false;
        if (opt.name      && c.name      != opt.name)      return false;
      }

      return true;
    });
  }
};

console.log('Spacer is starting');

const game: Game = new Game;

window.game = game;
window.game.init();
window.game.arrive();

export default game;
