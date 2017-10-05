class NavComp {
  constructor() {
    this.max  = game.player.maxAcceleration();
    this.ship = game.player.ship;
    this.orig = game.place().name;
  }

  get maxdv() { return Math.min(this.max, this.ship.currentAcceleration()) }

  get transits() {
    if (this.data === undefined) {
      this.data = {};

      for (let dest of system.bodies()) {
        this.data[dest] = [];
        let prev;

        for (let transit of this.astrogator(this.orig, dest)) {
          if (transit.accel > this.maxdv) continue;
          if (transit.turns > data.hours_per_turn * this.ship.maxBurnTime(transit.accel)) continue;

          let burn = data.hours_per_turn * this.ship.burnRate(transit.accel, this.ship.currentMass());
          let fuel = transit.turns * burn;

          if (prev === undefined || prev >= fuel) {
            prev = fuel;
          }
          else {
            continue;
          }

          if (this.ship.fuel < fuel) {
            continue;
          }

          this.data[dest].push({
            index   : this.data[dest].length,
            transit : transit,
            turns   : transit.turns,
            fuel    : fuel,
            burn    : burn
          });
        }
      }
    }

    return this.data;
  }

  search(destination, approve) {
    if (!approve) return this.transits[destination];
    return this.transits[destination].filter(approve);
  }

  fastest(destination) {
    if (this.transits[destination].length === 0) return;
    return this.transits[destination].reduce((a, b) => {
      return a.turns < b.turns ? a : b;
    });
  }

  *astrogator(origin, target) {
    let b2 = system.body(target);
    let p1 = system.position(origin);

    let orbit = system.orbit_by_turns(b2.key);
    const s_per_turn = data.hours_per_turn * 3600;

    for (var i = 1; i < orbit.length; ++i) {
      const S = Physics.distance(p1, orbit[i]); // distance
      const t = i * s_per_turn; // seconds until target is at destination
      const a = Physics.deltav_for_distance(t * 0.5, S * 0.5); // deltav to reach flip point

      yield new TransitPlan({
        origin : origin,
        dest   : target,
        dist   : S,
        turns  : i,
        accel  : a,
        start  : p1,
        end    : orbit[i]
      });
    }
  }
}

class TransitPlan {
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
