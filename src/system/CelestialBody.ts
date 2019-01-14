/// <reference types="../vendor/quaternion" />

import Quaternion from '../vendor/quaternion';
import { Body, Elements, ElementsBase, Satellites, Rings, body_type, position } from './data/body';

import * as units     from './helpers/units';
import * as angles    from './helpers/angles';
import * as time      from './helpers/time';
import * as constants from './data/constants';

class CelestialBody {
  key:        string;
  name:       string;
  type:       body_type;
  radius:     number;
  mass:       number;
  tilt?:      number;
  mu:         number;
  elements?:  Elements;
  ring?:      Rings;
  position?:  position;
  central?:   CelestialBody;
  time?:      Date;
  satellites: {[key: string]: CelestialBody} = {};

  constructor(key: string, data: Body, central?: CelestialBody) {
    const init = CelestialBody.adaptData(data);
    this.key      = key;
    this.central  = central;
    this.name     = init.name;
    this.type     = init.type;
    this.radius   = init.radius;
    this.elements = init.elements;
    this.mass     = init.mass || 1;
    this.tilt     = init.tilt;
    this.ring     = init.ring;
    this.position = init.position;
    this.mu       = constants.G * this.mass; // m^3/s^2
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

  setTime(time: Date) {
    if (this.elements) {
      this.position = this.getPositionAtTime(time);
    }
  }

  getElementsAtTime(t: Date) {
    const a    = this.getElementAtTime('a',    t);
    const e    = this.getElementAtTime('e',    t);
    const i    = this.getElementAtTime('e',    t);
    const L    = this.getElementAtTime('L',    t);
    const lp   = this.getElementAtTime('lp',   t);
    const node = this.getElementAtTime('node', t);
    const w    = lp - node; // argument of periapsis
    const M    = this.getMeanAnomaly(L, lp, t);
    const E    = this.getEccentricAnomaly(M, e);

    let period;
    if (this.central) {
      period = 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / this.central.mu);
    }

    return {a, e, i, L, lp, node, w, M, E, period};
  }

  getElementAtTime(name: keyof ElementsBase, t: Date): number {
    if (!this.elements) {
      throw new Error(`getElementAtTime called with no elements defined on ${this.name}`);
    }

    let value = this.elements.base[name];

    if (this.elements.cy) {
      value += this.elements.cy[name] * time.centuriesBetween(t, time.J2000);
    }

    return value;
  }

  getMeanAnomaly(L: number, lp: number, t: Date): number {
    let M = L - lp;

    if (this.elements && this.elements.day) {
      M += this.elements.day.M + time.daysBetween(t, time.J2000);
    }

    return M;
  }

  getEccentricAnomaly(M: number, e: number): number {
    let E = M;

    while (true) {
      const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      E -= dE;

      if (Math.abs(dE) < 1e-6) {
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

    [i, node, w, M, E] = [i, node, w, M, E]
      .map(v => angles.degreesToRadians(v))
      .map(v => angles.normalizeRadians(v));

    const x = a * (Math.cos(E) - e);
    const y = a * Math.sin(E) * Math.sqrt(1 - Math.pow(e, 2));

    const tilt = this.central && this.central.tilt
      ? angles.degreesToRadians(-this.central.tilt)
      : 0;

    return Quaternion
      .fromEuler(node, tilt, 0, 'XYZ')
      .mul(Quaternion.fromEuler(w, i, 0, 'XYZ'))
      .rotateVector([x, y, 0])
  }

  getOrbitPath() {
    if (!this.time) {
      throw new Error('setTime must be called before getOrbitPath');
    }

    const {period} = this.getElementsAtTime(this.time);
    const points: position[] = [];

    // Period is only undefined when the body is the sun, which has no
    // central body in this context.
    if (period == undefined) {
      for (let i = 0; i < 360; ++i) {
        points.push([0, 0, 0]);
      }

      return points;
    }

    const msPerPeriodsDegree = (period * 1000) / 360;

    for (let i = 0; i < 359; ++i) {
      const t = time.addMilliseconds(this.time, msPerPeriodsDegree * i);
      points.push(this.getPositionAtTime(t));
    }

    // the final point is the same as the starting point
    points.push( points[0].slice() as position );

    return points
  }
}

export = CelestialBody;
