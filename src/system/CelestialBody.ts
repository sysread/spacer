/**
 * CelestialBody - orbital mechanics for solar system bodies.
 *
 * Implements the JPL approximation method for planetary positions, suitable
 * for dates within a few centuries of J2000. Accuracy is sufficient for the
 * game's visual purposes; it does not model perturbations beyond the
 * polynomial corrections in the elements data.
 *
 * ## Orbital elements
 *
 * Each CelestialBody has a set of Keplerian elements (a, e, i, L, lp, node)
 * that may include:
 *   base  - values at J2000
 *   cy    - rates of change per century (for planets)
 *   day   - daily rate for mean anomaly M (for moons)
 *   aug   - higher-order augmentation terms (outer planets only)
 *
 * The element format determines the semi-major axis unit:
 *   jpl-3000-3000, default  -> AU (converted to meters)
 *   jpl-satellites-table, heavens-above -> km (converted to meters)
 *
 * ## Position computation
 *
 * getPositionAtTime(t) computes the body's position in 3D space at epoch t:
 *   1. Interpolate elements at t using base + cy * centuries_since_J2000
 *   2. Compute mean anomaly M from the mean longitude L and longitude of periapsis lp
 *   3. Solve for eccentric anomaly E via Newton-Raphson iteration
 *   4. Compute heliocentric position in the orbital plane [x, y, 0]
 *   5. Rotate into 3D space using two quaternion rotations:
 *      - Q1: longitude of ascending node (node) + central body tilt
 *      - Q2: argument of periapsis (w) + inclination (i)
 *
 * Returns a Frame containing the position relative to the central body.
 * Frame.absolute walks up the hierarchy to produce a sun-centered position.
 *
 * ## LaGrangePoint
 *
 * LaGrangePoints orbit with their parent body at a fixed angular offset
 * (the offset field in radians). getPositionAtTime applies a 2D rotation
 * to the parent's position. The unused variable `r` is a pre-existing issue.
 *
 * ## Type guards
 *
 * isCelestialBody and isLaGrangePoint discriminate SpaceThing subtypes.
 * NOTE: isCelestialBody returns true for LaGrangePoint as well (both have
 * a type field). Use isLaGrangePoint for exclusive discrimination.
 */

import { Body, Elements, ElementsBase, LaGrange, Rings, body_type, position } from './data/body';
import { Orbit, Frame } from "./orbit";
import * as Q from '../quaternion';
import * as FastMath from '../fastmath';


const G           = 6.67408e-11;                    // gravitational constant, m^3 kg^-1 s^-2
const J2000       = Date.UTC(2000, 0, 1, 12, 0, 0); // J2000.0 epoch in ms
const DayInMS     = 24 * 60 * 60 * 1000;
const CenturyInMS = 100 * 365.24 * DayInMS;


function daysBetween(a: number, b: number): number {
  return (a - b) / DayInMS;
}

function centuriesBetween(a: number, b: number): number {
  return (a - b) / CenturyInMS;
}

function degreesToRadians(n: number): number {
  return n * (Math.PI / 180);
}

/** Converts degrees to radians and reduces to [0, 2PI). */
function normalizeRadians(n: number): number {
  return (n * (Math.PI / 180)) % (2 * Math.PI);
}

function kmToMeters(v: number): number  { return v * 1000 }
function AUToMeters(v: number): number  { return v * 149597870700 }


interface ElementsAtTime {
  a:      number;  // semi-major axis (m)
  e:      number;  // eccentricity
  i:      number;  // inclination (deg)
  L:      number;  // mean longitude (deg)
  lp:     number;  // longitude of periapsis (deg)
  node:   number;  // longitude of ascending node (deg)
  w:      number;  // argument of periapsis = lp - node (deg)
  M:      number;  // mean anomaly (deg)
  E:      number;  // eccentric anomaly (deg)
  period: number;  // orbital period (s)
}


