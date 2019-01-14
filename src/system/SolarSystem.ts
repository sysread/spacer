import CelestialBody from './CelestialBody';
import { Body } from './data/body';
import { parse as parse_time } from './helpers/time';
import * as data from './data/bodies';

interface BodyData {
  [key: string]: Body;
}

interface CelestialBodyMap {
  [key: string]: CelestialBody;
}

class SolarSystem {
  bodies: CelestialBodyMap = {};
  time?:  Date;

  constructor() {
    this.importBodies(data);
  }

  importBodies(data: BodyData, central?: CelestialBody) {
    for (const name of Object.keys(data)) {
      if (this.bodies[name] == undefined) {
        const body = data[name];
        const celestial = new CelestialBody(name, data[name], central);
        this.bodies[name] = celestial;

        if (central) {
          central.satellites[name] = celestial;
        }

        if (body.satellites) {
          this.importBodies(body.satellites, celestial);
        }
      }
    }
  }

  setTime(input: string | Date) {
    this.time = typeof input == 'string' ? parse_time(input) : input;

    for (const name of Object.keys(this.bodies)) {
      this.bodies[name].setTime(this.time);
    }
  }
}

export = SolarSystem;