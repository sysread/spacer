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
define(["require", "exports", "./data", "./physics", "./system/SolarSystem", "./system/CelestialBody"], function (require, exports, data_1, physics_1, SolarSystem_1, CelestialBody_1) {
    "use strict";
    data_1 = __importDefault(data_1);
    physics_1 = __importDefault(physics_1);
    SolarSystem_1 = __importDefault(SolarSystem_1);
    var system = new SolarSystem_1.default;
    var ms_per_hour = 60 * 60 * 1000;
    var System = /** @class */ (function () {
        function System() {
            var _this = this;
            this.system = system;
            this.cache = {};
            this.pos = {};
            this.orbits = {};
            window.addEventListener("turn", function () {
                _this.orbits = {};
                if (window.game.turns % data_1.default.turns_per_day == 0) {
                    _this.cache = {};
                    _this.pos = {};
                }
            });
        }
        Object.defineProperty(System.prototype, "time", {
            get: function () {
                return window.game.date;
            },
            enumerable: true,
            configurable: true
        });
        System.prototype.bodies = function () {
            return Object.keys(data_1.default.bodies);
        };
        System.prototype.all_bodies = function () {
            var e_1, _a;
            var bodies = {};
            try {
                for (var _b = __values(this.bodies()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var body = _c.value;
                    bodies[body] = true;
                    bodies[this.central(body)] = true;
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return Object.keys(bodies);
        };
        System.prototype.body = function (name) {
            if (this.system.bodies[name] == undefined) {
                throw new Error("body not found: " + name);
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
            return this.body(name).type;
        };
        System.prototype.central = function (name) {
            var body = this.body(name);
            if (CelestialBody_1.isCelestialBody(body) && body.central) {
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
            else if (CelestialBody_1.isCelestialBody(body) && body.central && body.central.name != 'The Sun') {
                type = body.central.name;
            }
            else if (CelestialBody_1.isLaGrangePoint(body)) {
                type = "LaGrange Point";
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
            var body = this.body(name);
            var grav = 6.67e-11;
            if (CelestialBody_1.isCelestialBody(body)) {
                var mass = body.mass;
                var radius = body.radius;
                return (grav * mass) / Math.pow(radius, 2) / physics_1.default.G;
            }
            throw new Error(name + " does not have parameters for calculation of gravity");
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
            date = date || this.time;
            var key = date.valueOf();
            if (this.pos[key] == undefined) {
                this.pos[key] = {};
            }
            if (this.pos[key][name] == undefined) {
                var body = this.body(name);
                var t_1 = date instanceof Date ? date.getTime() : date;
                var pos = body.getPositionAtTime(t_1);
                this.pos[key][name] = pos.absolute;
            }
            return this.pos[key][name];
        };
        System.prototype.orbit = function (name) {
            if (!this.orbits[name]) {
                this.orbits[name] = this.body(name).orbit(this.time.getTime());
            }
            return this.orbits[name];
        };
        // turns, relative to sun
        System.prototype.orbit_by_turns = function (name) {
            var key = name + ".orbit.turns";
            if (this.cache[key] == undefined) {
                var inc = data_1.default.hours_per_turn * 60 * 60 * 1000;
                var periods = data_1.default.turns_per_day * 365;
                var points = [];
                var date = this.time.getTime();
                for (var i = 0; i < periods; ++i) {
                    points.push(this.position(name, date));
                    date += inc;
                }
                this.cache[key] = points;
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
