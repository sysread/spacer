define(function(require, exports, module) {
  const data        = require('data');
  const system      = require('system');
  const Physics     = require('physics');
  const TransitPlan = require('transitplan');
  const math_ds     = require('vendor/math-ds');
  const Vector3     = math_ds.Vector3;

  const NavComp = class {
    constructor() {
      this.max  = game.player.maxAcceleration();
      this.ship = game.player.ship;
      this.orig = game.here.body;
    }

    get maxdv() { return Math.min(this.max, this.ship.currentAcceleration()) }

    get transits() {
      if (this.data === undefined) {
        this.data = {};

        for (const dest of system.bodies()) {
          if (!this.data.hasOwnProperty(dest)) {
            this.data[dest] = this.getTransitsTo(dest);
          }
        }
      }

      return this.data;
    }

    getTransitsTo(dest) {
      const transits = [];
      let prev;

      for (let transit of this.astrogator(this.orig, dest)) {
        if (transit.accel > this.maxdv) continue;
        if (transit.turns > this.ship.maxBurnTime(transit.accel)) continue;

        let fuel = transit.turns * this.ship.burnRate(transit.accel, this.ship.currentMass());

        if (prev === undefined || prev >= fuel) {
          prev = fuel;
        }
        else {
          continue;
        }

        if (this.ship.fuel < fuel) {
          continue;
        }

        transits.push({
          index   : transits.length,
          transit : transit,
          turns   : transit.turns,
          fuel    : fuel,
        });
      }

      return transits;
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
      const orig = system.orbit_by_turns(origin);
      const dest = system.orbit_by_turns(target);
      const s_per_turn = data.hours_per_turn * 3600;
      const v_init = (new Vector3).fromArray(orig[1]).sub((new Vector3).fromArray(orig[0]));

      for (var i = 1; i < dest.length; ++i) {
        const S = Physics.distance(orig[0], dest[i]);       // distance
        const t = i * s_per_turn;                           // seconds until target is at destination
        const a = Physics.requiredDeltaV(t * 0.5, S * 0.5); // deltav to reach flip point
        const v_final = (new Vector3).fromArray(dest[i - 1]).sub((new Vector3).fromArray(dest[i]));
        const v_diff  = v_final.clone().sub(v_init);

        yield new TransitPlan({
          origin:  origin,
          dest:    target,
          dist:    S,
          turns:   i,
          accel:   a,
          start:   orig[0],
          end:     dest[i],
          v_init:  v_init.clone(),
          v_final: v_final,
          v_diff:  v_diff,
        });
      }
    }
  };

  return NavComp;
});
