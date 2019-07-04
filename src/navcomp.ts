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
  navcomp: {
    memory: {
      buffer: ArrayBuffer;
    },

    alloc: (size: number) => number;
    free: (ptr: number, len: number) => void;

    course_new: (turns: number) => number;
    course_del: (key: number) => void;

    course_set_final_position: (key: number, x: number, y: number, z: number) => void;
    course_set_final_velocity: (key: number, x: number, y: number, z: number) => void;
    course_set_initial_position: (key: number, x: number, y: number, z: number) => void;
    course_set_initial_velocity: (key: number, x: number, y: number, z: number) => void;

    course_build_path: (key: number) => void;
    course_max_velocity: (key: number) => number;
    course_accel: (key: number, ptr: number, len: number) => number;
    course_segment: (key: number, ptr: number, len: number) => boolean;
  };
}

export function calculate_acceleration(turns: number, initial: Body, final: Body): Acceleration {
  const key = wasm.navcomp.course_new(turns);

  wasm.navcomp.course_set_initial_position(key, ...initial[POSITION]);
  wasm.navcomp.course_set_initial_velocity(key, ...initial[VELOCITY]);
  wasm.navcomp.course_set_final_position(key, ...final[POSITION]);
  wasm.navcomp.course_set_final_velocity(key, ...final[VELOCITY]);

  const size_arg = 2 * Uint32Array.BYTES_PER_ELEMENT;
  const size_res = 4 * Float64Array.BYTES_PER_ELEMENT;

  const ptr = wasm.navcomp.alloc(size_res);
  wasm.navcomp.course_accel(key, ptr, size_res);

  const [res_ptr, res_len] = new Uint32Array(wasm.navcomp.memory.buffer.slice(ptr, ptr + size_arg));
  const [len, x, y, z] = new Float64Array(wasm.navcomp.memory.buffer.slice(res_ptr, res_ptr + size_res));

  wasm.navcomp.free(ptr, size_arg);
  wasm.navcomp.course_del(key);

  return {
    length: len,
    vector: [x, y, z],
  };
}

export function calculate_path(turns: number, initial: Body, final: Body): Trajectory {
  const key = wasm.navcomp.course_new(turns);

  wasm.navcomp.course_set_initial_position(key, ...initial[POSITION]);
  wasm.navcomp.course_set_initial_velocity(key, ...initial[VELOCITY]);
  wasm.navcomp.course_set_final_position(key, ...final[POSITION]);
  wasm.navcomp.course_set_final_velocity(key, ...final[VELOCITY]);
  wasm.navcomp.course_build_path(key);

  const size_arg = 2 * Uint32Array.BYTES_PER_ELEMENT;
  const size_res = 4 * Float64Array.BYTES_PER_ELEMENT;

  const ptr = wasm.navcomp.alloc(size_res);
  const path: Trajectory = [];

  for (let i = 0; i < turns + 1; ++i) { // turns+1 because initial position is the first segment
    const result = wasm.navcomp.course_segment(key, ptr, size_res);

    if (result) {
      const [res_ptr, res_len] = new Uint32Array(wasm.navcomp.memory.buffer.slice(ptr, ptr + size_arg));
      const [vel, x, y, z] = new Float64Array(wasm.navcomp.memory.buffer.slice(res_ptr, res_ptr + size_res));

      path.push({
        position: [x, y, z],
        velocity: vel,
      });
    }
  }

  wasm.navcomp.free(ptr, size_arg);
  wasm.navcomp.course_del(key);

  return path;
}

const SPT = data.hours_per_turn * 3600; // seconds per turn
const DT  = 200;                        // frames per turn for euler integration
const TI  = SPT / DT;                   // seconds per frame


export interface SavedCourse {
  target:   Body;
  agent:    Body;
  accel:    Point;
  turns:    number;
}

export interface PathSegment {
  position: Point;
  velocity: number;
}

export type Trajectory = PathSegment[];

export interface Acceleration {
  length: number;
  vector: Point;
}

export type Body = [
  Point, // position
  Point  // velocity
];

const POSITION = 0;
const VELOCITY = 1;


export class Course {
  key:    number;
  turns:  number;
  target: Body;
  agent:  Body;
  acc:    number;
  accel:  Point;
  _path:  null | PathSegment[];

  constructor(target: Body, agent: Body, turns: number) {
    this.key    = wasm.navcomp.course_new(turns);
    this.turns  = turns;
    this.target = target;
    this.agent  = agent;

    wasm.navcomp.course_set_initial_position(this.key, agent[POSITION][0], agent[POSITION][1], agent[POSITION][2]);
    wasm.navcomp.course_set_initial_velocity(this.key, agent[VELOCITY][0], agent[VELOCITY][1], agent[VELOCITY][2]);
    wasm.navcomp.course_set_final_position(this.key, target[POSITION][0], target[POSITION][1], target[POSITION][2]);
    wasm.navcomp.course_set_final_velocity(this.key, target[VELOCITY][0], target[VELOCITY][1], target[VELOCITY][2]);

    [this.acc, this.accel] = Course.fetch_accel(this.key);

    this._path = null;
  }

  static import(opt: SavedCourse): Course {
    return new Course(opt.target, opt.agent, opt.turns);
  }

  static fetch_accel(key: number): [number, Point] {
    const size_arg = 2 * Uint32Array.BYTES_PER_ELEMENT;
    const size_res = 4 * Float64Array.BYTES_PER_ELEMENT;

    const ptr = wasm.navcomp.alloc(size_res);
    wasm.navcomp.course_accel(key, ptr, size_res);

    const [res_ptr, res_len] = new Uint32Array(wasm.navcomp.memory.buffer.slice(ptr, ptr + size_arg));
    const [len, x, y, z] = new Float64Array(wasm.navcomp.memory.buffer.slice(res_ptr, res_ptr + size_res));
    wasm.navcomp.free(ptr, size_arg);

    return [len, [x, y, z]];
  }

  static fetch_next_segment(key: number): PathSegment|null {
    const size_arg = 2 * Uint32Array.BYTES_PER_ELEMENT;
    const size_res = 4 * Float64Array.BYTES_PER_ELEMENT;

    const ptr = wasm.navcomp.alloc(size_res);
    const result = wasm.navcomp.course_segment(key, ptr, size_res);

    const [res_ptr, res_len] = new Uint32Array(wasm.navcomp.memory.buffer.slice(ptr, ptr + size_arg));
    const [vel, x, y, z] = new Float64Array(wasm.navcomp.memory.buffer.slice(res_ptr, res_ptr + size_res));
    wasm.navcomp.free(ptr, size_arg);

    if (result) {
      return {
        position: [x, y, z],
        velocity: vel,
      };
    }

    //wasm.navcomp.course_del(key);
    return null;
  }

  maxVelocity(): number {
    return wasm.navcomp.course_max_velocity(this.key);
  }

  path(): PathSegment[] {
    wasm.navcomp.course_build_path(this.key);

    if (!this._path) {
      this._path = [];

      let segment: PathSegment | null;
      while ((segment = Course.fetch_next_segment(this.key)) != null) {
        this._path.push(segment);
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
