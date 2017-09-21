class Game {
  constructor() {
    this.date    = new Date(data.start_date);
    this.turns   = 0;
    this.locus   = null;
    this.player  = new Person;
    this.places  = {};
    this.markets = {}; // hourly market reports for light speed market data
    this.agents  = [];
    this.cache   = {};

    $(() => {
      let saved = window.localStorage.getItem('game');

      if (saved) {
        this.load(JSON.parse(saved));
        this.refresh();
        open('summary');
      }
      else {
        open('newgame');
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
    me.agents  = this.agents.map((agent) => {return agent.save()});

    Object.keys(data.bodies).forEach((name) => {
      me.places[name]  = this.places[name].save();
      me.markets[name] = this.markets[name].slice(0, this.markets[name].length);
    });

    return me;
  }

  load(obj) {
    this.turns  = obj.turns;
    this.locus  = obj.locus;
    this.agents = obj.agents.map((agent) => {
      let a = new Hauler();
      a.load(agent);
      return a;
    });

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
    this.agents  = [];

    let bodies = system.bodies();

    for (let name of bodies) {
      let place = new Place(name);
      for (let item of (Object.keys(data.resources)))
        place.store.inc(item, Math.ceil(place.scale * 10));

      this.places[name]  = place;
      this.markets[name] = [];

      let haulers = Math.max(1, Math.ceil(place.scale * data.haulers));
      let ship;

      switch (place.size) {
        case 'tiny':
          ship = 'shuttle';
          break;
        case 'small':
          ship = 'trader';
          break;
        case 'normal':
          ship = 'merchantman';
          break;
        case 'large':
          ship = 'freighter';
          break;
        case 'huge':
          ship = 'hauler';
          break;
        default:
          break;
      }

      if (place.faction == 'TRANSA') {
        ship = 'neptune';
      }

      for (let i = 0; i < haulers; ++i) {
        this.agents.push(new Hauler({place: name, ship: ship}));
      }
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
    $('#spacer-credits').text(`${csn(this.player.money)}c`);
    $('#spacer-cargo').text(`${this.player.ship.cargo_used}/${this.player.ship.cargo_space} cu`);
    $('#spacer-fuel').text(`${Math.floor(this.player.ship.fuel)}/${this.player.ship.tank} fuel`);
    $('#spacer-turn').text(`${this.strdate()}`);
  }

  light_hours(meters) {
    return Math.ceil(meters / data.C / 60 / 60);
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

      if (this.turns > data.initial_turns) {
        for (let agent of this.agents)
          agent.turn();
      }

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
}
