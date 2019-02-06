import data from './data';
import Physics from './physics';
import SolarSystem from './system/SolarSystem';
import * as t from './common';
import * as V from './vector';

const system = new SolarSystem;

const Trojans = {
  key:        'trojans',
  central:    system.bodies.sun,
  name:       'Trojans',
  type:       'asteroids',
  radius:     system.bodies.jupiter.radius,
  mass:       0,
  satellites: {},

  // Adjust a point from Jupiter's orbit to the corresponding L5 point
  adjustPoint: function(p: V.Point): V.Point {
    const r = Physics.distance(p, [0, 0, 0]);
    const t = -1.0472; // 60 degrees in radians
    const x = (p[0] * Math.cos(t)) - (p[1] * Math.sin(t));
    const y = (p[0] * Math.sin(t)) + (p[1] * Math.cos(t));
    return [x, y, p[2]];
  },

  getOrbitPath: function() {
    const path = system.bodies.jupiter.getOrbitPath();
    return path.slice(60, 360).concat( path.slice(0, 60) );
  },

  getOrbitPathSegment: function(periods: number, msPerPeriod: number): V.Point[] {
    return system.bodies.jupiter.getOrbitPathSegment(periods, msPerPeriod)
      .map(p => this.adjustPoint(p));
  },

  getPositionAtTime: function(date: Date): V.Point {
    const p = system.bodies.jupiter.getPositionAtTime(date);
    return this.adjustPoint(p);
  },
};

interface OrbitCache {
  [key: string]: V.Point[];
}

interface PositionCache {
  [key: string]: {
    [key: string]: V.Point;
  };
}

class OutsideOfTime extends Error {
  constructor() {
    super("set_date() must be called before positional information is available");
  }
}

class System {
  system:  SolarSystem   = system;
  cache:   OrbitCache    = {};
  pos:     PositionCache = {};

  set_date(date: string) {
    const dt = new Date(date + ' 00:00:00');
    const ts = dt.valueOf();

    if (!this.system.time || dt.getDate() !== this.system.time.getDate()) {
      this.cache = {};

      for (const key of Object.keys(this.pos)) {
        if (parseInt(key, 10) < ts) {
          delete this.pos[key];
        }
      }
    }

    this.system.setTime(date);
  }

  bodies(): t.body[] {
    return Object.keys(data.bodies) as t.body[];
  }

  all_bodies(): string[] {
    const bodies: {[index:string]: boolean} = {};

    for (const body of this.bodies()) {
      bodies[body] = true;
      bodies[this.central(body)] = true;
    }

    return Object.keys(bodies);
  }

  body(name: string) {
    if (name == 'trojans') {
      return Trojans;
    }

    if (this.system.bodies[name] == undefined) {
      throw new Error(`body not found: ${name}`);
    }

    return this.system.bodies[name];
  }

  short_name(name: string) {
    if (name === 'moon') return 'Luna';
    return this.body(name).name;
  }

  name(name: string) {
    if (data.bodies.hasOwnProperty(name)) {
      return data.bodies[name].name;
    }

    return this.body(name).name;
  }

  faction(name: string) {
    return data.bodies[name].faction;
  }

  type(name: string) {
    const type = this.body(name).type;
    if (type === 'dwarfPlanet') return 'dwarf';
    return type;
  }

  central(name: string): string {
    let body = this.body(name);

    if (body.central) {
      return body.central.key;
    }

    return 'sun';
  }

  kind(name: string) {
    let body = this.body(name);
    let type = this.type(name);

    if (type == 'dwarf') {
      type = 'Dwarf';
    }
    else if (body.central && body.central.name != 'The Sun') {
      type = body.central.name;
    }
    else {
      type = 'Planet';
    }

    return type;
  }

  gravity(name: string): number {
    // Artificial gravity (spun up, orbital)
    const artificial = data.bodies[name].gravity;
    if (artificial != undefined) {
      return artificial;
    }

    const grav   = 6.67e-11;
    const body   = this.body(name);
    const mass   = body.mass;
    const radius = body.radius;
    return (grav * mass) / Math.pow(radius, 2) / Physics.G;
  }

  ranges(point: V.Point) {
    const ranges: { [key: string]: number } = {};

    for (const body of this.bodies()) {
      ranges[body] = Physics.distance(point, this.position(body));
    }

    return ranges;
  }

  closestBodyToPoint(point: V.Point) {
    let dist, closest;

    for (const body of this.bodies()) {
      const d = Physics.distance(point, this.position(body));
      if (dist === undefined || d < dist) {
        dist = d;
        closest = body;
      }
    }

    return [closest, dist];
  }

  position(name: string, date?: Date): V.Point {
    if (name == 'sun') {
      return [0, 0, 0];
    }

    date = date || this.system.time;

    if (!date) {
      throw new OutsideOfTime;
    }

    const key = date.valueOf();

    if (this.pos[key] == undefined) {
      this.pos[key] = {};
    }

    if (this.pos[key][name] == undefined) {
      const body = this.body(name);
      this.pos[key][name] = body.getPositionAtTime(date);
    }

    return this.pos[key][name];
  }

  full_orbit(name: string) {
    if (name == 'sun')
      return new Array(360).fill([0, 0, 0]);

    const key = `${name}.full_orbit`;

    if (this.cache[key] == undefined) {
      this.cache[key] = this.body(name).getOrbitPath();
    }

    return this.cache[key];
  }

  orbit(name: string) {
    if (!this.system.time) {
      throw new OutsideOfTime;
    }

    const key = `${name}.orbit`;

    if (this.cache[key] == undefined) {
      const date  = new Date(this.system.time);
      const orbit = [];

      for (let day = 0; day < 365; ++day) {
        orbit.push(this.position(name, date));
        date.setDate(date.getDate() + 1);
      }

      this.cache[key] = orbit;
    }

    return this.cache[key];
  }

  orbit_by_turns(name: string) {
    const key = `${name}.orbit.byturns`;

    if (this.cache[key] == undefined) {
      const msPerTurn = data.hours_per_turn * 60 * 60 * 1000;
      this.cache[key] = this.body(name).getOrbitPathSegment(365, msPerTurn);
    }

    return this.cache[key];
  }

  distance(origin: string, destination: string): number {
    return Physics.distance(
      this.position(origin),
      this.position(destination)
    );
  }
}

export = new System;
