define(function(require, exports, module) {
  const data   = require('data');
  const system = require('system');
  const util   = require('util');
  const model  = require('model');
  const Person = require('person');

  const start_page = 'summary';

  const Game = class {
    constructor() {
      const saved = window.localStorage.getItem('game');
      const init  = JSON.parse(saved) || {};

      this.freeze  = false;
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

      if (this.turns == 0) {
        this.open('newgame');
      } else {
        this.open(start_page);
      }
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
      this.locus  = home;
      this.turns  = 0;
      this.reset_date();
      this.build_player(player);
      this.build_planets();
    }

    save_game() {
      window.localStorage.setItem('game', JSON.stringify(this));
    }

    transit(dest) {
      this.locus = dest;
      this.freeze = false;
      this.save_game();
      this.refresh();
    }

    open(name) {
      if (this.freeze) {
        return;
      }

      if ($('#spacer').data('state') === 'transit') {
        return;
      }

      if (!window.localStorage.getItem('game')) {
        name = 'newgame';
      }

      this.page = name;
      $('#spacer-content').empty().load(this.page + '.html');
    }

    strdate() {
      let y = this.date.getFullYear();
      let m = this.date.getMonth() + 1;
      let d = this.date.getDate();
      return [y, m < 10 ? `0${m}` : m, d < 10 ? `0${d}` : d].join('-');
    }

    status_date() {
      return this.strdate().replace(/-/g, '.');
    }

    refresh() {
      $('#spacer-location').text(this.locus);
      $('#spacer-credits').text(`${util.csn(this.player.money)}c`);
      $('#spacer-cargo').text(`${this.player.ship.cargoUsed}/${this.player.ship.cargoSpace} cu`);
      $('#spacer-fuel').text(`${Math.floor(this.player.ship.fuel)}/${this.player.ship.tank} fuel`);
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
        this.save_game();
      }
    }

    trade_routes() {
      const trade = {};
      for (const planet of Object.values(this.planets)) {
        for (const task of planet.queue) {
          const info = task[3];

          if (info.type === 'import') {
            if (!trade.hasOwnProperty(info.item)) {
              trade[ info.item ] = {};
            }

            if (!trade[ info.item ].hasOwnProperty(info.from)) {
              trade[ info.item ][ info.from ] = {};
            }

            if (!trade[ info.item ][ info.from ].hasOwnProperty(info.to)) {
              trade[ info.item ][ info.from ][ info.to ] = 0;
            }

            trade[ info.item ][ info.from ][ info.to ] += info.count;
          }
        }
      }

      return trade;
    }
  };

  console.log('Spacer is GO');

  if (!window.game) {
    window.game = new Game;
  }

  return window.game;
});
