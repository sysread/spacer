class Transit {
  constructor(opt) {
    this.opt          = opt || {};
    this.left         = this.turns;
    this.coords       = this.start;
    this.flipDistance = this.dist / 2;
    this.flipTime     = this.turns * data.hours_per_turn * 3600 * 0.5;
    this.flipPoint    = Physics.pointAtDistanceAlongLine(this.start, this.end, this.flipDistance);
    this.maxVelocity  = Physics.velocity(this.flipTime, 0, this.accel);
    this.velocity     = 0;
  }

  get origin() { return this.opt.origin }                 // origin body name
  get dest()   { return this.opt.dest }                   // destination body name
  get dist()   { return this.opt.dist }                   // meters
  get turns()  { return this.opt.turns }                  // turns
  get accel()  { return this.opt.accel }                  // gravities
  get start()  { return this.opt.start }                  // start point (x, y, z)
  get end()    { return this.opt.end }                    // end point (x, y, z)

  get hours() { return this.turns * data.hours_per_turn } // hours
  get turnpct() { return 100 / this.turns }               // percent of trip per turn
  get km() { return this.dist / 1000 }                    // distance in kilometers
  get au() { return Physics.AU(this.dist) }               // distance in AU

  get is_complete()  { return this.left === 0 }
  get pct_complete() { return Math.ceil(100 - (this.left * this.turnpct)) }

  get days_hours() {
    let d = this.hours / 24;
    let h = this.hours % 24;
    return [d.toFixed(0), h];
  }

  turn() {
    if (!this.is_complete) {
      --this.left;

      const secPerTurn = data.hours_per_turn * 3600;
      const turn = this.turns - this.left;

      if (turn < (this.turns / 2)) {
        const s = turn * secPerTurn;
        const d = Physics.range(s, 0, this.accel);
        this.velocity = Physics.velocity(s, 0, this.accel);
        this.coords = Physics.pointAtDistanceAlongLine(this.start, this.end, d)
          .map(n => {return Math.ceil(n)});
      }
      else {
        const s = ((this.turns / 2) - this.left) * secPerTurn;
        const d = Physics.range(s, this.maxVelocity, -this.accel);
        this.velocity = Physics.velocity(s, this.maxVelocity, -this.accel);
        this.coords = Physics.pointAtDistanceAlongLine(this.start, this.end, this.flipDistance + d)
          .map(n => {return Math.ceil(n)});
      }
    }
  }

  distanceRemaining() {
    return Physics.distance(this.coords, this.end);
  }

  auRemaining() {
    return Physics.AU(this.distanceRemaining());
  }
}
