define(function(require, exports, module) {
  const Person  = require('person');
  const Physics = require('physics');
  const Place   = require('place');
  const data    = require('data');
  const system  = require('system');
  const util    = require('util');

  const Game = class {
    constructor() {
      this.date    = new Date(data.start_date);
      this.turns   = 0;
      this.locus   = null;
      this.player  = new Person;
      this.places  = {};
      this._systemNeed = {};

      $(() => {
        let saved = window.localStorage.getItem('game');

        if (saved) {
          this.load(JSON.parse(saved));
          this.refresh();
          exports.open('summary');
          //exports.open('debug');
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

        for (const item of Object.keys(data.resources)) {
          console.log('  -', item, prod.get(item) - cons.get(item));
        }
      });
    }

    net_stores() {
      for (const name of Object.keys(data.bodies)) {
        const report = this.market(name);
        console.log(name);
        console.log('  -fabricators: ', this.place(name).fabricator, '/', this.place(name).max_fabs);

        for (const item of Object.keys(report.data)) {
          if (report[item].stock > 0)
            console.log(`  -${item}: ${report.data[item].stock} @ ${report.data[item].buy}`);
        }
      }
    }

    save() {
      let me = {};
      me.turns   = this.turns;
      me.locus   = this.locus;
      me.player  = this.player.save();
      me.places  = {};

      for (const name of Object.keys(data.bodies))
        me.places[name] = this.places[name].save();

      return me;
    }

    load(obj) {
      this.turns = obj.turns;
      this.locus = obj.locus;
      this.date  = new Date(data.start_date);
      this.date.setHours(this.date.getHours() + (this.turns * data.hours_per_turn));

      this.player.load(obj.player);

      for (const name of Object.keys(data.bodies)) {
        if (obj.places[name]) {
          this.places[name] = new Place(name);
          this.places[name].load(obj.places[name]);
        }
        else {
          this.new_place(name);
        }
      }

      system.set_date(this.strdate());
    }

    new_place(name) {
      const place = new Place(name);

      for (const item of (Object.keys(data.resources))) {
        if (data.resources[item].mine) {
          place.store.inc(item, Math.ceil(place.scale * data.initial_stock));
        }
        else {
          place.store.inc(item, Math.ceil(place.scale * data.initial_stock * 0.5));
        }
      }

      this.places[name]  = place;
    }

    new_game(player, place) {
      window.localStorage.removeItem('game');

      const date = new Date(data.start_date);
      date.setDate(date.getDate() - data.initial_days);

      this.player  = player;
      this.locus   = place;
      this.date    = date;
      this.turns   = 0;
      this.places  = {};

      let bodies = system.bodies();

      for (const name of bodies) {
        this.new_place(name);
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
        this._systemNeed = {};

        ++this.turns;
        this.date.setHours(this.date.getHours() + data.hours_per_turn);
        system.set_date(this.strdate());

        system.bodies().forEach((name) => {
          this.place(name).turn();
        });

        this.refresh();
      }

      this.save_game();
    }

    market(there, here) {
      here = here || this.locus;
      const distance = system.distance(here, there);

      return {
        data: this.place(there).report,
        age:  this.light_hours(system.distance(here, there)),
      };
    }

    systemNeed(resource) {
      if (!this._systemNeed.hasOwnProperty(resource)) {
        let demand = 1;
        let supply = 1;

        for (const body of Object.keys(data.bodies)) {
          const report = this.place(body).report;
          if (report.hasOwnProperty(resource)) {
            demand += report[resource].demand;
            supply += report[resource].supply;
          }
        }

        this._systemNeed[resource] = demand / supply;
      }

      return this._systemNeed[resource];
    }
  };

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

  exports.game = new Game;
});