export abstract class SpaceThing {
  key:    string;
  name:   string;
  type:   body_type;
  radius: number;    // in meters

  constructor(key: string, name: string, type: body_type, radius: number) {
    this.key    = key;
    this.name   = name;
    this.type   = type;
    this.radius = kmToMeters(radius);
  }

  orbit(start: number): Orbit {
    return new Orbit(this, start);
  }

  abstract period(start: number): number;
  abstract getPositionAtTime(t: number): Frame;
}


export class CelestialBody extends SpaceThing {
  ring?:      Rings;
  central?:   CelestialBody;    // body this one orbits (undefined for the sun)
  satellites: {[key: string]: CelestialBody} = {};

  mass:       number;           // kg
  tilt:       number;           // axial tilt in radians (negated from degrees)
  mu:         number;           // standard gravitational parameter = mass * G

  elements?:  Elements;         // orbital elements; absent for static bodies
  position?:  position;         // fixed position for non-orbiting bodies

  constructor(key: string, data: Body, central?: CelestialBody) {
    super(key, data.name, data.type, data.radius);
    const init    = CelestialBody.adaptData(data);
    this.central  = central;
    this.elements = init.elements;
    this.mass     = init.mass || 1;
    this.ring     = init.ring;
    this.position = init.position;
    this.mu       = this.mass * G;
    this.tilt     = init.tilt == undefined ? 0 : degreesToRadians(-init.tilt);
  }

  /**
   * Deep-clones the body data (which is read-only from the data files) and
   * converts the semi-major axis to meters based on the element format.
   * jpl-satellites-table and heavens-above use km; everything else uses AU.
   */
  static adaptData(body: Body): Body {
    const data = JSON.parse(JSON.stringify(body));

    data.mass = data.mass || 1;

    if (data.ring) {
      data.ring.innerRadius = kmToMeters(data.ring.innerRadius);
      data.ring.outerRadius = kmToMeters(data.ring.outerRadius);
    }

    if (data.elements) {
      switch (data.elements.format) {
        case 'jpl-satellites-table':
        case 'heavens-above':
          data.elements.base.a = kmToMeters(data.elements.base.a);
          break;

        default:
          data.elements.base.a = AUToMeters(data.elements.base.a);

          if (data.elements.cy) {
            data.elements.cy.a = AUToMeters(data.elements.cy.a);
          }

          break;
      }
    }

    return data;
  }

