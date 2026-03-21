/**
 * navcomp - navigation computer: trajectory planning and transit enumeration.
 *
 * This module handles the physics of getting from one body to another.
 * It produces TransitPlan objects that describe the full path, fuel cost,
 * and turn count for a given transit.
 *
 * ## Physics model
 *
 * Transits use a flip-and-burn trajectory: accelerate for the first half,
 * then decelerate for the second half. The ship ends at the destination's
 * position AND velocity (so it's actually in orbit, not just passing through).
 *
 * calculate_trajectory() integrates the equations of motion using Euler
 * integration with DT=200 sub-frames per turn. At scales of several AU the
 * accumulated error is non-trivial, so the final position/velocity are clamped
 * to the known destination values rather than trusting the integration result.
 *
 * calculate_acceleration() solves for the constant acceleration vector needed
 * to travel from (initial.position, initial.velocity) to
 * (final.position, final.velocity) in exactly `turns` turns. It treats each
 * axis independently (linear_acceleration) then composes into a 3D vector.
 *
 * ## Orbit sampling
 *
 * The destination body's position moves during transit. full_astrogator()
 * iterates over the body's orbit_by_turns cache (one position per future turn)
 * and finds the earliest turn at which the required acceleration fits within
 * the ship's capability and fuel budget.
 *
 * ## NavComp class
 *
 * NavComp is constructed with a player, origin body, and optional flags:
 *   showAll     - include transits that exceed fuel capacity (for display)
 *   fuelTarget  - override the fuel budget (used by mission estimation)
 *   nominal     - use nominal (full-tank, undamaged) ship stats instead of
 *                 current stats (used by agent route planning)
 *
 * getTransitsTo(dest)    - lazily computes and caches all valid transits
 * getFastestTransitTo()  - returns the first (fastest) valid transit
 * astrogator()           - generator that yields TransitPlans in turn order
 *
 * dt is a stride for full_astrogator: setting it > 1 skips turns to trade
 * accuracy for speed (used by agents to avoid expensive full searches).
 */

import data  from './data';
import system from './system';
import Physics from './physics';
import { TransitPlan } from './transitplan';
import { Person } from './person';
import { Point } from './vector';
import * as Vec from './vector';
import * as t from './common';

const SPT = data.hours_per_turn * 3600; // seconds per turn
const DT  = 200;                        // Euler integration sub-frames per turn
const TI  = SPT / DT;                   // seconds per sub-frame

export interface PathSegment {
  position: Point;
  velocity: number;  // scalar speed (m/s)
  vector:   Point;   // velocity vector (m/s per axis)
}

export interface Trajectory {
  max_velocity: number;  // peak speed during transit (m/s)
  path: PathSegment[];   // one entry per turn, index 0 = departure
}

export interface Acceleration {
  vector: Point;   // acceleration vector [ax, ay, az] in m/s²
  length: number;  // magnitude of acceleration (m/s²)
  maxvel: number;  // peak velocity at flip point (m/s)
}

export interface Body {
  position: Point;  // 3D position in meters
  velocity: Point;  // 3D velocity in m/s
}

/**
 * Minimum transit time for a given distance at constant acceleration.
 * Formula: t = 2 * sqrt(a * s) / a, derived from d = 0.5 * a * (t/2)^2 * 2
 * (symmetric flip-and-burn: accelerate for sqrt(s/a), then decelerate).
 *
 * @param ts - total distance in meters
 * @param a  - acceleration in m/s²
 * @returns  - time in seconds
 */
export function travel_time(ts: number, a: number): number {
  return 2 * Math.sqrt(a * ts) / a;
}

/**
 * Solves for the constant acceleration needed along one axis to travel from
 * pi to pf in total time tt, matching initial velocity vi and final velocity vf.
 * Uses the flip-point (tt/2) as the reference for velocity matching.
 */
function linear_acceleration(tt: number, pi: number, pf: number, vi: number, vf: number): number {
  const t   = tt / 2;        // time to flip point
  const dvf = vf * 2 / t;    // portion of final velocity to match by flip point
  const dvi = (vi - dvf) * 2 / t; // portion of initial velocity change to apply
  return (pf - pi) / (t * t) - dvi;
}

/**
 * Computes the 3D acceleration vector needed to travel from `initial` to
 * `final` in exactly `turns` turns. Solves each axis independently for speed.
 * Returns the vector, its magnitude, and the peak velocity at the flip point.
 */
function calculate_acceleration(turns: number, initial: Body, final: Body): Acceleration {
  const t  = SPT * turns;
  const t2 = t / 2;

  const ax = linear_acceleration(t, initial.position[0], final.position[0], initial.velocity[0], final.velocity[0]);
  const ay = linear_acceleration(t, initial.position[1], final.position[1], initial.velocity[1], final.velocity[1]);
  const az = linear_acceleration(t, initial.position[2], final.position[2], initial.velocity[2], final.velocity[2]);

  const vx = ax * t2;
  const vy = ay * t2;
  const vz = az * t2;

  const a = Math.hypot(ax, ay, az);
  const v = Math.hypot(vx, vy, vz);

  return {
    maxvel: v,
    length: a,
    vector: [ax, ay, az],
  };
}

