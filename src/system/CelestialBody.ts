import { Body, Elements, ElementsBase, Satellites, LaGrange, LaGranges, Rings, body_type, position } from './data/body';
import { Orbit, Frame } from "./orbit";
import Physics from '../physics';
import * as units     from './helpers/units';
import * as constants from './data/constants';
import * as Q         from '../quaternion';


/*
 * Convenience functions to convert degrees to normalized radians.
 */
const circleInRadians = 2 * Math.PI
const ratioDegToRad = Math.PI / 180;
const rad = (n: number): number => n * ratioDegToRad;
const nrad = (n: number): number => (n * ratioDegToRad) % circleInRadians;

/*
 * Convenience functions to work with time stamps
 */
const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
const DayInMS = 24 * 60 * 60 * 1000;
const CenturyInMS = 100 * 365.24 * DayInMS;
const daysBetween = (a: number, b: number): number => (a - b) / DayInMS;
const centuriesBetween = (a: number, b: number): number => (a - b) / CenturyInMS;


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


export abstract class SpaceThing {
  key:    string;
  name:   string;
  type:   body_type;
  radius: number;

  constructor(key: string, name: string, type: body_type, radius: number) {
    this.key    = key;
    this.name   = name;
    this.type   = type;
    this.radius = units.kmToMeters(radius);
  }

  orbit(start: number): Orbit {
    return new Orbit(this, start);
  }

  abstract period(start: number): number;
  abstract getPositionAtTime(t: number): Frame;
}


export class CelestialBody extends SpaceThing {
  ring?:      Rings;
  central?:   CelestialBody;
  satellites: {[key: string]: CelestialBody} = {};

  mass:       number;
  tilt:       number;
  mu:         number;

  elements?:  Elements;
  position?:  position;

  constructor(key: string, data: Body, central?: CelestialBody) {
    super(key, data.name, data.type, data.radius);
    const init = CelestialBody.adaptData(data);
    this.central  = central;
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

    data.mass = data.mass || 1;

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

  period(t: number): number {
    if (!this.central)
      return 0;

    const a = this.getElementAtTime('a', t);

    return 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / this.central.mu);
  }

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

  getMeanAnomaly(L: number, lp: number, t: number): number {
    let M = L - lp;

    if (this.elements) {
      if (this.elements.day) {
        M += this.elements.day.M * daysBetween(t, J2000);
      }

      // augmentation for outer planets per:
      //   https://ssd.jpl.nasa.gov/txt/aprx_pos_planets.pdf
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

  getPositionAtTime(t: number): Frame {
    if (!this.central) {
      return new Frame([0, 0, 0], undefined, t);
    }

    let {a, e, i, L, lp, node, w, M, E} = this.getElementsAtTime(t);

    i    = nrad(i);
    node = nrad(node);
    w    = nrad(w);
    M    = nrad(M);
    E    = nrad(E);

    const x = a * (Math.cos(E) - e);
    const y = a * Math.sin(E) * Math.sqrt(1 - Math.pow(e, 2));

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
  offset: number;
  parent: CelestialBody;

  constructor(key: string, data: LaGrange, parent: CelestialBody) {
    super(key, data.name, "lagrange", data.radius);
    this.offset = data.offset;
    this.parent = parent;
  }

  period(t: number): number {
    return this.parent.period(t);
  }

  getPositionAtTime(t: number): Frame {
    const r = this.offset;
    let [x, y, z] = this.parent.getPositionAtTime(t).position;
    const x1 = (x * Math.cos(this.offset)) - (y * Math.sin(this.offset));
    const y1 = (x * Math.sin(this.offset)) + (y * Math.cos(this.offset));
    return new Frame([x1, y1, z], undefined, t);
  }
}


export function isCelestialBody(body: SpaceThing): body is CelestialBody {
  return (<CelestialBody>body).type != undefined;
}

export function isLaGrangePoint(body: SpaceThing): body is LaGrangePoint {
  return (<LaGrangePoint>body).parent != undefined;
}
