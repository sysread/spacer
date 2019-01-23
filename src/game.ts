import data from './data';
import system from './system';

import { TransitPlan } from './transitplan';
import { NewGameData } from './data/initial';
import { Person, SavedPerson } from './person';
import { Planet, SavedPlanet, isImportTask } from './planet';
import { Agent, SavedAgent } from './agent';
import { Events, Ev, TurnCallBack, TurnDetail } from './events';

import * as t from './common';
import * as util from './util';


// Shims for global browser objects
interface localStorage {
  getItem(key: string): string;
  setItem(key: string, val: string): void;
  removeItem(key: string): void;
}

declare var window: {
  game: Game;
  localStorage: localStorage;
  dispatchEvent(ev: Event): void;
  addEventListener: (ev: string, cb: Function) => void;
}

declare var console: any;


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


class Game {
  turnEvent:     Event;
  turns:         number = 0;
  date:          Date = new Date(data.start_date);
  _player:       Person | null = null;
  locus:         t.body | null = null;
  planets:       {[key: string]: Planet} = {};
  page:          string | null = null;
  frozen:        boolean = false;
  transit_plan?: TransitPlan;
  agents:        Agent[] = [];

  constructor() {
    this.reset_date();

    this.turnEvent = new CustomEvent('turn', {
      detail: {
        get turn()     { return game.turns },
        get isNewDay() { return game.turns % data.turns_per_day == 0 },
      },
    });
  }

  init() {
    const saved = window.localStorage.getItem('game');
    const init  = saved == null ? null : JSON.parse(saved);

    if (init) {
      try {
        this.turns = init.turns;
        this.locus = init.locus;
        this.page  = init.page;
        this._player = new Person(init._player);

        this.date.setHours(this.date.getHours() + (this.turns * data.hours_per_turn));
        console.log('setting system date', this.date);
        system.set_date(this.strdate());

        this.build_planets(init.planets);
        this.build_agents(init.agents);
      }
      catch (e) {
        console.warn('initialization error:', e);
        this.locus = null;
        this.turns = 0;
        this._player = null;
        this.build_planets();
        this.build_agents();
      }
    }
    else {
      this.build_planets();
      this.build_agents();
    }
  }

  onTurn(cb: TurnCallBack) {
    window.addEventListener('turn', cb);
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
    date.setDate(this.date.getDate() - data.initial_days);
    return date;
  }

  reset_date() {
    this.date = this.start_date();
    console.log('resetting system date', this.date);
    system.set_date(this.strdate());
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
    this.planets = {};

    for (const body of t.bodies) {
      if (init && init[body]) {
        this.planets[body] = new Planet(body, init[body]);
      } else {
        this.planets[body] = new Planet(body);
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
        for (const faction of t.factions) {
          const body = data.factions[faction].capital;

          const agent = new Agent({
            name:     'Merchant from ' + data.bodies[body].name,
            ship:     { type: 'schooner' },
            faction:  faction,
            home:     body,
            money:    1000,
            standing: data.factions[faction].standing,
          });

          this.agents.push(agent);
        }
      }
    }
  }


  new_game(player: Person, home: t.body) {
    window.localStorage.removeItem('game');

    this._player = player;
    this.locus = home;

    this.turns = NewGameData.turns;
    this.page = NewGameData.page;

    this.date.setHours(this.date.getHours() + (this.turns * data.hours_per_turn));
    console.log('setting system date', this.date);
    system.set_date(this.strdate());

    this.build_planets(NewGameData.planets);
    this.build_agents(); // agents not part of initial data set

    // Work-around for chicken and egg problem with initializing contracts for
    // newly created planets when doing so relies on the existence of
    // window.game and window.game.player.
    for (const p of Object.values(this.planets)) {
      p.refreshContracts();
    }

    this.save_game();
  }

  save_game() {
    window.localStorage.setItem('game', JSON.stringify(this));
  }

  delete_game() {
    window.localStorage.removeItem('game');
  }


  build_new_game_data() {
    this.turns = 0;
    this.reset_date();
    this.build_planets();
    this.build_agents();
    this.turn(data.initial_days * data.turns_per_day, true);

    // clear bits we do not wish to include in the initial data set
    this._player = null;
    for (const p of Object.values(this.planets)) {
      p.contracts = [];
    }

    return JSON.stringify(this);
  }


  turn(n=1, no_save=false) {
    for (let i = 0; i < n; ++i) {
      ++this.turns;

      this.date.setHours(this.date.getHours() + data.hours_per_turn);
      system.set_date(this.strdate());

      Events.signal({type: Ev.Turn, turn: this.turns});
      window.dispatchEvent(this.turnEvent);
    }

    if (!no_save) {
      this.save_game();
    }
  }


  freeze() {
    this.frozen = true;
  }

  unfreeze() {
    this.frozen = false;
  }

  set_transit_plan(transit_plan: TransitPlan) {
    this.transit_plan = transit_plan;
  }

  arrive() {
    if (this.transit_plan) {
      this.locus = this.transit_plan.dest;
      this.transit_plan = undefined;
    }

    if (this.locus) {
      Events.signal({type: Ev.Arrived, dest: this.locus});
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
};

console.log('Spacer is starting');

var game: Game = new Game;

window.game = game;
window.game.init();
window.game.arrive();

export = game;
