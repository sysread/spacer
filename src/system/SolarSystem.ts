import { SpaceThing, LaGrangePoint, CelestialBody } from './CelestialBody';
import { Body, LaGrange, isBody, isLaGrange } from './data/body';
import { parse as parse_time } from './helpers/time';
import * as data from './data/bodies';

interface Data {
  [key: string]: Body | LaGrange;
}

interface CelestialBodyMap {
  [key: string]: SpaceThing;
}

class SolarSystem {
  bodies: CelestialBodyMap = {};

  constructor() {
    this.importBodies(data);
  }

  importBodies(data: Data, central?: CelestialBody) {
    for (const name of Object.keys(data)) {
      const thing = data[name];

      if (this.bodies[name] == undefined) {
        let body;

        if (isBody(thing)) {
          body = new CelestialBody(name, thing, central);

          if (central) {
            central.satellites[name] = body;
          }

          if (thing.satellites) {
            this.importBodies(thing.satellites, body);
          }

          if (thing.lagranges) {
            this.importBodies(thing.lagranges, body);
          }
        }
        else if (isLaGrange(thing)) {
          if (!central) {
            throw new Error('LaGrange point requested with no parent body');
          }

          body = new LaGrangePoint(name, thing, central);
        }
        else {
          throw new Error('unrecognized body type');
        }

        this.bodies[name] = body;
      }
    }
  }
}

export = SolarSystem;