/**
 * Integrates the trajectory for a transit using Euler integration.
 * Each turn is subdivided into DT frames. Acceleration is applied forward
 * before the flip point and reversed after.
 *
 * The final position/velocity are forced to match the destination exactly,
 * correcting for integration error that accumulates at multi-AU distances.
 */
export function calculate_trajectory(turns: number, initial: Body, final: Body): Trajectory {
  const tflip = turns * SPT / 2;

  const acc = calculate_acceleration(turns, initial, final);
  const [ax, ay, az] = acc.vector;

  // Pre-compute per-frame deltas for efficiency in the inner loop.
  const dvx = ax * TI;
  const dvy = ay * TI;
  const dvz = az * TI;

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

      // Flip at the midpoint: decelerate for the second half.
      if (t < tflip) {
        vx += dvx, vy += dvy, vz += dvz;
      } else {
        vx -= dvx, vy -= dvy, vz -= dvz;
      }

      px += dsx + vx * TI;
      py += dsy + vy * TI;
      pz += dsz + vz * TI;
    }

    // Clamp final position/velocity to destination to correct integration error.
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
  max:        number;   // physiological acceleration limit for this player
  data:       undefined | any;
  dt:         undefined | number; // orbit sampling stride (1 = every turn, >1 = skip turns)
  nominal:    boolean;

  bestAcc:    number;   // effective acceleration (capped by physiology)
  shipMass:   number;   // ship mass used for fuel calculations

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

  /** Returns all valid TransitPlans to dest, lazily computed and cached. */
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

  /** Returns the fastest (fewest turns) TransitPlan to dest, or undefined if none. */
  getFastestTransitTo(dest: t.body) {
    const transits = this.astrogator(dest);
    for (const transit of transits) {
      return transit;
    }
  }

  /**
   * Generator that yields TransitPlans to destination in turn order.
   * Samples the destination's orbital positions using orbit_by_turns and
   * delegates to full_astrogator for the actual search.
   */
  *astrogator(destination: t.body) {
    const orig  = system.orbit_by_turns(this.orig);
    const vInit = Vec.div_scalar(Vec.sub(orig[1], orig[0]), SPT);
    const transits = this.full_astrogator({position: orig[0], velocity: vInit}, destination);

    for (let transit = transits(); transit != null; transit = transits()) {
      yield transit;
    }
  }

  /**
   * Returns a closure that iterates over future orbital positions and yields
   * TransitPlans when the required acceleration fits within the ship's limits.
   *
   * For each candidate turn count, the fuel budget is split evenly across turns.
   * The available thrust is proportional to the fuel available per turn.
   * Transits with monotonically increasing fuel use are skipped (only keep
   * improving options - there's no point in a longer trip that costs more fuel).
   */
  full_astrogator(origin: Body, destination: t.body): () => TransitPlan|null {
    const dest  = system.orbit_by_turns(destination);
    const agent: Body = { position: origin.position, velocity: origin.velocity };

    const fuelrate = this.player.ship.fuelrate;
    const thrust   = this.player.ship.thrust;

    let prevFuelUsed: number;
    let turns = 1;
    let that  = this;

    return function(): TransitPlan|null {
      while (turns < dest.length) {
        const tturns        = turns++;
        const distance      = Physics.distance(origin.position, dest[tturns]);
        const fuelPerTurn   = Math.min(that.fuelTarget / tturns, fuelrate);
        const thrustPerTurn = thrust * fuelPerTurn / fuelrate;
        const availAcc      = thrustPerTurn / that.shipMass;
        const maxAccel      = Math.min(that.bestAcc, availAcc);
        const vFinal        = Vec.div_scalar( Vec.sub(dest[tturns], dest[tturns - 1]), SPT );
        const target: Body  = { position: dest[tturns], velocity: vFinal };
        const a             = calculate_acceleration(tturns, agent, target);

        if (a.length > maxAccel)
          continue;

        const fuelUsed = a.length / availAcc * fuelPerTurn * tturns * 0.99; // 0.99 corrects rounding error

        if (fuelUsed > that.fuelTarget)
          continue;

        // Only yield plans with strictly decreasing fuel use to avoid returning
        // worse options after a good one has already been found.
        if (prevFuelUsed === undefined || prevFuelUsed >= fuelUsed) {
          prevFuelUsed = fuelUsed;
        } else {
          continue;
        }

        return new TransitPlan({
          turns:   tturns,
          initial: agent,
          final:   target,
          origin:  that.orig,
          dest:    destination,
          start:   origin.position,
          end:     dest[turns],
          dist:    distance,
          fuel:    fuelUsed,
          acc:     a,
        });
      }

      return null;
    };
  }
}
