import data  from './data';
import system from './system';
import Physics from './physics';
import { TransitPlan } from './transitplan';
import { Person } from './person';
import { Point } from './vector';
import * as Vec from './vector';
import * as util from './util';
import * as t from './common';


declare var wasm: {
  vector: {
    course_new: (turns: number) => number;
    course_set_final_position: (key: number, x: number, y: number, z: number) => void;
    course_set_final_velocity: (key: number, x: number, y: number, z: number) => void;
    course_set_initial_position: (key: number, x: number, y: number, z: number) => void;
    course_set_initial_velocity: (key: number, x: number, y: number, z: number) => void;

    course_build_path: (key: number) => void;

    course_max_velocity: (key: number) => number;

    course_acceleration: (key: number) => number;
    course_acceleration_x: (key: number) => number;
    course_acceleration_y: (key: number) => number;
    course_acceleration_z: (key: number) => number;

    course_next_segment: (key: number) => boolean;
    course_segment_position_x: (key: number) => number;
    course_segment_position_y: (key: number) => number;
    course_segment_position_z: (key: number) => number;
    course_segment_velocity_x: (key: number) => number;
    course_segment_velocity_y: (key: number) => number;
    course_segment_velocity_z: (key: number) => number;
    course_segment_velocity: (key: number) => number;
  }
}


const SPT = data.hours_per_turn * 3600; // seconds per turn
const DT  = 200;                        // frames per turn for euler integration
const TI  = SPT / DT;                   // seconds per frame


export interface SavedCourse {
  target:   Body;
  agent:    Body;
  accel:    Point;
  //maxAccel: number;
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
  key: number;
  turns: number;
  target: Body;
  agent: Body;
  acc: number;
  accel: Point;
  _path: null | PathSegment[];

  constructor(target: Body, agent: Body, turns: number) {
    this.key = wasm.vector.course_new(turns);
    this.turns = turns;
    this.target = target;
    this.agent = agent;

    wasm.vector.course_set_initial_position(this.key, agent[POSITION][0], agent[POSITION][1], agent[POSITION][2]);
    wasm.vector.course_set_initial_velocity(this.key, agent[VELOCITY][0], agent[VELOCITY][1], agent[VELOCITY][2]);
    wasm.vector.course_set_final_position(this.key, target[POSITION][0], target[POSITION][1], target[POSITION][2]);
    wasm.vector.course_set_final_velocity(this.key, target[VELOCITY][0], target[VELOCITY][1], target[VELOCITY][2]);

    this.acc = wasm.vector.course_acceleration(this.key);
    this.accel = [
      wasm.vector.course_acceleration_x(this.key),
      wasm.vector.course_acceleration_y(this.key),
      wasm.vector.course_acceleration_z(this.key),
    ];

    this._path = null;
  }

  static import(opt: SavedCourse): Course {
    return new Course(opt.target, opt.agent, opt.turns);
  }

  maxVelocity(): number {
    return wasm.vector.course_max_velocity(this.key);
  }

  path(): PathSegment[] {
    wasm.vector.course_build_path(this.key);

    if (!this._path) {
      this._path = [];
      while (wasm.vector.course_next_segment(this.key)) {
        const px = wasm.vector.course_segment_position_x(this.key),
              py = wasm.vector.course_segment_position_y(this.key),
              pz = wasm.vector.course_segment_position_z(this.key),
              v = wasm.vector.course_segment_velocity(this.key);

        this._path.push({position: [px, py, pz], velocity: v});
      }
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

  // TODO this does not match Course.calculateAcceleration() in the slightest.
  guestimate(dest: t.body) {
    const max_turns  = data.turns_per_day * 365;
    const start_pos  = system.position(this.orig);
    const start_time = system.time.getTime();

    for (let i = 1; i < max_turns; ++i) {
      const t      = i * data.hours_per_turn * 3600;
      const end    = system.position(dest, start_time + t);
      const s      = Physics.distance(start_pos, end);
      const t_flip = Math.ceil(t / 2);
      const s_flip = s / 2;
      const v      = (2 * s_flip) / t_flip;
      const a      = Math.abs(((2 * s_flip) / Math.pow(t_flip, 2)) - ((2 * v) / t_flip));

      if (a <= this.max) {
        const target: Body = [end, [0, 0, 0]];
        const agent:  Body = [start_pos, [0, 0, 0]];
        //const course = new Course(target, agent, a, i, this.dt);
        const course = new Course(target, agent, i);

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

  getFastestTransitTo(dest: t.body) {
    const transits = this.astrogator(dest);
    for (const transit of transits) {
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

  *astrogator(destination: t.body) {
    const orig     = system.orbit_by_turns(this.orig);
    const dest     = system.orbit_by_turns(destination);
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
      //const course        = new Course(target, agent, maxAccel, turns, this.dt);
      const course        = new Course(target, agent, turns);
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
