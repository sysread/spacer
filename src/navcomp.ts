import data  from './data';
import system from './system';
import Physics from './physics';
import { TransitPlan } from './transitplan';
import { Person } from './person';
import { Point } from './vector';
import * as Vec from './vector';
import * as util from './util';
import * as t from './common';

const SPT = data.hours_per_turn * 3600; // seconds per turn
const DT  = 200;                        // frames per turn for euler integration
const TI  = SPT / DT;                   // seconds per frame


export interface SavedCourse {
  target:   Body;
  agent:    Body;
  accel:    Point;
  maxAccel: number;
  turns:    number;
}

export interface PathSegment {
  position: Point;
  velocity: number;
}

export type Body = [
  Point, // position
  Point  // velocity
];

const POSITION = 0;
const VELOCITY = 1;


export class Course {
  target:   Body;
  agent:    Body;
  accel:    Point;
  maxAccel: number;
  turns:    number;
  tflip:    number;
  dt:       number;
  _path:    null | PathSegment[];

  constructor(target: Body, agent: Body, maxAccel: number, turns: number, dt?: number) {
    this.target   = target;
    this.agent    = agent;
    this.maxAccel = maxAccel;
    this.turns    = turns;
    this.tflip    = (SPT * this.turns) / 2; // seconds to flip point
    this.accel    = this.calculateAcceleration();
    this.dt       = dt || DT;
    this._path    = null;
  }

  export(): SavedCourse {
    return {
      target:   this.target,
      agent:    this.agent,
      accel:    this.accel,
      maxAccel: this.maxAccel,
      turns:    this.turns,
    };
  }

  static import(opt: SavedCourse): Course {
    return new Course(opt.target, opt.agent, opt.maxAccel, opt.turns);
  }

  get acc(): Point { return Vec.clone(this.accel) }

  // a = (2s / t^2) - (2v / t)
  calculateAcceleration(): Point {
    // Calculate portion of target velocity to match by flip point
    const dvf = Vec.mul_scalar(this.target[VELOCITY], 2 / this.tflip);

    // Calculate portion of total change in velocity to apply by flip point
    const dvi = Vec.mul_scalar(Vec.sub(this.agent[VELOCITY], dvf), 2 / this.tflip);

    let acc = Vec.sub(this.target[POSITION], this.agent[POSITION]); // (2s / 2) for flip point
    acc = Vec.div_scalar(acc, this.tflip * this.tflip);             // t^2
    acc = Vec.sub(acc, dvi);                                        // less the change in velocity

    return acc;
  }

  maxVelocity(): number {
    const t = this.tflip;
    return Vec.length( Vec.mul_scalar(this.accel, t) );
  }

  path(): PathSegment[] {
    if (!this._path) {
      let p      = this.agent[POSITION];                   // initial position
      let v      = this.agent[VELOCITY];                   // initial velocity
      const TI   = SPT / this.dt;
      const vax  = Vec.mul_scalar(this.acc, TI);           // static portion of change in velocity each TI
      const dax  = Vec.mul_scalar(this.acc, TI * TI / 2);  // static portion of change in position each TI
      const path = [];

      let t = 0;

      // Start with initial position
      path.push({ position: p, velocity: Vec.length(v) });

      for (let turn = 0; turn < this.turns; ++turn) {
        // Split turn's updates into DT increments to prevent inaccuracies
        // creeping into the final result.
        for (let i = 0; i < this.dt; ++i) {
          t += TI;

          if (t > this.tflip) {
            v = Vec.sub(v, vax); // decelerate after flip
          } else if (t < this.tflip) {
            v = Vec.add(v, vax); // accelerate before flip
          }

          // Update position
          p = Vec.add(p, Vec.add(Vec.mul_scalar(v, TI), dax));
        }

        path.push({ position: p, velocity: Vec.length(v) });
      }

      this._path = path;
    }

    return this._path;
  }
}


export class NavComp {
  player:     Person;
  orig:       t.body;
  showAll:    boolean;
  fuelTarget: number;
  max:        number;
  data:       undefined | any;
  dt:         undefined | number;
  nominal:    boolean;

