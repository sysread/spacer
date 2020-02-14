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
const DT  = 200; // frames per turn for euler integration
const TI  = SPT / DT; // seconds per frame

export interface PathSegment {
  position: Point;
  velocity: number;
  vector:   Point,
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


/*
 * tt: total time
 * pi: initial position
 * pf: final position
 * vi: initial velocity
 * vf: final velocity
 */
function linear_acceleration(tt: number, pi: number, pf: number, vi: number, vf: number): number {
  // time to flip point
  const t = tt / 2;

  // portion of final velocity to match by flip point
  const dvf = vf * 2 / t;

  // portion of total change in velocity to apply by flip point
  const dvi = (vi - dvf) * 2 / t;

  // calculate linear acceleration
  return (pf - pi) / (t * t) - dvi;
}

/**
 * ts: total distance
 * a:  acceleration
 */
export function travel_time(ts: number, a: number): number {
  return 2 * Math.sqrt(a * ts) / a;
}

/**
 * Calculates the acceleration vector required for a given transit.
 *
 * Note: calculating linearly in 3 axes is significantly faster (and uglier)
 * than using a vector.
 */
export function calculate_acceleration(turns: number, initial: Body, final: Body): Acceleration {
  const t = SPT * turns;

  const ax = linear_acceleration(t, initial.position[0], final.position[0], initial.velocity[0], final.velocity[0]);
  const ay = linear_acceleration(t, initial.position[1], final.position[1], initial.velocity[1], final.velocity[1]);
  const az = linear_acceleration(t, initial.position[2], final.position[2], initial.velocity[2], final.velocity[2]);

  const vx = ax * (t / 2);
  const vy = ay * (t / 2);
  const vz = az * (t / 2);

  const a = Math.hypot(ax, ay, az);
  const v = Math.hypot(vx, vy, vz);

  return {
    maxvel: v,
    length: a,
    vector: [ax, ay, az],
  };
}

/**
 * Calculates the trajectory for a given transit.
 *
 * Note: calculating linearly in three axes is significantly faster (and
 * uglier) than using a vector.
 */
export function calculate_trajectory(turns: number, initial: Body, final: Body): Trajectory {
  const tflip = turns * SPT / 2;

  const acc = calculate_acceleration(turns, initial, final);
  const [ax, ay, az] = acc.vector;

  // Change in velocity per frame:
  //     v = u + at
  // We can calculate (at) aheaad of time
  const dvx = ax * TI;
  const dvy = ay * TI;
  const dvz = az * TI;

  // Change in position per frame:
  //    s = ut + (a * t^2) / 2
  // We can calculate ((a * t^2) / 2) ahead of time
  const dsx = ax * (TI * TI) / 2;
  const dsy = ay * (TI * TI) / 2;
  const dsz = az * (TI * TI) / 2;

  let [px, py, pz] = initial.position.slice(0);
  let [vx, vy, vz] = initial.velocity.slice(0);

  const path: PathSegment[] = [{
    position: [px, py, pz],
    velocity: Math.hypot(vx, vy, vz),
    vector:   [vx, vy, vz],
  }];

  for (let turn = 0, t = 0; turn < turns; ++turn) {
    for (let e = 0; e < DT; ++e) {
      t += TI;

      if (t < tflip) {
        vx += dvx, vy += dvy, vz += dvz;
      } else {
        vx -= dvx, vy -= dvy, vz -= dvz;
      }

      px += dsx + vx * TI;
      py += dsy + vy * TI;
      pz += dsz + vz * TI;
    }

    // even with the integration, inaccuracies at the scale of several au can
    // make the path be off significantly in the final approach, so we can
    // fudge things a little since we know where it is supposed to be.
    if (turn == (turns - 1)) {
      [px, py, pz] = [final.position[0], final.position[1], final.position[2]];
      [vx, vy, vz] = [final.velocity[0], final.velocity[1], final.velocity[2]];
    }

    path.push({
      position: [px, py, pz],
      velocity: Math.hypot(vx, vy, vz),
      vector:   [vx, vy, vz],
    });
  }

  return {
    max_velocity: acc.maxvel,
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

  bestAcc:    number;
  shipMass:   number;

  constructor(player: Person, orig: t.body, showAll?: boolean, fuelTarget?: number, nominal?: boolean) {
    this.player  = player;
    this.orig    = orig;
    this.showAll = showAll || false;
    this.max     = player.maxAcceleration();
    this.nominal = nominal ? true : false;

    if (this.nominal) {
      this.bestAcc  = this.player.ship.thrust / this.player.ship.currentMass();
      this.shipMass = this.player.ship.nominalMass(true);
    } else {
      this.bestAcc  = this.player.shipAcceleration();
      this.shipMass = this.player.ship.currentMass();
    }

    this.bestAcc = Math.min(this.player.maxAcceleration(), this.bestAcc);

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

  *astrogator(destination: t.body) {
    const orig = system.orbit_by_turns(this.orig);
    const vInit = Vec.div_scalar(Vec.sub(orig[1], orig[0]), SPT);
    const transits = this.full_astrogator({position: orig[0], velocity: vInit}, destination);

    for (const transit of transits)
      yield transit;
  }

  *full_astrogator(origin: Body, destination: t.body) {
    const dest        = system.orbit_by_turns(destination);
    const bestAcc     = this.bestAcc;
    const fuelrate    = this.player.ship.fuelrate;
    const thrust      = this.player.ship.thrust;
    const fuel        = this.fuelTarget;
    const mass        = this.shipMass;
    const agent: Body = { position: origin.position, velocity: origin.velocity };

    let prevFuelUsed;

    for (let turns = 1; turns < dest.length; ++turns) {
      const distance      = Physics.distance(origin.position, dest[turns]);
      const fuelPerTurn   = Math.min(fuel / turns, fuelrate);
      const thrustPerTurn = thrust * fuelPerTurn / fuelrate;
      const availAcc      = thrustPerTurn / mass;
      const maxAccel      = Math.min(bestAcc, availAcc);
      const vFinal        = Vec.div_scalar( Vec.sub(dest[turns], dest[turns - 1]), SPT );
      const target: Body  = { position: dest[turns], velocity: vFinal };
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
        start:   origin.position,
        end:     dest[turns],
        dist:    distance,
        fuel:    fuelUsed,
        acc:     a,
      });
    }
  }
}
