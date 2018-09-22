define(function(require, exports, module) {
  const data    = require('data');
  const util    = require('util');
  const Physics = require('physics');

  return class {
    constructor(opt) {
      this.opt      = opt || {};
      this.left     = this.turns;
      this.coords   = this.start;
      this.velocity = 0;
    }

    get currentTurn()  { return this.turns - this.left }
    get origin()       { return this.opt.origin }                  // origin body name
    get dest()         { return this.opt.dest }                    // destination body name
    get dist()         { return this.opt.dist }                    // meters
    get turns()        { return this.opt.turns }                   // turns
    get accel()        { return this.opt.accel }                   // m/s/s
    get start()        { return this.opt.start }                   // start point (x, y, z)
    get end()          { return this.opt.end }                     // end point (x, y, z)
    get path()         { return this.opt.path }
    get fuel()         { return this.opt.fuel }
    get maxVelocity()  { return this.opt.vel }
    get hours()        { return this.turns * data.hours_per_turn } // hours
    get turnpct()      { return 100 / this.turns }                 // percent of trip per turn
    get km()           { return this.dist / 1000 }                 // distance in kilometers
    get au()           { return this.dist / Physics.AU }           // distance in AU
    get is_complete()  { return this.left === 0 }
    get pct_complete() { return Math.ceil(100 - (this.left * this.turnpct)) }
    get segment()      { return Physics.distance(this.start, this.end) }
    get segment_au()   { return this.segment / Physics.AU }

    get days_hours() {
      const d = this.hours / 24;
      const h = this.hours % 24;
      return [util.R(d), h];
    }

    get str_arrival() {
      const [d, h] = this.days_hours;
      return `${d} days, ${h} hours`;
    }

    turn() {
      if (!this.is_complete) {
        const turn = this.turns - this.left;
        --this.left;
        this.velocity = this.path[turn].velocity.length;
        this.coords   = this.path[turn].position.point;
      }
    }

    distanceRemaining() {
      return Physics.distance(this.coords, this.end);
    }

    auRemaining() {
      return this.distanceRemaining() / Physics.AU;
    }
  };
});