  /** Orbital period in seconds at epoch t, from Kepler's third law. */
  period(t: number): number {
    if (!this.central)
      return 0;

    const a = this.getElementAtTime('a', t);

    return 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / this.central.mu);
  }

  /**
   * Returns the value of one orbital element at epoch t.
   * Applies the per-century rate if available; otherwise returns the base value.
   */
  getElementAtTime(name: keyof ElementsBase, t: number): number {
    if (!this.elements) {
      throw new Error(`getElementAtTime called with no elements defined on ${this.name}`);
    }

    const base = this.elements.base[name];

    if (this.elements.cy && this.elements.cy[name] != null) {
      return base + this.elements.cy[name] * centuriesBetween(t, J2000);
    } else {
      return base;
    }
  }

  /** Interpolates all six Keplerian elements plus derived quantities at epoch t. */
  getElementsAtTime(t: number): ElementsAtTime {
    const a      = this.getElementAtTime('a',    t);
    const e      = this.getElementAtTime('e',    t);
    const i      = this.getElementAtTime('i',    t);
    const L      = this.getElementAtTime('L',    t);
    const lp     = this.getElementAtTime('lp',   t);
    const node   = this.getElementAtTime('node', t);
    const w      = lp - node; // argument of periapsis
    const M      = this.getMeanAnomaly(L, lp, t);
    const E      = this.getEccentricAnomaly(M, e);
    const period = this.period(t);
    return {a, e, i, L, lp, node, w, M, E, period};
  }

  /**
   * Computes mean anomaly M from mean longitude L and longitude of periapsis lp.
   * For moons, adds a daily rate correction. For outer planets, adds higher-order
   * polynomial terms per JPL approximation (https://ssd.jpl.nasa.gov/txt/aprx_pos_planets.pdf).
   */
  getMeanAnomaly(L: number, lp: number, t: number): number {
    let M = L - lp;

    if (this.elements) {
      if (this.elements.day) {
        M += this.elements.day.M * daysBetween(t, J2000);
      }

      if (this.elements.aug) {
        const T = centuriesBetween(t, J2000);
        const b = this.elements.aug.b;
        const c = this.elements.aug.c;
        const s = this.elements.aug.s;
        const f = this.elements.aug.f;

        if (b != undefined) {
          M += Math.pow(T, 2) * b;
        }

        if (f != undefined) {
          if (c != undefined) {
            M += c * Math.cos(f * T);
          }

          if (s != undefined) {
            M += s * Math.sin(f * T);
          }
        }
      }
    }

    return M;
  }

  /**
   * Solves Kepler's equation M = E - e*sin(E) for eccentric anomaly E
   * using Newton-Raphson iteration. Converges when dE < 1e-6 radians.
   */
  getEccentricAnomaly(M: number, e: number): number {
    let E = M;

    while (true) {
      const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      E -= dE;

      if (FastMath.abs(dE) < (1e-6)) {
        break;
      }
    }

    return E;
  }

  /**
   * Computes the 3D position of this body at epoch t relative to its central body.
   * Static bodies (no central) return the origin Frame.
   * See module doc for the full algorithm.
   */
  getPositionAtTime(t: number): Frame {
    if (!this.central) {
      return new Frame([0, 0, 0], undefined, t);
    }

    let {a, e, i, node, w, M, E} = this.getElementsAtTime(t);

    i    = normalizeRadians(i);
    node = normalizeRadians(node);
    w    = normalizeRadians(w);
    M    = normalizeRadians(M);
    E    = normalizeRadians(E);

    // Heliocentric position in orbital plane
    const x = a * (Math.cos(E) - e);
    const y = a * Math.sin(E) * Math.sqrt(1 - Math.pow(e, 2));

    // Rotate into 3D ecliptic space
    const p = Q.rotate_vector(
      Q.mul(
        Q.from_euler(node, this.central.tilt, 0),
        Q.from_euler(w, i, 0),
      ),
      [x, y, 0],
    );

    return new Frame(p, this.central, t);
  }
}


export class LaGrangePoint extends SpaceThing {
  offset: number;          // angular offset from parent in radians
  parent: CelestialBody;

  constructor(key: string, data: LaGrange, parent: CelestialBody) {
    super(key, data.name, "lagrange", data.radius);
    this.offset = data.offset;
    this.parent = parent;
  }

  period(t: number): number {
    return this.parent.period(t);
  }

  /**
   * Returns the LaGrange point's position by rotating the parent's position
   * by the offset angle around the Z axis (2D rotation in the orbital plane).
   */
  getPositionAtTime(t: number): Frame {
    let [x, y, z] = this.parent.getPositionAtTime(t).position;
    const x1 = (x * Math.cos(this.offset)) - (y * Math.sin(this.offset));
    const y1 = (x * Math.sin(this.offset)) + (y * Math.cos(this.offset));
    return new Frame([x1, y1, z], undefined, t);
  }
}


/**
 * Returns true if body is a CelestialBody.
 * NOTE: also returns true for LaGrangePoint since both have a type field.
 * Use isLaGrangePoint to exclusively identify LaGrange points.
 */
export function isCelestialBody(body: SpaceThing): body is CelestialBody {
  return (<CelestialBody>body).type != undefined;
}

export function isLaGrangePoint(body: SpaceThing): body is LaGrangePoint {
  return (<LaGrangePoint>body).parent != undefined;
}
