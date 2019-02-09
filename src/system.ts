import data from './data';
import Physics from './physics';
import SolarSystem from './system/SolarSystem';
import * as t from './common';
import * as V from './vector';

declare var window: {
  addEventListener: (ev: string, cb: Function) => void;

  game: {
    date:  Date;
    turns: number;
  };
}

const system = new SolarSystem;
const ms_per_hour = 60 * 60 * 1000;


const Trojans = {
  key:        'trojans',
  central:    system.bodies.sun,
  name:       'Trojans',
  type:       'asteroids',
  radius:     system.bodies.jupiter.radius,
  mass:       0,
  satellites: {},

  period: function(t: Date) { return system.bodies.jupiter.period(t) },
  solar_period: function(t: Date) { return system.bodies.jupiter.solar_period(t) },

  // Adjust a point from Jupiter's orbit to the corresponding L5 point
  adjustPoint: function(p: V.Point): V.Point {
    const r = Physics.distance(p, [0, 0, 0]);
    const t = -1.0472; // 60 degrees in radians
    const x = (p[0] * Math.cos(t)) - (p[1] * Math.sin(t));
    const y = (p[0] * Math.sin(t)) + (p[1] * Math.cos(t));
    return [x, y, p[2]];
  },

  getOrbitPath: function(start: Date) {
    const path = system.bodies.jupiter.getOrbitPath(start);
    return path.slice(60, 360).concat( path.slice(0, 60) );
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


class System {
  system:  SolarSystem   = system;
  cache:   OrbitCache    = {};
  pos:     PositionCache = {};

  constructor() {
    window.addEventListener("turn", () => {
      if (window.game.turns % data.turns_per_day == 0) {
        this.cache = {};
        this.pos = {};
      }
    });
  }

  get time() {
    return window.game.date;
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

    date = date || this.time;
    const key = date.valueOf();

    if (this.pos[key] == undefined) {
      this.pos[key] = {};
    }

    if (this.pos[key][name] == undefined) {
      const body = this.body(name);
      let pos = body.getPositionAtTime(date);

      if (body.central && body.central.key != 'sun') {
        const central = body.central.getPositionAtTime(date);
        pos = V.add(pos, central);
      }

      this.pos[key][name] = pos;
    }

    return this.pos[key][name];
  }

  // radians, relative to central
  orbit(name: string) {
    const key = `${name}.orbit.radians`;

    if (this.cache[key] == undefined) {
      const body  = this.body(name);
      const orbit = body.getOrbitPath(this.time);

      if (body.central && body.central.key != 'sun') {
        const central = body.central.getPositionAtTime(this.time);
        for (let i = 0; i < orbit.length; ++i) {
          orbit[i] = V.add(orbit[i], central);
        }
      }

      this.cache[key] = orbit;
    }

    return this.cache[key];
  }

  // turns, relative to sun
  orbit_by_turns(name: string) {
    const key = `${name}.orbit.turns`;

    if (this.cache[key] == undefined) {
      const periods = data.turns_per_day * 365;
      const date    = new Date(this.time);
      const points  = [];

      for (let i = 0; i < periods; ++i) {
        points.push(this.position(name, date));
        date.setHours(date.getHours() + data.hours_per_turn);
      }

      this.cache[key] = points;
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
