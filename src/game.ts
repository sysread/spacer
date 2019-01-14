import data from './data';
import system from './system';
import TransitPlan from './transitplan';

import { Person, SavedPerson } from './person';
import { Planet, SavedPlanet, isImportTask } from './planet';

import * as t from './common';
import * as util from './util';


// Shims for global browser objects
interface localStorage {
  getItem(key: string): string;
  setItem(key: string, val: string): void;
  removeItem(key: string): void;
}

declare var window: {
  game: any;
  localStorage: localStorage;
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
  turns:         number = 0;
  date:          Date = new Date(data.start_date);
  player:        Person | null = null;
  locus:         t.body | null = null;
  planets:       { [key: string]: Planet } = {};
  page:          string | null = null;
  frozen:        boolean = false;
  transit_plan?: TransitPlan;

  constructor() {
    const saved = window.localStorage.getItem('game');
    const init  = saved == null ? null : JSON.parse(saved);

    if (init) {
      try {
        this.turns  = init.turns;
        this.locus  = init.locus;
        this.page   = init.page;
        this.player = new Person(init.player);

        this.date.setHours(this.date.getHours() + (this.turns * data.hours_per_turn));
        console.log('setting system date', this.date);
        system.set_date(this.strdate());

        this.build_planets(init.planets);
      }
      catch (e) {
        console.warn('initialization error; clearing data. error was:', e);
        this.locus  = null;
        this.turns  = 0;
        this.player = null;
        this.build_planets();
        this.reset_date();
      }
    }

    this.refresh();
  }


  get here() {
    if (this.locus != null) {
      return this.planets[this.locus];
    }
  }

  get is_frozen() {
    return this.frozen;
  }


  reset_date() {
    this.date = new Date(data.start_date);
    this.date.setDate(this.date.getDate() - data.initial_days);
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


  new_game(player: Person, home: t.body) {
    window.localStorage.removeItem('game');
    this.player = player;
    this.locus  = home;
    this.turns  = 0;
    this.reset_date();
    this.build_planets();
  }

  save_game() {
    window.localStorage.setItem('game', JSON.stringify(this));
  }

  delete_game() {
    window.localStorage.removeItem('game');
  }


  refresh() {
    if (this.locus != null) {
      $('#spacer-location').text(this.locus);
    }

    if (this.player != null) {
      $('#spacer-credits').text(`${util.csn(Math.floor(this.player.money))} c`);
      $('#spacer-cargo').text(`${this.player.ship.cargoUsed}/${this.player.ship.cargoSpace} cu`);
      $('#spacer-fuel').text('Fuel ' + util.R(100 * this.player.ship.fuel / this.player.ship.tank) + '%');
      $('#spacer-turn').text(`${this.status_date()}`);
    }
  }


  turn(n=1, no_save=false) {
    for (let i = 0; i < n; ++i) {
      ++this.turns;
      this.date.setHours(this.date.getHours() + data.hours_per_turn);
      system.set_date(this.strdate());

      for (const p of util.shuffle(Object.values(this.planets))) {
        p.turn();
      }

      this.refresh();
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
    if (!this.transit_plan)
      return;

    this.locus = this.transit_plan.dest;
    this.transit_plan = undefined;
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

if (!window.game) {
  window.game = new Game;
}

export = window.game;
