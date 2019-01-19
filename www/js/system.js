var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
define(["require", "exports", "./data", "./physics", "./system/SolarSystem", "./vector"], function (require, exports, data_1, physics_1, SolarSystem_1, V) {
    "use strict";
    data_1 = __importDefault(data_1);
    physics_1 = __importDefault(physics_1);
    SolarSystem_1 = __importDefault(SolarSystem_1);
    V = __importStar(V);
    var system = new SolarSystem_1.default;
    var Trojans = {
        key: 'trojans',
        central: system.bodies.sun,
        name: 'Trojans',
        type: 'asteroids',
        radius: system.bodies.jupiter.radius,
        mass: 0,
        satellites: {},
        // Adjust a point from Jupiter's orbit to the corresponding L5 point
        adjustPoint: function (p) {
            var r = physics_1.default.distance(p, [0, 0, 0]);
            var t = -1.0472; // 60 degrees in radians
            var x = (p[0] * Math.cos(t)) - (p[1] * Math.sin(t));
            var y = (p[0] * Math.sin(t)) + (p[1] * Math.cos(t));
            return [x, y, p[2]];
        },
        getOrbitPathSegment: function (periods, msPerPeriod) {
            var _this = this;
            return system.bodies.jupiter.getOrbitPathSegment(periods, msPerPeriod)
                .map(function (p) { return _this.adjustPoint(p); });
        },
        getPositionAtTime: function (date) {
            var p = system.bodies.jupiter.getPositionAtTime(date);
            return this.adjustPoint(p);
        },
    };
    var OutsideOfTime = /** @class */ (function (_super) {
        __extends(OutsideOfTime, _super);
        function OutsideOfTime() {
            return _super.call(this, "set_date() must be called before positional information is available") || this;
        }
        return OutsideOfTime;
    }(Error));
    var System = /** @class */ (function () {
        function System() {
            this.system = system;
            this.cache = {};
            this.pos = {};
        }
        System.prototype.set_date = function (date) {
            var e_1, _a;
            var dt = new Date(date + ' 00:00:00');
            var ts = dt.valueOf();
            if (!this.system.time || dt.getDate() !== this.system.time.getDate()) {
                this.cache = {};
                try {
                    for (var _b = __values(Object.keys(this.pos)), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var key = _c.value;
                        if (parseInt(key, 10) < ts) {
                            delete this.pos[key];
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
            }
            this.system.setTime(date);
        };
        System.prototype.bodies = function () {
            return Object.keys(data_1.default.bodies);
        };
        System.prototype.body = function (name) {
            if (name == 'trojans') {
                return Trojans;
            }
            return this.system.bodies[name];
        };
        System.prototype.short_name = function (name) {
            if (name === 'moon')
                return 'Luna';
            return this.body(name).name;
        };
        System.prototype.name = function (name) {
            if (data_1.default.bodies.hasOwnProperty(name)) {
                return data_1.default.bodies[name].name;
            }
            return this.body(name).name;
        };
        System.prototype.faction = function (name) {
            return data_1.default.bodies[name].faction;
        };
        System.prototype.type = function (name) {
            var type = this.body(name).type;
            if (type === 'dwarfPlanet')
                return 'dwarf';
            return type;
        };
        System.prototype.central = function (name) {
            var body = this.body(name);
            if (body.central) {
                return body.central.key;
            }
            return 'sun';
        };
        System.prototype.kind = function (name) {
            var body = this.body(name);
            var type = this.type(name);
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
        };
        System.prototype.gravity = function (name) {
            // Artificial gravity (spun up, orbital)
            var artificial = data_1.default.bodies[name].gravity;
            if (artificial != undefined) {
                return artificial;
            }
            var grav = 6.67e-11;
            var body = this.body(name);
            var mass = body.mass;
            var radius = body.radius;
            return (grav * mass) / Math.pow(radius, 2) / physics_1.default.G;
        };
        System.prototype.ranges = function (point) {
            var e_2, _a;
            var ranges = {};
            try {
                for (var _b = __values(this.bodies()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var body = _c.value;
                    ranges[body] = physics_1.default.distance(point, this.position(body));
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
            return ranges;
        };
        System.prototype.closestBodyToPoint = function (point) {
            var e_3, _a;
            var dist, closest;
            try {
                for (var _b = __values(this.bodies()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var body = _c.value;
                    var d = physics_1.default.distance(point, this.position(body));
                    if (dist === undefined || d < dist) {
                        dist = d;
                        closest = body;
                    }
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_3) throw e_3.error; }
            }
            return [closest, dist];
        };
        System.prototype.position = function (name, date) {
            if (name == 'sun') {
                return [0, 0, 0];
            }
            date = date || this.system.time;
            if (!date) {
                throw new OutsideOfTime;
            }
            var key = date.valueOf();
            if (this.pos[key] == undefined) {
                this.pos[key] = {};
            }
            if (this.pos[key][name] == undefined) {
                var body = this.body(name);
                var pos = body.getPositionAtTime(date);
                // Positions are relative to the central body; in the case of the sun,
                // that requires no adjustment. Moons, however, must be added to the host
                // planet's position.
                if (body.central && body.central.key !== 'sun') {
                    pos = V.add(pos, this.position(body.central.key, date));
                }
                this.pos[key][name] = pos;
            }
            return this.pos[key][name];
        };
        System.prototype.orbit = function (name) {
            if (!this.system.time) {
                throw new OutsideOfTime;
            }
            var key = name + ".orbit";
            if (this.cache[key] == undefined) {
                var date = new Date(this.system.time);
                var orbit = [this.position(name)];
                for (var day = 1; day < 365; ++day) {
                    date.setDate(date.getDate() + 1);
                    orbit.push(this.position(name, date));
                }
                this.cache[key] = orbit;
            }
            return this.cache[key];
        };
        System.prototype.orbit_by_turns = function (name) {
            var key = name + ".orbit.byturns";
            if (this.cache[key] == undefined) {
                var tpd = data_1.default.turns_per_day;
                var msPerTurn = data_1.default.hours_per_turn * 60 * 60 * 1000;
                var body = this.body(name);
                this.cache[key] = body.getOrbitPathSegment(365, msPerTurn);
            }
            return this.cache[key];
        };
        System.prototype.orbit_by_turns_old = function (name) {
            var key = name + ".orbit.byturns";
            if (this.cache[key] == undefined) {
                var tpd = data_1.default.turns_per_day;
                var orbit = this.orbit(name);
                var path = [orbit[0]];
                var point = orbit[0];
                for (var day = 1; day < orbit.length; ++day) {
                    var S = V.sub(orbit[day], point);
                    for (var i = 1; i <= tpd; ++i) {
                        path.push(V.add(point, V.mul_scalar(S, i)));
                    }
                    point = orbit[day];
                }
                this.cache[key] = path;
            }
            return this.cache[key];
        };
        System.prototype.distance = function (origin, destination) {
            return physics_1.default.distance(this.position(origin), this.position(destination));
        };
        return System;
    }());
    return new System;
});
