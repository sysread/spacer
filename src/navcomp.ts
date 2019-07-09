import data  from './data';
import system from './system';
import Physics from './physics';
import { TransitPlan } from './transitplan';
import { Person } from './person';
import { Point } from './vector';
import * as Vec from './vector';
import * as util from './util';
import * as t from './common';

const hypot = Math.hypot;
const SPT = data.hours_per_turn * 3600; // seconds per turn
const DT = 200; // frames per turn for euler integration
const TI = SPT / DT; // seconds per frame

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


export function Motion(stdlib: any = null, foreign: any = null, heap: any = null) {
  "use asm";

  var sqrt = stdlib.Math.sqrt;

  /*
   * tt: total time
   * pi: initial position
   * pf: final position
   * vi: initial velocity
   * vf: final velocity
   */
  function linear_acceleration(tt: number, pi: number, pf: number, vi: number, vf: number): number {
    tt = +tt;
    pi = +pi;
    pf = +pf;
    vi = +vi;
    vf = +vf;

    var t = 0.0,
        dvf = 0.0,
        dvi = 0.0,
        a = 0.0;

    // time to flip point
    t = tt / 2.0;

    // portion of final velocity to match by flip point
    dvf = vf * 2.0 / t;

    // portion of total change in velocity to apply by flip point
    dvi = (vi - dvf) * 2.0 / t;

    // calculate linear acceleration
    a = (pf - pi) / (t * t) - dvi;

    return +a;
  }

  /**
   * ts: total distance
   * a:  acceleration
   */
  function travel_time(ts: number, a: number): number {
    a = +a;

    var s = 0.0,
        v = 0.0,
        t = 0.0;

    s = ts / 2.0;
    v = sqrt(2 * a * s);
    t = v / a;

    return t * 2;
  }

  return {
    linear_acceleration: linear_acceleration,
    travel_time: travel_time,
  };
}

export const motion = Motion({Math: Math});


/**
 * Calculates the acceleration vector required for a given transit.
 *
 * Note: calculating linearly in 3 axes is significantly faster (and uglier)
 * than using a vector.
 */
export function calculate_acceleration(turns: number, initial: Body, final: Body): Acceleration {
  const t = SPT * turns;

  const ax = motion.linear_acceleration(t, initial.position[0], final.position[0], initial.velocity[0], final.velocity[0]);
  const ay = motion.linear_acceleration(t, initial.position[1], final.position[1], initial.velocity[1], final.velocity[1]);
  const az = motion.linear_acceleration(t, initial.position[2], final.position[2], initial.velocity[2], final.velocity[2]);

  const a = Math.sqrt(ax * ax + ay * ay + az * az);

  const vx = ax * t;
  const vy = ay * t;
  const vz = az * t;
  const v = Math.sqrt(vx * vx + vy * vy + vz * vz);

  return {
    maxvel: v,
    length: a,
    vector: [ax, ay, az],
  };
}

/**
 * Calculates the trajector for a given transit.
 *
 * Note: calculating linearly in three axes is significantly faster (and
 * uglier) than using a vector.
 */
export function calculate_trajectory(turns: number, initial: Body, final: Body): Trajectory {
  const tflip = turns * SPT / 2;

  const acc = calculate_acceleration(turns, initial, final);
  const [ax, ay, az] = acc.vector;

  const dvx = ax * TI;
  const dvy = ay * TI;
  const dvz = az * TI;

  const dsx = ax * (TI * TI) / 2;
  const dsy = ay * (TI * TI) / 2;
  const dsz = az * (TI * TI) / 2;

  let [px, py, pz] = initial.position.slice(0);
  let [vx, vy, vz] = initial.velocity.slice(0);

  const path: PathSegment[] = [
    {position: [px, py, pz], velocity: hypot(vx, vy, vz)}
  ];

  for (let turn = 1, t = 0; turn < turns; ++turn) {
    for (let e = 0; e < DT; ++e) {
      t += TI;

      if (t < tflip) {
        vx += dvx, vy += dvy, vz += dvz;
      }
      else {
        vx -= dvx, vy -= dvy, vz -= dvz;
      }

      px += dsx + vx * TI;
      py += dsy + vy * TI;
      pz += dsz + vz * TI;
    }

    path.push({position: [px, py, pz], velocity: hypot(vx, vy, vz)});
  }

  path.push({
    position: [final.position[0], final.position[1], final.position[2]],
    velocity: hypot(vx, vy, vz)},
  );

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
