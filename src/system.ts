import data from './data';
import Physics from './physics';
import SolarSystem from './system/SolarSystem';
import { CelestialBody, LaGrangePoint, isCelestialBody, isLaGrangePoint } from './system/CelestialBody';
import * as t from './common';
import * as V from './vector';
import { Orbit } from "./system/orbit";

declare var window: {
  addEventListener: (ev: string, cb: Function) => void;

  game: {
    turns: number;
    date: Date;
    start_date: () => Date;
  };
}

const system = new SolarSystem;
const ms_per_hour = 60 * 60 * 1000;
const ms_per_turn = data.hours_per_turn * ms_per_hour;


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
  orbits:  {[key: string]: Orbit} = {};

  constructor() {
    window.addEventListener("turn", () => {
      this.orbits = {};
      this.pos = {};

      const turns = data.turns_per_day * 365 - 1;
      const date  = turns * ms_per_turn + this.time.getTime();

      for (const body of this.all_bodies()) {
        const key = `${body}.orbit.turns`;

        if (this.cache[key] == undefined) {
          this.orbit_by_turns(body);
        } else {
          this.cache[key].shift();
          this.cache[key].push(this.position(body, date));
        }
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
    return this.body(name).type;
  }

  central(name: string): string {
    let body = this.body(name);

    if (isCelestialBody(body) && body.central) {
      return body.central.key;
    }

    return 'sun';
  }

  kind(name: string) {
    let body = this.body(name);
    let type: string = this.type(name);

    if (type == 'dwarf') {
      type = 'Dwarf';
    }
    else if (isCelestialBody(body) && body.central && body.central.name != 'The Sun') {
      type = body.central.name;
    }
    else if (isLaGrangePoint(body)) {
      type = "LaGrange Point";
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

    const body = this.body(name);
    const grav = 6.67e-11;

    if (isCelestialBody(body)) {
      const mass = body.mass;
      const radius = body.radius;
      return (grav * mass) / Math.pow(radius, 2) / Physics.G;
    }

    throw new Error(name + " does not have parameters for calculation of gravity");
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

  position(name: string, date?: number | Date): V.Point {
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
      const t = date instanceof Date ? date.getTime() : date;
      let pos = body.getPositionAtTime(t);
      this.pos[key][name] = pos.absolute;
    }

    return this.pos[key][name];
  }

  position_on_turn(name: string, turn: number) {
    const dt = new Date(window.game.date);
    dt.setHours(dt.getHours() + ((turn - window.game.turns) * data.hours_per_turn));
    return this.position(name, dt);
  }

  orbit(name: string) {
    if (!this.orbits[name]) {
      this.orbits[name] = this.body(name).orbit(this.time.getTime());
    }

    return this.orbits[name];
  }

  // turns, relative to sun
  orbit_by_turns(name: string) {
    const key = `${name}.orbit.turns`;

    if (this.cache[key] == undefined) {
      const periods = data.turns_per_day * 365;
      const points  = [];

      let date = this.time.getTime();

      for (let i = 0; i < periods; ++i) {
        points.push(this.position(name, date));
        date += ms_per_turn;
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