  constructor(player: Person, orig: t.body, showAll?: boolean, fuelTarget?: number, nominal?: boolean) {
    this.player  = player;
    this.orig    = orig;
    this.showAll = showAll || false;
    this.max     = player.maxAcceleration();
    this.nominal = nominal ? true : false;

    if (!this.nominal && fuelTarget !== undefined) {
      this.fuelTarget = Math.min(fuelTarget, this.player.ship.fuel);
    } else if (this.nominal) {
      this.fuelTarget = this.player.ship.tank;
    } else {
      this.fuelTarget = this.player.ship.fuel;
    }
  }

  async getTransitsTo(dest: t.body) {
    if (!this.data) {
      this.data = {};
    }

    if (!this.data[dest]) {
      this.data[dest] = [];

      const transits = this.astrogator(dest);

      for await (const transit of transits) {
        this.data[dest].push(transit);
      }
    }

    return this.data[dest];
  }

  // TODO this does not match Course.calculateAcceleration() in the slightest.
  async guestimate(dest: t.body) {
    const max_turns  = data.turns_per_day * 365;
    const start_pos  = await system.position(this.orig);
    const start_time = system.time.getTime();

    for (let i = 1; i < max_turns; ++i) {
      const t      = i * data.hours_per_turn * 3600;
      const end    = await system.position(dest, start_time + t);
      const s      = Physics.distance(start_pos, end);
      const t_flip = Math.ceil(t / 2);
      const s_flip = s / 2;
      const v      = (2 * s_flip) / t_flip;
      const a      = Math.abs(((2 * s_flip) / (t_flip * t_flip)) - ((2 * v) / t_flip));

      if (a <= this.max) {
        const target: Body = [end, [0, 0, 0]];
        const agent:  Body = [start_pos, [0, 0, 0]];
        const course = new Course(target, agent, a, i, this.dt);

        return new TransitPlan({
          origin: this.orig,
          dest:   dest,
          start:  start_pos,
          end:    end,
          dist:   s,
          fuel:   this.player.ship.burnRate(a) * i,
          course: course,
        });
      }
    }
  }

  async getFastestTransitTo(dest: t.body) {
    const transits = this.astrogator(dest);
    for await (const transit of transits) {
      return transit;
    }
  }

  getShipAcceleration() {
    if (this.nominal) {
      return Physics.deltav(this.player.ship.thrust, this.player.ship.currentMass())
    } else {
      return this.player.shipAcceleration();
    }
  }

  getShipMass() {
    if (this.nominal) {
      return this.player.ship.nominalMass(true);;
    } else {
      return this.player.ship.currentMass();
    }
  }

  async *astrogator(destination: t.body) {
    const orig     = await system.orbit_by_turns(this.orig);
    const dest     = await system.orbit_by_turns(destination);
    const vInit    = Vec.div_scalar( Vec.sub(orig[1], orig[0]), SPT );
    const bestAcc  = Math.min(this.player.maxAcceleration(), this.getShipAcceleration());
    const fuelrate = this.player.ship.fuelrate;
    const thrust   = this.player.ship.thrust;
    const fuel     = this.fuelTarget;
    const mass     = this.getShipMass();

    let prevFuelUsed;

    for (let turns = 1; turns < dest.length; ++turns) {
      const distance      = Physics.distance(orig[0], dest[turns]);
      const fuelPerTurn   = Math.min(fuel / turns, fuelrate);
      const thrustPerTurn = thrust * fuelPerTurn / fuelrate;
      const availAcc      = thrustPerTurn / mass;
      const maxAccel      = Math.min(bestAcc, availAcc);
      const vFinal        = Vec.div_scalar( Vec.sub(dest[turns], dest[turns - 1]), SPT );
      const target: Body  = [ dest[turns], vFinal ];
      const agent: Body   = [ orig[0], vInit ];
      const course        = new Course(target, agent, maxAccel, turns, this.dt);
      const a             = Vec.length(course.accel);

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
        start:  orig[0],
        end:    dest[turns],
        dist:   distance,
        fuel:   fuelUsed,
        course: course,
      });
    }
  }
}
