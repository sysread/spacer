define(function(require, exports, module) {
  const data        = require('data');
  const util        = require('util');
  const system      = require('system');
  const Physics     = require('physics');
  const TransitPlan = require('transitplan');
  const Vector3     = require('vendor/math-ds').Vector3;
  const Steering    = require('steering');
  const SPT         = data.hours_per_turn * 3600;
  const SPT2        = SPT * SPT;

  function Vector(x=0, y=0, z=0) {
    return x instanceof Array
      ? (new Vector3).fromArray(x)
      : new Vector3(x, y, z);
  }

  const NavComp = class {
    constructor(fuel_target) {
      this.fuel_target = fuel_target || game.player.ship.fuel;
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
        if (prev === undefined || prev >= transit.fuel) {
          prev = transit.fuel;
        } else {
          //continue;
        }

        transits.push(transit);
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

    *astrogator(origin, destination) {
      const orig     = system.orbit_by_turns(origin);
      const dest     = system.orbit_by_turns(destination);
      const startPos = Vector(orig[0]);
      const vInit    = Vector(orig[1]).sub( Vector(orig[0]) ).divideScalar(SPT);
      const bestAcc  = Math.min(game.player.maxAcceleration(), game.player.shipAcceleration());
      const mass     = game.player.ship.currentMass();
      const fuelrate = game.player.ship.fuelrate;
      const thrust   = game.player.ship.thrust;
      const fuel     = this.fuel_target;

      let prevFuelUsed;

      for (let turns = 1; turns < dest.length; ++turns) {
        const fuelPerTurn   = Math.min(fuel / turns, fuelrate);
        const burnRatio     = fuelPerTurn / fuelrate;
        const thrustPerTurn = thrust * burnRatio;
        const availAcc      = thrustPerTurn / mass;
        const maxAccel      = Math.min(bestAcc, availAcc);
        const targetPos     = Vector(dest[turns]);
        const vFinal        = targetPos.clone().sub(Vector(dest[turns - 1])).divideScalar(SPT);
        const target        = new Steering.Body(targetPos, vFinal.clone());
        const agent         = new Steering.Body(startPos.clone(), vInit.clone()); // add target velocity
        const steering      = new Steering.Steering(target, agent, maxAccel);
        const path          = [];

        let maxVel   = 0;
        let maxAcc   = 0;
        let fuelUsed = 0;
        let arrived  = false;

        for (let turn = 0; turn < turns; ++turn) {
          const t = (turns - turn) * SPT;
          const a = steering.getAcceleration(t);

          if (!a) {
            // If this is the first route to arrive, it sets the base for max
            // fuel usage. After that, only include routes with better or equal
            // fuel usage to the previous.
            if (prevFuelUsed === undefined || fuelUsed <= prevFuelUsed) {
              prevFuelUsed = fuelUsed;
              arrived = true;
            } 

            break;
          }

          fuelUsed += a.length() / availAcc * fuelPerTurn * .99; // adjust for float rounding error

          if (fuelUsed > fuel) {
            break;
          }

          agent.update(SPT, a);

          if (agent.velocity.length() > maxVel)
            maxVel = agent.velocity.length();

          if (a.length() > maxAcc)
            maxAcc = a.length();

          path.push({
            position: agent.position.clone(),
            velocity: agent.velocity.length(),
            acceleration: a.length(),
            fuel: fuelUsed,
          });
        }

        if (arrived) {
          yield new TransitPlan({
            origin: origin,
            dest:   destination,
            turns:  turns,
            fuel:   fuelUsed,
            start:  orig[0],
            end:    dest[turns],
            dist:   agent.distance,
            vel:    maxVel,
            accel:  maxAcc,
            path:   path,
          });
        }
      }
    }
  };

  return NavComp;
});
