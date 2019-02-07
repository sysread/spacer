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
define(["require", "exports", "./data", "./physics", "./system/SolarSystem"], function (require, exports, data_1, physics_1, SolarSystem_1) {
    "use strict";
    data_1 = __importDefault(data_1);
    physics_1 = __importDefault(physics_1);
    SolarSystem_1 = __importDefault(SolarSystem_1);
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
        getOrbitPath: function (start) {
            var path = system.bodies.jupiter.getOrbitPath(start);
            return path.slice(60, 360).concat(path.slice(0, 60));
        },
        getOrbitPathSegment: function (start, periods, msPerPeriod) {
            var _this = this;
            return system.bodies.jupiter.getOrbitPathSegment(start, periods, msPerPeriod)
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
            var _this = this;
            this.system = system;
            this.cache = {};
            this.pos = {};
            window.addEventListener("turn", function () {
                var e_1, _a;
                if (window.game.turns % data_1.default.turns_per_day == 0) {
                    var dt = new Date(window.game.date + ' 00:00:00');
                    var ts = dt.valueOf();
                    _this.cache = {};
                    try {
                        for (var _b = __values(Object.keys(_this.pos)), _c = _b.next(); !_c.done; _c = _b.next()) {
                            var key = _c.value;
                            if (parseInt(key, 10) < ts) {
                                delete _this.pos[key];
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
            var e_2, _a;
            var bodies = {};
            try {
                for (var _b = __values(this.bodies()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var body = _c.value;
                    bodies[body] = true;
                    bodies[this.central(body)] = true;
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
            return Object.keys(bodies);
        };
        System.prototype.body = function (name) {
            if (name == 'trojans') {
                return Trojans;
            }
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
            var e_3, _a;
            var ranges = {};
            try {
                for (var _b = __values(this.bodies()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var body = _c.value;
                    ranges[body] = physics_1.default.distance(point, this.position(body));
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_3) throw e_3.error; }
            }
            return ranges;
        };
        System.prototype.closestBodyToPoint = function (point) {
            var e_4, _a;
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
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_4) throw e_4.error; }
            }
            return [closest, dist];
        };
        System.prototype.position = function (name, date) {
            if (name == 'sun') {
                return [0, 0, 0];
            }
            date = date || this.time;
            if (!date) {
                throw new OutsideOfTime;
            }
            var key = date.valueOf();
            if (this.pos[key] == undefined) {
                this.pos[key] = {};
            }
            if (this.pos[key][name] == undefined) {
                var body = this.body(name);
                this.pos[key][name] = body.getPositionAtTime(date);
            }
            return this.pos[key][name];
        };
        // radians
        System.prototype.full_orbit = function (name) {
            if (name == 'sun')
                return new Array(360).fill([0, 0, 0]);
            var key = name + ".full_orbit";
            if (this.cache[key] == undefined) {
                this.cache[key] = this.body(name).getOrbitPath(this.time);
            }
            return this.cache[key];
        };
        // days
        System.prototype.orbit = function (name) {
            if (!this.time) {
                throw new OutsideOfTime;
            }
            var key = name + ".orbit";
            if (this.cache[key] == undefined) {
                var p = 365;
                var t_1 = 24 * 60 * 60 * 1000;
                this.cache[key] = this.body(name).getOrbitPathSegment(this.time, p, t_1 / p);
            }
            return this.cache[key];
        };
        // turns
        System.prototype.orbit_by_turns = function (name) {
            var key = name + ".orbit.byturns";
            if (this.cache[key] == undefined) {
                var p = data_1.default.turns_per_day * 365; // periods
                var t_2 = data_1.default.hours_per_turn * 60 * 60 * 1000; // ms per period
                this.cache[key] = this.body(name).getOrbitPathSegment(this.time, p, t_2 / p);
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
