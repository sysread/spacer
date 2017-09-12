class Miner extends Actor {
  constructor(opt) {
    super(opt);
    this.place = opt.place;
  }

  save() {
    let obj = super.save();
    obj.place = this.place;
    return obj;
  }

  load(obj) {
    super.load(obj);
    this.place = obj.place;
  }

  plan() {
    // Random integer 1 - 10
    let turns = Math.floor(Math.random() * 10) + 1;

    for (let i = 0; i < turns; ++i)
      this.enqueue('wait');

    this.enqueue('mine', [turns]);
  }

  mine(info) {
    let place  = game.place(this.place);
    let turns  = info.turns;
    let result = place.harvest(turns);
    result.each((item, amt) => {place.sell(item, amt)});
  }
}
