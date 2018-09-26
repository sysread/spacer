define(function(require, exports, module) {
  const data   = require('data');
  const model  = require('model');
  const system = require('system');
  const util   = require('util');
  const Person = require('person');

  const start_page = 'summary';

  const Game = class {
    constructor() {
      const saved = window.localStorage.getItem('game');
      const init  = JSON.parse(saved) || {};

      this.locus   = init.locus || null;
      this.turns   = init.turns || 0;
      this.date    = new Date(data.start_date);

      this.date.setHours(this.date.getHours() + (this.turns * data.hours_per_turn));
      console.log('setting system date', this.date);
      system.set_date(this.strdate());

      try {
        this.player = new Person(init.player);

        this.planets = {};
        for (const body of Object.keys(data.bodies)) {
          this.planets[body] = new model.Planet(body, init.planets ? init.planets[body] : undefined);
        }
      }
      catch (e) {
        console.warn('initialization error; clearing data. error was:', e);
        window.localStorage.removeItem('game');

        this.locus  = null;
        this.turns  = 0;
        this.player = new Person;

        this.date = new Date(data.start_date);
        console.log('resetting system date', this.date);
        system.set_date(this.strdate());

        this.planets = {};
        for (const body of Object.keys(data.bodies)) {
          this.planets[body] = new model.Planet(body, undefined);
        }
      }

      this.refresh();

      if (this.turns > 0) {
        this.open(start_page);
      }
      else {
        this.open('newgame');
      }
    }

    get here() {
      return this.planets[this.locus];
    }

    new_game(player, home) {
      window.localStorage.removeItem('game');

      const date = new Date(data.start_date);
      date.setDate(date.getDate() - data.initial_days);

      this.player  = player;
      this.locus   = home;
      this.date    = date;
      this.turns   = 0;

      // TODO fresh planets
    }

    save_game() {
      window.localStorage.setItem('game', JSON.stringify(this));
    }

    transit(dest) {
      this.locus = dest;
      this.save_game();
      this.refresh();
    }

    open(name) {
      if ($('#spacer').data('state') === 'transit') return;
      if (!window.localStorage.getItem('game')) name = 'newgame';
      const path = $(`#spacer-nav a[data-name='${name}']`).data('path') || name + '.html';
      $('#spacer-nav a').removeClass('active');
      $(`#spacer-nav a[data-name="${name}"]`).addClass('active');
      $('#spacer-content').empty().load(path);
      $('#spacer-nav').collapse('hide');
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

  return Game;
});
