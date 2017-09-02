class Game {
  constructor() {
    this.date   = new Date(2242, 0, 1);
    this.turns  = 0;
    this.locus  = null;
    this.player = new Person;
    this.places = {};

    document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
  }

  save() {
    let me = {};
    me.date   = new Date(this.date);
    me.turns  = this.turns;
    me.locus  = this.locus;
    me.player = this.player.save();
    me.places = {};

    Object.keys(this.places).forEach((name) => {
      me.places[name] = this.places[name].save();
    });

    return me;
  }

  load(obj) {
    this.date  = obj.date;
    this.turns = obj.turns;
    this.locus = obj.locus;

    this.player.load(obj.player);

    Object.keys(obj.places).forEach((name) => {
      this.places[name].load(obj.places[name]);
    });

    open('summary');
    this.refresh();
  }

  onDeviceReady() {
    let me = this;

    $(function() {
      if (me.turns > 0) {
        open('summary');
        me.refresh();
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
    this.date.setHours(this.date.getHours() - (data.hours_per_turn * data.initial_turns));
    for (var i = 0; i < data.initial_turns; ++i)
      this.turn();

    open('summary');
    this.refresh();
  }

  place(name) { return this.places[name || this.locus] }
  transit(dest) { this.locus = dest }

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

  turn() {
    ++this.turns;
    this.date.setHours(this.date.getHours() + 4);
    system.set_date(this.strdate());
    system.bodies().forEach((name) => {this.place(name).turn()});
    this.refresh();
  }
}
