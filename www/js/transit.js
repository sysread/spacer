class Transit {
  constructor(opt) {
    this.opt  = opt || {};
    this.left = this.turns;
  }

  get dest()    { return this.opt.dest }                    // destination body name
  get dist()    { return this.opt.dist }                    // meters
  get turns()   { return this.opt.turns }                   // turns
  get hours()   { return this.turns * data.hours_per_turn } // hours
  get accel()   { return this.opt.accel }                   // gravities
  get turnpct() { return 100 / this.turns }                 // percent of trip per turn
  get km()      { return this.dist / 1000 }                 // distance in kilometers
  get au()      { return Physics.AU(this.dist) }            // distance in AU

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
