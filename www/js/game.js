class Game {
  constructor() {
    document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
  }

  onDeviceReady() {
    let me  = this;
    $(() => {
      open('summary');
      me.begin();
    });
  }

  start() {
    this.data = {
      date   : new Date(2242, 0, 1),
      turns  : 0,
      places : {},
      place  : 'earth',
      player : new Person({
        name     : 'Marco Solo',
        money    : 100000,
        strength : 10,
        ship     : new Ship({
          name      : 'The Boat',
          shipclass : data.shipclass.hauler
        })
      })
    };

    // DEBUG
    /*for (let ship of Object.keys(data.shipclass)) {
      let s = new Ship({shipclass: data.shipclass[ship]});
      console.log(ship);
      console.log(`  -nominal: ${csn(s.mass)}t, ${s.acceleration().toFixed(2)}G`);
      s.load_cargo('machines', s.shipclass.cargo);
      console.log(`  -loaded:  ${csn(s.mass)}t, ${s.acceleration().toFixed(2)}G`);
    }*/

    for (let name of system.bodies())
      this.data.places[name] = new Place(name);

    // Run the system for a few turns to get the economy moving
    let init_turns = 300;
    this.data.date.setHours(this.data.date.getHours() - (4 * init_turns));
    for (var i = 0; i < init_turns; ++i)
      this.turn();

    this.save();
  }

  save() {}
  load() { return false; }

  begin() {
    if (!this.load()) this.start();
    this.refresh();
  }

  player() { return this.data.player }
  place(name) { return this.data.places[name || this.data.place] }
  transit(dest) { this.data.place = dest }

  date() {
    let y = this.data.date.getFullYear();
    let m = this.data.date.getMonth() + 1;
    let d = this.data.date.getDate();
    return [y, m < 10 ? `0${m}` : m, d < 10 ? `0${d}` : d].join('-');
  }

  refresh() {
    $('#spacer-turn').text(`${this.date()}`);
    $('#spacer-credits').text(`${csn(this.data.player.money)} credits`);
    $('#spacer-cargo').text(`${this.data.player.ship.cargo_used}/${this.data.player.ship.cargo_space} cargo`);
  }

  turn() {
    ++this.data.turns;
    this.data.date.setHours(this.data.date.getHours() + 4);
    system.set_date(this.date());
    system.bodies().forEach((name) => {this.place(name).turn()});
    this.refresh();
  }
}
