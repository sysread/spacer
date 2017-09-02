class Transit {
  constructor(opt) {
    this.opt  = opt || {};
    this.left = this.turns;
  }

  get dest()    { return this.opt.dest  }           // destination body name
  get dist()    { return this.opt.dist  }           // meters
  get time()    { return this.opt.time  }           // hours
  get hours()   { return this.opt.time  }
  get accel()   { return this.opt.accel }           // gravities
  get turns()   { return Math.ceil(this.time / 4) } // total trip turns
  get turnpct() { return 100 / this.turns }         // percent of trip per turn
  get km()      { return this.dist / 1000 }         // distance in kilometers
  get au()      { return this.dist / data.AU }      // distance in AU

  get is_complete()  { return this.left === 0 }
  get pct_complete() { return Math.ceil(100 - (this.left * this.turnpct)) }
  get dist_left()    { return (this.au / this.turns) * this.left }

  get days_hours() {
    let d = this.hours / 24;
    let h = this.hours % 24;
    return [d.toFixed(0), h];
  }

  turn() { if (!this.is_complete) --this.left }
}
