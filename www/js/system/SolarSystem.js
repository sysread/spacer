var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
define(["require", "exports", "./CelestialBody", "./data/body", "./data/bodies"], function (require, exports, CelestialBody_1, body_1, data) {
    "use strict";
    data = __importStar(data);
    class SolarSystem {
        constructor() {
            this.bodies = {};
            this.importBodies(data);
        }
        importBodies(data, central) {
            for (const name of Object.keys(data)) {
                const thing = data[name];
                if (this.bodies[name] == undefined) {
                    let body;
                    if (body_1.isBody(thing)) {
                        body = new CelestialBody_1.CelestialBody(name, thing, central);
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
                    else if (body_1.isLaGrange(thing)) {
                        if (!central) {
                            throw new Error('LaGrange point requested with no parent body');
                        }
                        body = new CelestialBody_1.LaGrangePoint(name, thing, central);
                    }
                    else {
                        throw new Error('unrecognized body type');
                    }
                    this.bodies[name] = body;
                }
            }
        }
    }
    return SolarSystem;
});
