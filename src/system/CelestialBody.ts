import { Body, Elements, ElementsBase, Satellites, Rings, body_type, position } from './data/body';
import * as units     from './helpers/units';
import * as time      from './helpers/time';
import * as constants from './data/constants';
import * as V         from '../vector';
import * as Q         from '../quaternion';

interface ElementsAtTime {
  a:      number;
  e:      number;
  i:      number;
  L:      number;
  lp:     number;
  node:   number;
  w:      number;
  M:      number;
  E:      number;
  period: number;
}


/**
 * Convenience function to convert degrees to normalized radians.
 */
const circleInRadians = 2 * Math.PI
const ratioDegToRad   = Math.PI / 180;
const rad  = (n: number): number => n * ratioDegToRad;
const nrad = (n: number): number => (n * ratioDegToRad) % circleInRadians;


class CelestialBody {
  key:        string;
  name:       string;
  type:       body_type;
  ring?:      Rings;
  central?:   CelestialBody;
  satellites: {[key: string]: CelestialBody} = {};

  radius:     number;
  mass:       number;
  tilt:       number;
  mu:         number;

  elements?:  Elements;
  position?:  position;

  constructor(key: string, data: Body, central?: CelestialBody) {
    const init = CelestialBody.adaptData(data);
    this.key      = key;
    this.central  = central;
    this.name     = init.name;
    this.type     = init.type;
    this.radius   = init.radius;
    this.elements = init.elements;
    this.mass     = init.mass || 1;
    this.ring     = init.ring;
    this.position = init.position;
    this.mu       = constants.G * this.mass; // m^3/s^2
    this.tilt     = init.tilt == undefined ? 0 : rad(-init.tilt);
  }

  static adaptData(body: Body): Body {
    // deep clone the body data, which is ro
    const data = JSON.parse(JSON.stringify(body));

    data.radius = units.kmToMeters(data.radius);
    data.mass   = data.mass || 1;

    if (data.ring) {
      data.ring.innerRadius = units.kmToMeters(data.ring.innerRadius);
      data.ring.outerRadius = units.kmToMeters(data.ring.outerRadius);
    }

    if (data.elements) { // not the sun or another static body
      switch (data.elements.format) {
        case 'jpl-satellites-table':
        case 'heavens-above':
          data.elements.base.a = units.kmToMeters(data.elements.base.a);
          break;

        default:
          data.elements.base.a = units.AUToMeters(data.elements.base.a);

          if (data.elements.cy) {
            data.elements.cy.a = units.AUToMeters(data.elements.cy.a);
          }

          break;
      }
    }

    return data;
  }

  getElementAtTime(name: keyof ElementsBase, t: Date): number {
    if (!this.elements)
      throw new Error(`getElementAtTime called with no elements defined on ${this.name}`);

    let value = this.elements.base[name];

    if (this.elements.cy !== undefined && this.elements.cy[name] !== undefined)
      value += this.elements.cy[name] * time.centuriesBetween(t, time.J2000);

    return value;
  }

  getElementsAtTime(t: Date): ElementsAtTime {
    const a    = this.getElementAtTime('a',    t);
    const e    = this.getElementAtTime('e',    t);
    const i    = this.getElementAtTime('i',    t);
    const L    = this.getElementAtTime('L',    t);
    const lp   = this.getElementAtTime('lp',   t);
    const node = this.getElementAtTime('node', t);

    const w    = lp - node; // argument of periapsis
    const M    = this.getMeanAnomaly(L, lp, t);
    const E    = this.getEccentricAnomaly(M, e);

    let period = 0;
    if (this.central) {
      period = 2 * Math.PI * Math.sqrt((a * a * a) / this.central.mu);
    }

    return {a, e, i, L, lp, node, w, M, E, period};
  }

  getMeanAnomaly(L: number, lp: number, t: Date): number {
    let M = L - lp;

    if (this.elements) {
      if (this.elements.day) {
        M += this.elements.day.M * time.daysBetween(t, time.J2000);
      }

      // augmentation for outer planets per:
      //   https://ssd.jpl.nasa.gov/txt/aprx_pos_planets.pdf
      if (this.elements.aug) {
        const T = time.centuriesBetween(t, time.J2000);
        const b = this.elements.aug.b;
        const c = this.elements.aug.c;
        const s = this.elements.aug.s;
        const f = this.elements.aug.f;

        if (b != undefined) {
          M += T * T * b;
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

  getEccentricAnomaly(M: number, e: number): number {
    let E = M;

    while (true) {
      const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      E -= dE;

      if (Math.abs(dE) < (1e-6)) {
        break;
      }
    }

    return E;
  }

  getPositionAtTime(t: Date): position {
    if (!this.central) {
      return [0, 0, 0];
    }

    let {a, e, i, L, lp, node, w, M, E} = this.getElementsAtTime(t);

    i    = nrad(i);
    node = nrad(node);
    w    = nrad(w);
    M    = nrad(M);
    E    = nrad(E);

    const x = a * (Math.cos(E) - e);
    const y = a * Math.sin(E) * Math.sqrt(1 - (e * e));

    const pos = Q.rotate_vector(
      Q.mul(
        Q.from_euler(node, this.central.tilt, 0),
        Q.from_euler(w, i, 0),
      ),
      [x, y, 0],
    );

    return V.add(pos, this.central.getPositionAtTime(t));
  }

  // Array of 360 points, representing positions at each degree for the body's
  // orbital period.
  getOrbitPath(start: Date): position[] {
    const { period } = (!this.central || this.central.key == 'sun')
      ? this.getElementsAtTime(start)
      : this.central.getElementsAtTime(start);

    const ms = (period * 1000) / 360;

    return this.getOrbitPathSegment(start, 360, ms);
  }

  getOrbitPathSegment(start: Date, periods: number, ms: number): position[] {
    const points: position[] = [];

    // sun
    if (!ms) {
      for (let i = 0; i < periods; ++i) {
        points.push([0, 0, 0]);
      }

      return points;
    }

    const date = new Date(start);

    for (let i = 0; i < periods; ++i) {
      points.push(this.getPositionAtTime(date));
      date.setMilliseconds(date.getMilliseconds() + ms);
    }

    return points;
  }
}

export = CelestialBody;
