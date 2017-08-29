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
      player : new Person({name: 'Jameson', money: 1000}),
      places : {},
      place  : 'earth'
    };

    for (let name of system.bodies())
      this.data.places[name] = new Place(name);

    for (var i = 0; i < 100; ++i)
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
    $('#spacer-credits').text(`${this.data.player.money} credits`);
    $('#spacer-turn').text(`${this.date()}`);
  }

  turn() {
    ++this.data.turns;
    this.data.date.setHours(this.data.date.getHours() + 4);
    system.set_date(this.date());
    system.bodies().forEach((name) => {this.place(name).turn()});
    this.refresh();
  }
}
