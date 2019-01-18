import data from './data';
import Physics from './physics';
import SolarSystem from './system/SolarSystem';
import * as t from './common';
import * as V from './vector';

type point = [number, number, number];

interface OrbitCache {
  [key: string]: point[];
}

interface PositionCache {
  [key: string]: {
    [key: string]: point;
  };
}

class OutsideOfTime extends Error {
  constructor() {
    super("set_date() must be called before positional information is available");
  }
}

class System {
  system:  SolarSystem   = new SolarSystem;
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

  bodies(): string[] {
    return Object.keys(data.bodies);
  }

  body(name: string) {
    if (name == 'trojans') {
      return {
        key:        'trojans',
        central:    this.system.bodies.sun,
        name:       'Trojans',
        type:       'asteroids',
        radius:     this.system.bodies.jupiter.radius,
        mass:       0,
        satellites: {},

        getPositionAtTime: (date: Date): point => {
          const p = this.system.bodies.jupiter.getPositionAtTime(date);
          const r = Physics.distance(p, [0, 0, 0]);
          const t = -1.0472; // 60 degrees in radians
          const x = (p[0] * Math.cos(t)) - (p[1] * Math.sin(t));
          const y = (p[0] * Math.sin(t)) + (p[1] * Math.cos(t));
          return [x, y, p[2]];
        },
      };
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

  ranges(point: point) {
    const ranges: { [key: string]: number } = {};

    for (const body of this.bodies()) {
      ranges[body] = Physics.distance(point, this.position(body));
    }

    return ranges;
  }

  closestBodyToPoint(point: point) {
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

  position(name: string, date?: Date): point {
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
      let pos = body.getPositionAtTime(date);

      // Positions are relative to the central body; in the case of the sun,
      // that requires no adjustment. Moons, however, must be added to the host
      // planet's position.
      if (body.central && body.central.key !== 'sun') {
        pos = V.add(pos, this.position(body.central.key, date));
      }

      this.pos[key][name] = pos;
    }

    return this.pos[key][name];
  }

  orbit(name: string) {
    if (!this.system.time) {
      throw new OutsideOfTime;
    }

    const key = `${name}.orbit`;

    if (this.cache[key] == undefined) {
      const date  = new Date(this.system.time);
      const orbit = [this.position(name)];

      for (let day = 1; day < 365; ++day) {
        date.setDate(date.getDate() + 1);
        orbit.push(this.position(name, date));
      }

      this.cache[key] = orbit;
    }

    return this.cache[key];
  }

  orbit_by_turns(name: string) {
    const key = `${name}.orbit.byturns`;

    if (this.cache[key] == undefined) {
      const tpd   = data.turns_per_day;
      const orbit = this.orbit(name);

      let point = orbit[0];
      const path = [point];

      for (let day = 1; day < orbit.length; ++day) {
        const S = V.sub(orbit[day], point);

        for (let i = 1; i <= tpd; ++i) {
          path.push( V.add(point, V.mul_scalar(S, i)) );
        }

        point = orbit[day];
      }

      this.cache[key] = path;
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
