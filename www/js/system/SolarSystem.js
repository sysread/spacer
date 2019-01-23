var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
define(["require", "exports", "./CelestialBody", "./helpers/time", "./data/bodies"], function (require, exports, CelestialBody_1, time_1, data) {
    "use strict";
    CelestialBody_1 = __importDefault(CelestialBody_1);
    data = __importStar(data);
    class SolarSystem {
        constructor() {
            this.bodies = {};
            this.importBodies(data);
        }
        importBodies(data, central) {
            for (const name of Object.keys(data)) {
                if (this.bodies[name] == undefined) {
                    const body = data[name];
                    const celestial = new CelestialBody_1.default(name, data[name], central);
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
        setTime(input) {
            this.time = typeof input == 'string' ? time_1.parse(input) : input;
            for (const name of Object.keys(this.bodies)) {
                this.bodies[name].setTime(this.time);
            }
        }
    }
    return SolarSystem;
});
