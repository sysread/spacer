define(function(require, exports, module) {
  const data        = require('data');
  const util        = require('util');
  const system      = require('system');
  const Physics     = require('physics');
  const TransitPlan = require('transitplan');
  const Vector3     = require('vendor/math-ds').Vector3;

  const SPT = data.hours_per_turn * 3600; // seconds per turn
  const DT  = 100;                        // frames per turn for euler integration
  const TI  = SPT / DT;                   // seconds per frame


  function Vector(x=0, y=0, z=0) {
    return x instanceof Array
      ? (new Vector3).fromArray(x)
      : new Vector3(x, y, z);
  }


  const Body = class {
    constructor(position, velocity) {
      this.position = position.clone();
      this.velocity = velocity.clone();
    }

    get pos() { return this.position.clone() }
    get vel() { return this.velocity.clone() }
  };


  const Course = class {
    /*
     * target: kinematics data for target body
     * agent:  kinematics data for agent
     */
    constructor(target, agent, maxAccel, turns) {
      this.target   = target;
      this.agent    = agent;
      this.maxAccel = maxAccel;
      this.turns    = turns;
      this.accel    = this.calculateAcceleration();
    }

    get acc() { return this.accel.clone() }

    calculateAcceleration() {
      const tflip = SPT * this.turns / 2;

      const dvf = this.target.vel
        .multiplyScalar(2 / tflip);

      const dvi = this.agent.vel
        .sub(dvf)
        .multiplyScalar( 2 / tflip );

      return this.target.pos
        .sub(this.agent.pos)
        .divideScalar(tflip * tflip)
        .sub(dvi);
    }

    *path() {
      const flip = Math.ceil(this.turns / 2);            // flip and decel turn
      const p    = this.agent.pos;                       // initial position
      const v    = this.agent.vel;                       // initial velocity
      const vax  = this.acc.multiplyScalar(TI);          // change in velocity each TI
      const dax  = this.acc.multiplyScalar(TI * TI / 2); // change in position each TI

      for (let turn = 0; turn < this.turns; ++turn) {
        // Split turn's updates into DT increments to prevent inaccuracies
        // creeping into the final result.
        for (let i = 0; i < DT; ++i) {
          if (turn >= flip) {
            v.sub(vax); // decelerate after flip
          } else {
            v.add(vax); // accelerate before flip
          }

          // Update position
          p.add( v.clone().multiplyScalar(TI).add(dax) );
        }

        yield {
          position: p.clone(),
          velocity: v.clone(),
        };
      }
    }
  };


  const NavComp = class {
    constructor(fuel_target, show_all) {
      this.fuel_target = fuel_target || game.player.ship.fuel;
      this.show_all = show_all || false;
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

      for (let turns = 1; turns < dest.length; ++turns) {
        const distance      = Physics.distance(orig[0], dest[turns]);
        const fuelPerTurn   = Math.min(fuel / turns, fuelrate);
        const thrustPerTurn = thrust * fuelPerTurn / fuelrate;
        const availAcc      = thrustPerTurn / mass;
        const maxAccel      = Math.min(bestAcc, availAcc);
        const targetPos     = Vector(dest[turns]);
        const vFinal        = targetPos.clone().sub(Vector(dest[turns - 1])).divideScalar(SPT);
        const target        = new Body(targetPos, vFinal);
        const agent         = new Body(startPos, vInit);
        const course        = new Course(target, agent, maxAccel, turns);
        const a             = course.accel.length();

        if (a > maxAccel)
          continue;

        const fuelUsed = a / availAcc * fuelPerTurn * turns * 0.99; // `* 0.99` to work around rounding error
        const fuelUsedPerTurn = fuelUsed / turns;

        if (fuelUsed > fuel)
          continue;

        let max_vel = 0;
        let idx = 0;

        const path = [];

        for (let seg of course.path()) {
          if (seg.velocity.length() > max_vel) {
            max_vel = seg.velocity.length();
          }

          seg.fuel = fuelUsedPerTurn * (idx + 1);
          path.push(seg);

          ++idx;
        }

        yield new TransitPlan({
          origin: origin,
          dest:   destination,
          turns:  turns,
          fuel:   fuelUsed,
          start:  orig[0],
          end:    dest[turns],
          dist:   distance,
          vel:    max_vel,
          accel:  a,
          path:   path,
        });
      }
    }
  };

  return NavComp;
});
