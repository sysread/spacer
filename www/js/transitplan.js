define(function(require, exports, module) {
  const data    = require('data');
  const util    = require('util');
  const Physics = require('physics');
  const math_ds = require('vendor/math-ds');
  const Vector3 = math_ds.Vector3;
  require('vendor/jsspline');

  return class {
    constructor(opt) {
      this.opt          = opt || {};
      this.left         = this.turns;
      this.coords       = this.start;
      this.flipDistance = this.dist / 2;
      this.flipTime     = this.turns * data.hours_per_turn * 3600 * 0.5;
      this.flipPoint    = Physics.segment(this.start, this.end, this.flipDistance);
      this.maxVelocity  = Physics.velocity(this.flipTime, 0, this.accel);
      this.velocity     = 0;
    }

    get currentTurn() { return this.turns - this.left }

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
    get au() { return this.dist / Physics.AU }              // distance in AU

    get is_complete()  { return this.left === 0 }
    get pct_complete() { return Math.ceil(100 - (this.left * this.turnpct)) }

    get days_hours() {
      let d = this.hours / 24;
      let h = this.hours % 24;
      return [d.toFixed(0), h];
    }

    get path() {
      if (!this._path)
        this._path = this.build_path();
      return this._path;
    }

    build_path() {
      const path = [];
      const flip = Math.ceil(this.turns / 2);
      const spt  = data.hours_per_turn * 3600;

      let s = 0, d = 0, v = 0, p = this.start;

      for (let turn = 0; turn < this.turns; ++turn) {
        // Accelerating
        if (turn < flip) {
          s = turn * spt;
          d = Physics.range(s, 0, this.accel);
          v = Physics.velocity(s, 0, this.accel);
          p = Physics.segment(this.start, this.end, d).map(Math.ceil);
        }
        // Decelerating
        else {
          s = (flip - (this.turns - turn)) * spt;
          d = Physics.range(s, this.maxVelocity, -this.accel);
          v = Physics.velocity(s, this.maxVelocity, -this.accel);
          p = Physics.segment(this.start, this.end, this.flipDistance + d).map(Math.ceil);
        }

        path.push({
          distance: d,
          velocity: v,
          position: p,
        });
      }

      return path;
    }

    get prettyPath() {
      if (!this.pretty) {
        const clockwise = (Math.atan(this.start[1] / this.start[0]) - Math.atan(this.end[1] / this.end[0])) > 0;
        const curve = new jsspline.BSpline({steps: 100});
        const flip = this.turns / 2;

        curve.addWayPoint({x: this.start[0], y: this.start[1], z: this.start[2]});

        for (let i = 1; i < this.turns - 1; ++i) {
          const [x, y, z] = this.path[i].position;

          const scale = clockwise
            ? (i / this.turns)
            : ((flip - i) / flip);

          let factor = Math.sin( scale * Math.PI ) * 0.2;

          factor = clockwise
            ? 1 - factor
            : 1 + factor;

          curve.addWayPoint({
            x: x * factor,
            y: y,
            z: z,
          });
        }

        curve.addWayPoint({x: this.end[0], y: this.end[1], z: this.end[2]});

        const path = [];
        const nodes = curve.nodes.length;
        for (let i = 0; i < this.turns; ++i) {
          const idx = Math.floor(i * (nodes / this.turns));
          path.push(curve.nodes[idx]);
        }

        this.pretty = path;
      }

      return this.pretty;
    }

    turn() {
      if (!this.is_complete) {
        const turn = this.turns - this.left;
        --this.left;

        this.velocity = this.path[turn].velocity;
        //this.coords = this.path[turn].position;
        this.coords = [
          this.prettyPath[turn].x,
          this.prettyPath[turn].y,
          this.prettyPath[turn].z,
        ];
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
