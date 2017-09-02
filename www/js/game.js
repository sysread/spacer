class Game {
  constructor() {
    this.date   = new Date(2242, 0, 1);
    this.turns  = 0;
    this.places = {};
    this.player = null;
    this.locus  = null;

    document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
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
    let init_turns = 300;
    this.date.setHours(this.date.getHours() - (4 * init_turns));
    for (var i = 0; i < init_turns; ++i)
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
