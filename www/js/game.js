class Game {
  constructor() {
    this.date    = new Date(2242, 0, 1);
    this.turns   = 0;
    this.locus   = null;
    this.player  = new Person;
    this.places  = {};
    this.markets = {}; // hourly market reports for light speed market data
    this.agents  = [];
    document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
  }

  save() {
    let me = {};
    me.turns   = this.turns;
    me.locus   = this.locus;
    me.player  = this.player.save();
    me.places  = {};
    me.markets = {};
    me.agents  = [];

    Object.keys(data.bodies).forEach((name) => {
      me.places[name]  = this.places[name].save();
      me.markets[name] = this.markets[name].slice(0, this.markets[name].length);
    });

    this.agents.forEach((agent) => {me.agents.push(agent.save())});

    return me;
  }

  load(obj) {
    this.turns  = obj.turns;
    this.locus  = obj.locus;
    this.agents = [];

    this.date = new Date(2242, 0, 1);
    this.date.setHours(this.date.getHours() + (this.turns * data.hours_per_turn));

    this.player.load(obj.player);

    Object.keys(obj.places).forEach((name) => {
      this.places[name] = new Place;
      this.places[name].load(obj.places[name]);
      this.markets[name] = obj.markets[name];
    });

    obj.agents.forEach((agent) => {
      let a = new HaulerAgent;
      a.load(agent);
      this.agents.push(a);
    });

    open('summary');
    this.refresh();
  }

  onDeviceReady() {
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

    /*for (let sc of Object.keys(data.shipclass)) {
      let s = new Ship({shipclass: sc});
      console.log(`${sc} nominal`, s.mass, s.acceleration.toFixed(2));
      s.load_cargo('water', s.cargo_space);
      console.log(`${sc} w/cargo`, s.mass, s.acceleration.toFixed(2));
    }*/
  }

  new_game(player, place) {
    window.localStorage.removeItem('game');

    this.player  = player;
    this.locus   = place;
    this.date    = new Date(2242, 0, 1);
    this.turns   = 0;
    this.places  = {};
    this.markets = {};

    for (let name of system.bodies()) {
      this.places[name]  = new Place(name);
      this.markets[name] = [];
    }

    for (let name of system.bodies()) {
      for (let i = 0; i < data.haulers_per_place; ++i) {
        let agent = new HaulerAgent(name, data.hauler_money * this.places[name].scale);
        agent.turn(); // choose first action
        this.agents.push(agent);
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
  }

  strdate() {
    let y = this.date.getFullYear();
    let m = this.date.getMonth() + 1;
    let d = this.date.getDate();
    return [y, m < 10 ? `0${m}` : m, d < 10 ? `0${d}` : d].join('-');
  }

  refresh() {
    $('#spacer-turn').text(`${this.strdate()}`);
    $('#spacer-credits').text(`${csn(this.player.money)} credits`);
    $('#spacer-cargo').text(`${this.player.ship.cargo_used}/${this.player.ship.cargo_space} cargo`);
    $('#spacer-location').text(this.locus);
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

      system.bodies().forEach((name) => {
        this.place(name).turn();
        this.markets[name].unshift(this.place(name).report());
      });

      this.agents.forEach((agent) => {agent.turn()});
      this.refresh();
    }

    system.bodies().forEach((name) => {
      while (this.markets[name].length > 100)
        this.markets[name].pop();
    });

    this.save_game();
  }

  market(there) {
    let distance = system.distance(this.locus, there);
    let idx = this.light_turns(distance);

    if (this.markets[there].length <= idx)
      return null;

    return {
      data: this.markets[there][idx],
      age:  this.light_hours(distance),
      turn: this.turns - idx
    }
  }
}
