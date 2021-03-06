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

const HourInMs = 1000 * 60 * 60;
const TurnInMs = HourInMs * data.hours_per_turn;

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

const planets: {[key: string]: Planet} = {};

class Game {
  static readonly NOTIFY_SHORT = 3;
  static readonly NOTIFY_LONG  = 8;

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
        this.turns = 0;
        this.locus = null;
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

  strdate(date?: Date) {
    date = date || this.date;
    let y = date.getFullYear();
    let m = date.getMonth() + 1;
    let d = date.getDate();
    return [y, m < 10 ? `0${m}` : m, d < 10 ? `0${d}` : d].join('-');
  }

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
        const body = data.factions[faction].capital;

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
    this.locus = home;
    this.turns = 0;
    this.page = 'summary';
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

  get is_starting() {
    return this.turns < (data.initial_days * data.turns_per_day);
  }

  get in_transit() {
    return this.frozen
        && this.transit_plan != undefined;
  }


  set_turns(turn: number) {
    this.turns = FastMath.ceil(turn);
    this.date.setHours(this.date.getHours() + data.hours_per_turn);
  }

  inc_turns(count: number) {
    this.set_turns(this.turns + count);
  }

  dec_turns(count: number) {
    this.set_turns(this.turns - count);
  }

  turn(n=1, no_save=false) {
    n = FastMath.ceil(n); // backstop against bugs resulting in fractional turns

    for (let i = 0; i < n; ++i) {
      this.inc_turns(1);

      if (this.in_transit) {
        system.reset_orbit_cache();
      } else {
        // Start new conflicts every 3 days
        if (this.turns % (data.turns_per_day * 3) == 0) {
          this.start_conflicts();
        }

        // Remove finished conflicts
        this.finish_conflicts();

        // Dispatch events
        trigger(new GameTurn({turn: this.turns}));
      }
    }

    if (!no_save) {
      this.save_game();
    }
  }


  freeze() {
    this.frozen = true;
  }

  unfreeze() {
    if (this.frozen) {
      this.frozen = false;

      if (this.transit_plan) {
        // set back the turns counter
        this.dec_turns(this.transit_plan.turns);

        // reset the system orbital cache to pick up the positions and orbits
        // at the new game date
        system.reset_orbit_cache();

        // replay turns in unfrozen state, one day at a time
        const batch = 24 / data.hours_per_turn;
        let left = this.transit_plan.turns;

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

  arrive() {
    if (this.transit_plan) {
      console.log('arrived:', this.transit_plan.dest);
      this.locus = this.transit_plan.dest;
      this.transit_plan = undefined;
    }

    if (this.locus) { // game has started
      trigger(new Arrived({dest: this.locus}));
    }
  }


  trade_routes(): ImportReport {
    const trade: ImportReport = {};

    for (const planet of Object.values(this.planets)) {
      for (const task of planet.queue) {
        if (isImportTask(task)) {
          const item = task.item as t.resource;
          const to   = task.to   as t.body;
          const from = task.from as t.body;

          if (trade[item] == null) {
            trade[item] = {};
          }

          if (trade[item][to] == null) {
            trade[item][to] = {};
          }

          if (trade[item][to][from] == null) {
            trade[item][to][from] = [];
          }

          trade[item][to][from].push({
            hours:  task.turns * data.hours_per_turn,
            amount: task.count,
          });
        }
      }
    }

    return trade;
  }


  notify(msg: string, long: boolean = false) {
    if (!this.is_starting) {
      const dismiss = long ? Game.NOTIFY_LONG : Game.NOTIFY_SHORT;
      this.notifications.push([msg, dismiss]);
    }
  }

  dismiss(msg: string) {
    this.notifications = this.notifications.filter(n => n[0] != msg);
  }


  /*
   * Conflicts
   */
  start_conflicts() {
    if (Object.keys(this.conflicts).length >= 2)
      return;

    // TODO notifications when conflicts start
    for (const pro of t.factions) {
      for (const target of t.factions) {
        // Blockades
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

  get_conflicts(opt?: {
    target?:    t.faction;
    proponent?: t.faction;
    name?:      string;
  }): Conflict[] {
    return Object.values(this.conflicts).filter(c => {
      if (opt) {
        if (opt.target && c.target != opt.target)
          return false;

        if (opt.proponent && c.proponent != opt.proponent)
          return false;

        if (opt.name && c.name != opt.name)
          return false;
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

export = game;
