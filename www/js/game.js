class Game {
  constructor() {
    this.date    = new Date(2242, 0, 1);
    this.turns   = 0;
    this.locus   = null;
    this.player  = new Person;
    this.places  = {};

    document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
  }

  save() {
    let me = {};
    me.turns = this.turns;
    me.locus = this.locus;
    me.player = this.player.save();
    me.places = {};

    Object.keys(this.places).forEach((name) => {
      me.places[name] = this.places[name].save();
    });

    return me;
  }

  load(obj) {
    this.turns = obj.turns;
    this.locus = obj.locus;

    this.date = new Date(2242, 0, 1);
    this.date.setHours(this.date.getHours() + (this.turns * data.hours_per_turn));

    this.player.load(obj.player);

    Object.keys(obj.places).forEach((name) => {
      this.places[name] = new Place;
      this.places[name].load(obj.places[name]);
    });

    open('summary');
    this.refresh();
  }

  onDeviceReady() {
    $(() => {
      let saved = window.localStorage.getItem('game');

      if (saved) {
        this.load(JSON.parse(saved));
        open('summary');
        this.refresh();
      }
      else {
        open('newgame');
      }
    });
  }

  start(player, place) {
    this.player = player;
    this.locus  = place;

    for (let name of system.bodies())
      this.places[name] = new Place(name);

    // Run the system for a few turns to get the economy moving
    for (var i = 0; i < data.initial_turns; ++i)
      this.turn();

    open('summary');
    this.refresh();
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
  }

  turn(n=1) {
    for (let i = 0; i < n; ++i) {
      ++this.turns;
      this.date.setHours(this.date.getHours() + 4);
      system.set_date(this.strdate());
      system.bodies().forEach((name) => {this.place(name).turn()});
      this.refresh();
    }

    this.save_game();
  }
}
