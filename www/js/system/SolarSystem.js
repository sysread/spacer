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
                    var thing = data[name_1];
                    if (this.bodies[name_1] == undefined) {
                        var body = void 0;
                        if (body_1.isBody(thing)) {
                            body = new CelestialBody_1.CelestialBody(name_1, thing, central);
                            if (central) {
                                central.satellites[name_1] = body;
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
                            body = new CelestialBody_1.LaGrangePoint(name_1, thing, central);
                        }
                        else {
                            throw new Error('unrecognized body type');
                        }
                        this.bodies[name_1] = body;
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
