define(function(require, exports, module) {
  const data   = require('data');
  const model  = require('model');
  const system = require('system');
  const util   = require('util');
  const Person = require('person');

  const start_page = 'summary';
  //const start_page = 'shipyard';

  const Game = class {
    constructor() {
      const saved = window.localStorage.getItem('game');
      const init  = JSON.parse(saved) || {};

      this.locus   = init.locus || null;
      this.turns   = init.turns || 0;
      this.player  = new Person(init.player);
      this.date    = new Date(data.start_date);
      this.planets = {};

      this.date.setHours(this.date.getHours() + (this.turns * data.hours_per_turn));
      system.set_date(this.strdate());

      for (const body of Object.keys(data.bodies)) {
        this.planets[body] = new model.Planet(body, init.planets ? init.planets[body] : undefined);
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

    refresh() {
      $('#spacer-location').text(this.locus);
      $('#spacer-credits').text(`${util.csn(this.player.money)}c`);
      $('#spacer-cargo').text(`${this.player.ship.cargoUsed}/${this.player.ship.cargoSpace} cu`);
      $('#spacer-fuel').text(`${Math.floor(this.player.ship.fuel)}/${this.player.ship.tank} fuel`);
      $('#spacer-turn').text(`${this.strdate()}`);
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
  };

  return Game;
});
