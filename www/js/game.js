class Game {
  constructor() {
    this.date    = new Date(data.start_date);
    this.turns   = 0;
    this.locus   = null;
    this.player  = new Person;
    this.places  = {};
    this.markets = {}; // hourly market reports for light speed market data
    this.agents  = [];

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

  test() {
    Object.keys(data.shipclass).forEach((sc) => {
      let s = new Ship({shipclass: sc});
      s.fuel = s.tank;
      let a = s.acceleration.toFixed(2);
      console.log(sc, s.range(a) * 4, 'hrs at', a);
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
      let a = new HaulerAgent();
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
      this.places[name]  = new Place(name);
      this.markets[name] = [];
    }

    if (this.agents.length < (bodies.length * data.haulers)) {
      for (let name of bodies) {
        let agent = new HaulerAgent(name, data.hauler_money);
        this.agents.push(agent);
        agent.turn(); // stagger initialization
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
    $('#spacer-fuel').text(`${this.player.ship.fuel}/${this.player.ship.tank} fuel`);
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

      this.agents.forEach((agent) => {agent.turn()});

      let bodies = system.bodies();
      if (this.agents.length < (bodies.length * data.haulers)) {
        for (let name of bodies) {
          let agent = new HaulerAgent(name, data.hauler_money);
          this.agents.push(agent);
          agent.turn(); // stagger initialization
        }
      }

      this.refresh();
    }

    system.bodies().forEach((name) => {
      while (this.markets[name].length > 50)
        this.markets[name].pop();
    });

    this.save_game();
  }

  market(there) {
    let data;
    let age;
    let turns;

    if (there === this.locus) {
      data  = this.place().report();
      age   = 0;
      turns = this.turns;
    }
    else {
      let distance = system.distance(this.locus, there);
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
}
