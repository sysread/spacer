"use strict"

define(function(require, exports, module) {
  const data   = require('data');
  const system = require('system');
  const util   = require('util');
  const model  = require('model');
  const Person = require('person');
  const common = require('common');

  const Game = class {
    constructor() {
      const saved = window.localStorage.getItem('game');
      const init  = JSON.parse(saved) || {};

      this.frozen  = false;
      this.page    = init.page  || null;
      this.locus   = init.locus || null;
      this.turns   = init.turns || 0;
      this.date    = new Date(data.start_date);

      this.date.setHours(this.date.getHours() + (this.turns * data.hours_per_turn));
      console.log('setting system date', this.date);
      system.set_date(this.strdate());

      try {
        this.build_player(init.player);
        this.build_planets(init.planets);
      }
      catch (e) {
        console.warn('initialization error; clearing data. error was:', e);
        this.new_game(null, null);
      }

      this.refresh();
    }

    reset_date() {
      this.date = new Date(data.start_date);
      this.date.setDate(this.date.getDate() - data.initial_days);
      console.log('resetting system date', this.date);
      system.set_date(this.strdate());
    }

    build_player(init, person) {
      this.player = person || new Person(init);
    }

    build_planets(init) {
      this.planets = {};
      for (const body of Object.keys(data.bodies)) {
        this.planets[body] = new model.Planet(body, init ? init[body] : undefined);
      }
    }

    get here() {
      return this.planets[this.locus];
    }

    new_game(player, home) {
      window.localStorage.removeItem('game');
      this.locus = home;
      this.turns = 0;
      this.reset_date();
      this.build_player(player);
      this.build_planets();
    }

    save_game() {
      window.localStorage.setItem('game', JSON.stringify(this));
    }

    delete_game() {
      window.localStorage.removeItem('game');
    }

    strdate(date) {
      date = date || this.date;
      let y = date.getFullYear();
      let m = date.getMonth() + 1;
      let d = date.getDate();
      return [y, m < 10 ? `0${m}` : m, d < 10 ? `0${d}` : d].join('-');
    }

    status_date(date) {
      return this.strdate(date).replace(/-/g, '.');
    }

    refresh() {
      $('#spacer-location').text(this.locus);
      $('#spacer-credits').text(`${util.csn(Math.floor(this.player.money))} c`);
      $('#spacer-cargo').text(`${this.player.ship.cargoUsed}/${this.player.ship.cargoSpace} cu`);
      $('#spacer-fuel').text('Fuel ' + util.R(100 * this.player.ship.fuel / this.player.ship.tank) + '%');
      $('#spacer-turn').text(`${this.status_date()}`);
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
console.log('turn -> save_game', n, no_save);
        this.save_game();
      }
    }

    get is_frozen() {
      return this.frozen;
    }

    freeze() {
      this.frozen = true;
    }

    unfreeze() {
      this.frozen = false;
    }

    set_transit_plan(transit_plan) {
      this.transit_plan = transit_plan;
    }

    arrive() {
      this.locus = this.transit_plan.dest;
      this.transit_plan = null;
    }

    trade_routes() {
      const trade = {};

      for (const planet of Object.values(this.planets)) {
        for (const task of planet.queue) {
          if (task.type === 'import') {
            if (!trade.hasOwnProperty(task.item)) {
              trade[ task.item ] = {};
            }

            if (!trade[ task.item ].hasOwnProperty(task.to)) {
              trade[ task.item ][ task.to ] = {};
            }

            if (!trade[ task.item ][ task.to ].hasOwnProperty(task.from)) {
              trade[ task.item ][ task.to ][ task.from ] = [];
            }

            trade[ task.item ][ task.to ][ task.from ].push({
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

  return window.game;
});
