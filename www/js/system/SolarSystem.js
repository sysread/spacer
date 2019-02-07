var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
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
define(["require", "exports", "./CelestialBody", "./data/bodies"], function (require, exports, CelestialBody_1, data) {
    "use strict";
    CelestialBody_1 = __importDefault(CelestialBody_1);
    data = __importStar(data);
    var SolarSystem = /** @class */ (function () {
        function SolarSystem() {
            this.bodies = {};
            this.importBodies(data);
        }
        SolarSystem.prototype.importBodies = function (data, central) {
            var e_1, _a;
            try {
                for (var _b = __values(Object.keys(data)), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var name_1 = _c.value;
                    if (this.bodies[name_1] == undefined) {
                        var body = data[name_1];
                        var celestial = new CelestialBody_1.default(name_1, data[name_1], central);
                        this.bodies[name_1] = celestial;
                        if (central) {
                            central.satellites[name_1] = celestial;
                        }
                        if (body.satellites) {
                            this.importBodies(body.satellites, celestial);
                        }
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        };
        return SolarSystem;
    }());
    return SolarSystem;
});
