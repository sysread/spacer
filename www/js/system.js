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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "./data", "./physics", "./system/SolarSystem"], function (require, exports, data_1, physics_1, SolarSystem_1) {
    "use strict";
    data_1 = __importDefault(data_1);
    physics_1 = __importDefault(physics_1);
    SolarSystem_1 = __importDefault(SolarSystem_1);
    var OutsideOfTime = /** @class */ (function (_super) {
        __extends(OutsideOfTime, _super);
        function OutsideOfTime() {
            return _super.call(this, "set_date() must be called before positional information is available") || this;
        }
        return OutsideOfTime;
    }(Error));
    var System = /** @class */ (function () {
        function System() {
            this.system = new SolarSystem_1.default;
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
            var _this = this;
            if (name == 'trojans') {
                return {
                    key: 'trojans',
                    central: this.system.bodies.sun,
                    name: 'Trojans',
                    type: 'asteroids',
                    radius: this.system.bodies.jupiter.radius,
                    mass: 0,
                    satellites: {},
                    getPositionAtTime: function (date) {
                        var p = _this.system.bodies.jupiter.getPositionAtTime(date);
                        var r = physics_1.default.distance(p, [0, 0, 0]);
                        var t = -1.0472; // 60 degrees in radians
                        var x = (p[0] * Math.cos(t)) - (p[1] * Math.sin(t));
                        var y = (p[0] * Math.sin(t)) + (p[1] * Math.cos(t));
                        return [x, y, p[2]];
                    },
                };
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
        System.prototype.addPoints = function (p1, p2) {
            var _a = __read(p1, 3), x0 = _a[0], y0 = _a[1], z0 = _a[2];
            var _b = __read(p2, 3), x1 = _b[0], y1 = _b[1], z1 = _b[2];
            return [x1 + x0, y1 + y0, z1 + z0];
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
                    pos = this.addPoints(pos, this.position(body.central.key, date));
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
                var tpd = 24 / data_1.default.hours_per_turn;
                var orbit = this.orbit(name);
                var point = orbit[0];
                var path = [point];
                for (var day = 1; day < orbit.length; ++day) {
                    var next = orbit[day];
                    var dx = Math.ceil((next[0] - point[0]) / tpd);
                    var dy = Math.ceil((next[1] - point[1]) / tpd);
                    var dz = Math.ceil((next[2] - point[2]) / tpd);
                    for (var i = 1; i <= tpd; ++i) {
                        path.push([
                            point[0] + (i * dx),
                            point[1] + (i * dy),
                            point[2] + (i * dz),
                        ]);
                    }
                    point = next;
                }
                this.cache[key] = path;
            }
            return this.cache[key];
        };
        System.prototype.distance = function (origin, destination) {
            return physics_1.default.distance(this.position(origin), this.position(destination));
        };
        System.prototype.plot = function () {
            var e_4, _a, e_5, _b;
            var abs = Math.abs;
            var ceil = Math.ceil;
            var floor = Math.floor;
            var max = Math.max;
            var min = Math.min;
            var round = Math.round;
            var bodies = this.bodies();
            var pos = {};
            try {
                // Get coordinates and hypot for each body, scaled down
                for (var bodies_1 = __values(bodies), bodies_1_1 = bodies_1.next(); !bodies_1_1.done; bodies_1_1 = bodies_1.next()) {
                    var name_1 = bodies_1_1.value;
                    var _c = __read(this.position(name_1), 3), x = _c[0], y = _c[1], z = _c[2];
                    x = ceil(x / 1000);
                    y = ceil(y / 1000);
                    pos[name_1] = { x: x, y: y };
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (bodies_1_1 && !bodies_1_1.done && (_a = bodies_1.return)) _a.call(bodies_1);
                }
                finally { if (e_4) throw e_4.error; }
            }
            // Calculate max values for x and y
            var max_x = Math.ceil(1.2 * Object.values(pos).reduce(function (acc, val) { return max(acc, abs(val.x)); }, 0));
            var max_y = Math.ceil(1.2 * Object.values(pos).reduce(function (acc, val) { return max(acc, abs(val.y)); }, 0));
            // Calculate scaled coordinates
            var plot = [['sun', 0, 0]];
            var points = {
                'sun': [0, 0],
            };
            try {
                for (var bodies_2 = __values(bodies), bodies_2_1 = bodies_2.next(); !bodies_2_1.done; bodies_2_1 = bodies_2.next()) {
                    var name_2 = bodies_2_1.value;
                    var p = pos[name_2];
                    var pct_x = 0;
                    var pct_y = 0;
                    if (p.x !== 0)
                        pct_x = p.x / max_x * 100;
                    if (p.y !== 0)
                        pct_y = p.y / max_y * 100;
                    points[name_2] = [pct_x, pct_y];
                    plot.push([name_2, pct_x, pct_y]);
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (bodies_2_1 && !bodies_2_1.done && (_b = bodies_2.return)) _b.call(bodies_2);
                }
                finally { if (e_5) throw e_5.error; }
            }
            return {
                max_x: max_x,
                max_y: max_y,
                points: points
            };
        };
        return System;
    }());
    return new System;
});
