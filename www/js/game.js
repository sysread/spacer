define(function(require, exports, module) {
  const Person  = require('person');
  const Physics = require('physics');
  const Place   = require('place');
  const Ship    = require('ship');
  const data    = require('data');
  const system  = require('system');
  const util    = require('util');

  exports.open = function(name) {
    if ($('#spacer').data('state') === 'transit') {
      return;
    }

    if (!window.localStorage.getItem('game')) {
      name = 'newgame';
    }

    const path = $(`#spacer-nav a[data-name='${name}']`).data('path') || name + '.html';

    $('#spacer-nav a').removeClass('active');
    $(`#spacer-nav a[data-name="${name}"]`).addClass('active');
    $('#spacer-content').empty().load(path);
    $('#spacer-nav').collapse('hide');
  };

  const Game = class {
    constructor() {
      this.date    = new Date(data.start_date);
      this.turns   = 0;
      this.locus   = null;
      this.player  = new Person;
      this.places  = {};
      this.markets = {}; // hourly market reports for light speed market data
      this.cache   = {};

      $(() => {
        let saved = window.localStorage.getItem('game');

        if (saved) {
          this.load(JSON.parse(saved));
          this.refresh();
          exports.open('summary');
          //exports.open('work');
        }
        else {
          exports.open('newgame');
        }
      });
    }

    get here() {return this.place(this.locus)}

    net_production() {
      Object.keys(this.places).forEach((place) => {
        let prod = this.places[place].production;
        let cons = this.places[place].consumption;

        console.log(place);

        Object.keys(data.resources).forEach((item) => {
          console.log('  -', item, prod.get(item) - cons.get(item));
        });
      });
    }

    net_stores() {
      Object.keys(this.markets).forEach((name) => {
        let report = this.markets[name][0];
        console.log(name);
        console.log('  -fabricators: ', this.place(name).fabricator, '/', this.place(name).max_fabs);

        Object.keys(report).forEach((item) => {
          if (report[item].stock > 0)
            console.log(`  -${item}: ${report[item].stock} @ ${report[item].buy}`);
        });
      });
    }

    save() {
      let me = {};
      me.turns   = this.turns;
      me.locus   = this.locus;
      me.player  = this.player.save();
      me.places  = {};
      me.markets = {};

      Object.keys(data.bodies).forEach((name) => {
        me.places[name]  = this.places[name].save();
        me.markets[name] = this.markets[name].slice(0, this.markets[name].length);
      });

      return me;
    }

    load(obj) {
      this.turns  = obj.turns;
      this.locus  = obj.locus;

      this.date = new Date(data.start_date);
      this.date.setHours(this.date.getHours() + (this.turns * data.hours_per_turn));

      this.player.load(obj.player);

      Object.keys(obj.places).forEach((name) => {
        this.places[name] = new Place;
        this.places[name].load(obj.places[name]);
        this.markets[name] = obj.markets[name];
      });

      system.set_date(this.strdate());
    }

    new_game(player, place) {
      window.localStorage.removeItem('game');

      this.player  = player;
      this.locus   = place;
      this.date    = new Date(data.start_date);
      this.turns   = 0;
      this.places  = {};
      this.markets = {};

      let bodies = system.bodies();

      for (let name of bodies) {
        let place = new Place(name);

        for (let item of (Object.keys(data.resources))) {
          place.store.inc(item, Math.ceil(place.scale * data.initial_stock));
        }

        this.places[name]  = place;
        this.markets[name] = [];
      }
    }

    save_game() {
      window.localStorage.setItem('game', JSON.stringify(this.save()));
    }

    place(name) { return this.places[name || this.locus] }

    transit(dest) {
      this.locus = dest;
      this.save_game();
      this.refresh();
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

    light_hours(meters) {
      return Math.ceil(meters / Physics.C / 3600);
    }

    light_turns(meters) {
      return Math.ceil(this.light_hours(meters) / data.hours_per_turn);
    }

    turn(n=1) {
      for (let i = 0; i < n; ++i) {
        ++this.turns;
        this.date.setHours(this.date.getHours() + data.hours_per_turn);
        system.set_date(this.strdate());

        system.bodies().forEach((name) => {
          this.place(name).turn();
          this.markets[name].unshift(this.place(name).report());
        });

        this.refresh();
      }

      for (let name of system.bodies()) {
        while (this.markets[name].length > 50)
          this.markets[name].pop();
      };

      this.cache.system_need = {};

      this.save_game();
    }

    market(there, here) {
      here = here || this.locus;
      let data;
      let age;
      let turns;

      if (there === here) {
        data  = this.place(here).report();
        age   = 0;
        turns = this.turns;
      }
      else {
        let distance = system.distance(here, there);
        let idx = this.light_turns(distance);

        if (this.markets[there].length <= idx)
          return null;

        data  = this.markets[there][idx];
        age   = this.light_hours(distance);
        turns = this.turns - idx;
      }

      return {
        data: data,
        age:  age,
        turn: turns
      }
    }

    *reports(here) {
      here = here || this.locus;
      for (let body of Object.keys(this.markets)) {
        let report = this.market(body, here);
        if (report === null) return;
        yield [body, this.market(body, here)];
      }
    }

    system_need(resource) {
      if (!this.cache.hasOwnProperty('system_need'))
        this.cache.system_need = {};

      if (!this.cache.system_need.hasOwnProperty(resource)) {
        let demand  = 1;
        let supply  = 1;
        let reports = 1;

        for (let body of Object.keys(this.markets)) {
          if (this.markets[body].length > 1) {
            demand += this.markets[body][0][resource].demand;
            supply += this.markets[body][0][resource].supply;
            ++reports;
          }
        }

        this.cache.system_need[resource] = demand / supply;
      }

      return this.cache.system_need[resource];
    }
  };

  exports.game = new Game;
});
