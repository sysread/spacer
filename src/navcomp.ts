import data  from './data';
import system from './system';
import Physics from './physics';
import TransitPlan from './transitplan';
import Person from './person';
import { vec, Vector, PointArray, PointObject } from './vector';
import * as util from './util';
import * as t from './common';

const SPT = data.hours_per_turn * 3600; // seconds per turn
const DT  = 1000;                       // frames per turn for euler integration
const TI  = SPT / DT;                   // seconds per frame


class Body {
  position: Vector;
  velocity: Vector;

  constructor(position: Vector, velocity: Vector) {
    this.position = position.clone();
    this.velocity = velocity.clone();
  }

  get pos() { return this.position.clone() }
  get vel() { return this.velocity.clone() }
}

interface PathSegment {
  position: PointArray;
  velocity: number;
}

class Course {
  target:   Body;
  agent:    Body;
  accel:    Vector;
  maxAccel: number;
  turns:    number;
  tflip:    number;
  _path:    null|PathSegment[];

  constructor(target: Body, agent: Body, maxAccel: number, turns: number) {
    this.target   = target;
    this.agent    = agent;
    this.maxAccel = maxAccel;
    this.turns    = turns;
    this.tflip    = SPT * this.turns / 2; // seconds to flip point
    this.accel    = this.calculateAcceleration();
    this._path    = null;
  }

  get acc() { return this.accel.clone() }

  // a = (2s / t^2) - (2v / t)
  calculateAcceleration() {
    // Calculate portion of target velocity to match by flip point
    const dvf = this.target.vel
      .mul_scalar(2 / this.tflip);

    // Calculate portion of total change in velocity to apply by flip point
    const dvi = this.agent.vel
      .sub(dvf)
      .mul_scalar(2 / this.tflip);

    return this.target.pos                  // change in position
      .sub(this.agent.position)             // (2s / 2) for flip point
      .div_scalar(this.tflip * this.tflip)  // t^2
      .sub(dvi);                            // less the change in velocity
  }

  maxVelocity() {
    const t = this.tflip;
    return this.accel.clone().mul_scalar(t).length;
  }

  path() {
    if (this._path != null) {
      return this._path;
    }

    const p    = this.agent.pos;                   // initial position
    const v    = this.agent.vel;                   // initial velocity
    const vax  = this.acc.mul_scalar(TI);          // static portion of change in velocity each TI
    const dax  = this.acc.mul_scalar(TI * TI / 2); // static portion of change in position each TI
    const path = [];

    let t = 0;

    for (let turn = 0; turn < this.turns; ++turn) {
      // Split turn's updates into DT increments to prevent inaccuracies
      // creeping into the final result.
      for (let i = 0; i < DT; ++i) {
        t += TI;

        if (t > this.tflip) {
          v.sub(vax); // decelerate after flip
        } else {
          v.add(vax); // accelerate before flip
        }

        // Update position
        p.add( v.clone().mul_scalar(TI).add(dax) );
      }

      const segment = {
        position: p.clone().point,
        velocity: v.clone().length,
      };

      path.push(segment);
    }

    this._path = path;
    return path;
  }
}


class NavComp {
  player:      Person;
  orig:        t.body;
  show_all:    boolean;
  fuel_target: number;
  max:         number;
  data:        undefined | any;

  constructor(player: Person, orig: t.body, show_all?: boolean, fuel_target?: number) {
    this.player      = player;
    this.orig        = orig;
    this.fuel_target = fuel_target || player.ship.fuel;
    this.show_all    = show_all || false;
    this.max         = player.maxAcceleration();
  }

  getTransitsTo(dest: t.body) {
    if (!this.data) {
      this.data = {};
    }

    if (!this.data[dest]) {
      this.data[dest] = [];

      const transits = this.astrogator(dest);

      for (const transit of transits) {
        this.data[dest].push(transit);
      }
    }

    return this.data[dest];
  }

  *astrogator(destination: t.body) {
    const orig     = system.orbit_by_turns(this.orig);
    const dest     = system.orbit_by_turns(destination);
    const startPos = vec(orig[0]);
    const vInit    = vec(orig[1]).sub( vec(orig[0]) ).div_scalar(SPT);
    const bestAcc  = Math.min(this.player.maxAcceleration(), this.player.shipAcceleration());
    const mass     = this.player.ship.currentMass();
    const fuelrate = this.player.ship.fuelrate;
    const thrust   = this.player.ship.thrust;
    const fuel     = this.fuel_target;

    let prevFuelUsed;

    for (let turns = 1; turns < dest.length; ++turns) {
      const distance      = Physics.distance(orig[0], dest[turns]);
      const fuelPerTurn   = Math.min(fuel / turns, fuelrate);
      const thrustPerTurn = thrust * fuelPerTurn / fuelrate;
      const availAcc      = thrustPerTurn / mass;
      const maxAccel      = Math.min(bestAcc, availAcc);
      const targetPos     = vec(dest[turns]);
      const vFinal        = targetPos.clone().sub(vec(dest[turns - 1])).div_scalar(SPT);
      const target        = new Body(targetPos, vFinal);
      const agent         = new Body(startPos, vInit);
      const course        = new Course(target, agent, maxAccel, turns);
      const a             = course.accel.length;

      if (a > maxAccel)
        continue;

      const fuelUsed = a / availAcc * fuelPerTurn * turns * 0.99; // `* 0.99` to work around rounding error
      const fuelUsedPerTurn = fuelUsed / turns;

      if (fuelUsed > fuel)
        continue;

      if (prevFuelUsed === undefined || prevFuelUsed >= fuelUsed) {
        prevFuelUsed = fuelUsed;
      } else {
        continue;
      }

      yield new TransitPlan({
        origin: this.orig,
        dest:   destination,
        start:  startPos.point,
        end:    targetPos.point,
        dist:   distance,
        fuel:   fuelUsed,
        course: course,
      });
    }
  }
}

export = NavComp;