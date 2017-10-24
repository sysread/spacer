define(function(require, exports, module) {
  const data        = require('data');
  const system      = require('system');
  const Game        = require('game');
  const Physics     = require('physics');
  const TransitPlan = require('transitplan');

  const NavComp = class {
    constructor() {
      this.max  = Game.game.player.maxAcceleration();
      this.ship = Game.game.player.ship;
      this.orig = Game.game.place().name;
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
        const a = Physics.requiredDeltaV(t * 0.5, S * 0.5); // deltav to reach flip point

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
  };

  return NavComp;
});
