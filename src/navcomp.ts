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
    course_segment: (key: number, ptr: number, len: number) => boolean;

    course_accel: (turns: number, pxi: number, pyi: number, pzi: number, vxi: number, vyi: number, vzi: number, pxf: number, pyf: number, pzf: number, vxf: number, vyf: number, vzf: number, ptr: number, len: number) => boolean;
  };
}

const ARG_2_U32 = 2 * Uint32Array.BYTES_PER_ELEMENT;
const RES_4_F64 = 4 * Float64Array.BYTES_PER_ELEMENT;
const RES_5_F64 = 5 * Float64Array.BYTES_PER_ELEMENT;
const SPT       = data.hours_per_turn * 3600; // seconds per turn
const DT        = 200;                        // frames per turn for euler integration
const TI        = SPT / DT;                   // seconds per frame
const POSITION  = 0;
const VELOCITY  = 1;


export interface PathSegment {
  position: Point;
  velocity: number;
}

export interface Trajectory {
  max_velocity: number;
  path: PathSegment[];
}

export interface Acceleration {
  vector: Point;
  length: number;
  maxvel: number;
}

export interface Body {
  position: Point;
  velocity: Point;
}

// See comment about ugliness in navcomp.zig
export function calculate_acceleration(turns: number, initial: Body, final: Body): Acceleration {
  wasm.navcomp.course_accel(
    turns,

    initial.position[0],
    initial.position[1],
    initial.position[2],

    initial.velocity[0],
    initial.velocity[1],
    initial.velocity[2],

    final.position[0],
    final.position[1],
    final.position[2],

    final.velocity[0],
    final.velocity[1],
    final.velocity[2],

    ptr,
    RES_5_F64,
  );

  const [res_ptr, res_len]  = new Uint32Array(wasm.navcomp.memory.buffer.slice(ptr, ptr + ARG_2_U32));
  const [vel, acc, x, y, z] = new Float64Array(wasm.navcomp.memory.buffer.slice(res_ptr, res_ptr + RES_5_F64));

  return {
    maxvel: vel,
    length: acc,
    vector: [x, y, z],
  };
}


const ptr = wasm.navcomp.alloc(RES_4_F64);
export function calculate_trajectory(turns: number, initial: Body, final: Body): Trajectory {
  const key = wasm.navcomp.course_new(turns);

  wasm.navcomp.course_set_initial_position(key, ...initial.position);
  wasm.navcomp.course_set_initial_velocity(key, ...initial.velocity);
  wasm.navcomp.course_set_final_position(key, ...final.position);
  wasm.navcomp.course_set_final_velocity(key, ...final.velocity);
  wasm.navcomp.course_build_path(key);

  const max_velocity = wasm.navcomp.course_max_velocity(key);

  //const ptr = wasm.navcomp.alloc(RES_4_F64);
  const path: PathSegment[] = [];

  for (let i = 0; i < turns + 2; ++i) { // turns+2 because initial is first, final is last, path is in the middle
    const result = wasm.navcomp.course_segment(key, ptr, RES_4_F64);

    if (result) {
      const [res_ptr, res_len] = new Uint32Array(wasm.navcomp.memory.buffer.slice(ptr, ptr + ARG_2_U32));
      const [vel, x, y, z] = new Float64Array(wasm.navcomp.memory.buffer.slice(res_ptr, res_ptr + RES_4_F64));

      path.push({
        position: [x, y, z],
        velocity: vel,
      });
    }
  }

  //wasm.navcomp.free(ptr, ARG_4_F64);
  wasm.navcomp.course_del(key);

  return {
    max_velocity: max_velocity,
    path: path,
  };
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
      const target: Body  = { position: dest[turns], velocity: vFinal };
      const agent: Body   = { position: orig[0], velocity: vInit };
      const a             = calculate_acceleration(turns, agent, target);

      if (a.length > maxAccel)
        continue;

      const fuelUsed = a.length / availAcc * fuelPerTurn * turns * 0.99; // `* 0.99` to work around rounding error
      const fuelUsedPerTurn = fuelUsed / turns;

      if (fuelUsed > fuel)
        continue;

      if (prevFuelUsed === undefined || prevFuelUsed >= fuelUsed) {
        prevFuelUsed = fuelUsed;
      } else {
        continue;
      }

      yield new TransitPlan({
        turns:   turns,
        initial: agent,
        final:   target,
        origin:  this.orig,
        dest:    destination,
        start:   orig[0],
        end:     dest[turns],
        dist:    distance,
        fuel:    fuelUsed,
        acc:     a,
      });
    }
  }
}
