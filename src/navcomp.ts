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
  vector:      Point;   // boost acceleration vector [a1x, a1y, a1z] in m/s²
  brakeVector: Point;   // brake acceleration vector [a2x, a2y, a2z] in m/s²
  length:      number;  // effective acceleration magnitude (avg of boost+brake)
  maxvel:      number;  // peak velocity at flip point (m/s)
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
 * Solves for the per-phase accelerations along one axis.
 *
 * The trajectory has two phases of equal duration h = T/2:
 *   Phase 1 (boost):  accel = a1, from t=0 to t=h
 *   Phase 2 (brake):  accel = a2, from t=h to t=T
 *
 * Given start (pi, vi) and end (pf, vf):
 *
 * Velocity at flip:  v_mid = vi + a1*h
 * Velocity at end:   vf = v_mid + a2*h = vi + (a1+a2)*h
 *   => a2 = (vf - vi)/h - a1
 *
 * Position at flip:  p_mid = pi + vi*h + a1*h²/2
 * Position at end:   pf = p_mid + v_mid*h + a2*h²/2
 *                       = pi + 2*vi*h + 3/2*a1*h² + a2*h²/2
 *
 * Substituting a2 and solving for a1:
 *   a1 = (4*(pf - pi) - 3*vi*T - vf*T) / T²
 */
function solve_boost_brake(tt: number, pi: number, pf: number, vi: number, vf: number): [number, number] {
  const h  = tt / 2;
  const a1 = (4 * (pf - pi) - 3 * vi * tt - vf * tt) / (tt * tt);
  const a2 = (vf - vi) / h - a1;
  return [a1, a2];
}

/**
 * Computes the 3D acceleration needed to travel from `initial` to `final`
 * in exactly `turns` turns. Each axis is solved independently for a two-phase
 * boost/brake trajectory that correctly matches both endpoint positions and
 * velocities.
 *
 * Returns the per-phase acceleration vectors, the effective magnitude (average
 * of the two phases for fuel/feasibility calculations), and the true peak
 * velocity at the flip point (including initial velocity contribution).
 */
function calculate_acceleration(turns: number, initial: Body, final: Body): Acceleration {
  const t  = SPT * turns;
  const h  = t / 2;

  const [a1x, a2x] = solve_boost_brake(t, initial.position[0], final.position[0], initial.velocity[0], final.velocity[0]);
  const [a1y, a2y] = solve_boost_brake(t, initial.position[1], final.position[1], initial.velocity[1], final.velocity[1]);
  const [a1z, a2z] = solve_boost_brake(t, initial.position[2], final.position[2], initial.velocity[2], final.velocity[2]);

  // Effective acceleration: average of boost and brake magnitudes.
  // This gives the correct fuel budget since total delta-v = (|a1| + |a2|) * h.
  const a1mag = Math.hypot(a1x, a1y, a1z);
  const a2mag = Math.hypot(a2x, a2y, a2z);
  const a = (a1mag + a2mag) / 2;

  // Peak velocity at flip point, including initial velocity.
  const vmx = initial.velocity[0] + a1x * h;
  const vmy = initial.velocity[1] + a1y * h;
  const vmz = initial.velocity[2] + a1z * h;
  const v = Math.hypot(vmx, vmy, vmz);

  return {
    maxvel: v,
    length: a,
    vector: [a1x, a1y, a1z],
    brakeVector: [a2x, a2y, a2z],
  };
}

/**
 * Integrates the trajectory for a transit using Euler integration.
 * Each turn is subdivided into DT frames. Phase 1 (boost) uses the boost
 * acceleration vector; phase 2 (brake) uses the brake vector. The two
 * phases have equal duration (T/2) but potentially different magnitudes,
 * which is what allows matching both endpoint position and velocity.
 *
 * The final position/velocity are clamped to the destination to correct
 * for accumulated Euler integration error at multi-AU distances.
 */
export function calculate_trajectory(turns: number, initial: Body, final: Body): Trajectory {
  const tflip = turns * SPT / 2;

  const acc = calculate_acceleration(turns, initial, final);
  const [a1x, a1y, a1z] = acc.vector;
  const [a2x, a2y, a2z] = acc.brakeVector;

  // Pre-compute per-frame deltas for boost and brake phases.
  const dv1x = a1x * TI, dv1y = a1y * TI, dv1z = a1z * TI;
  const dv2x = a2x * TI, dv2y = a2y * TI, dv2z = a2z * TI;

  const ds1x = a1x * (TI * TI) / 2, ds1y = a1y * (TI * TI) / 2, ds1z = a1z * (TI * TI) / 2;
  const ds2x = a2x * (TI * TI) / 2, ds2y = a2y * (TI * TI) / 2, ds2z = a2z * (TI * TI) / 2;

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
        vx += dv1x, vy += dv1y, vz += dv1z;
        px += ds1x + vx * TI;
        py += ds1y + vy * TI;
        pz += ds1z + vz * TI;
      } else {
        vx += dv2x, vy += dv2y, vz += dv2z;
        px += ds2x + vx * TI;
        py += ds2y + vy * TI;
        pz += ds2z + vz * TI;
      }
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
