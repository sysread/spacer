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
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "./physics", "./system"], function (require, exports, physics_1, system_1) {
    "use strict";
    physics_1 = __importDefault(physics_1);
    system_1 = __importDefault(system_1);
    var Transit = /** @class */ (function () {
        function Transit(plan, layout) {
            this.plan = plan;
            this.layout = layout;
            this.bodies = {};
            this.orbits = {};
            this.full_orbits = {};
            this.layout.set_center(this.center);
            this.layout.set_fov_au(this.fov);
            this.update_bodies();
        }
        Transit.prototype.ship_velocity = function () {
            return this.plan.velocity;
        };
        Transit.prototype.diameter = function (body) {
            if (body == 'ship')
                return 0;
            return this.layout.scale_body_diameter(body);
        };
        Transit.prototype.position = function (body) {
            var point;
            switch (body) {
                case 'sun':
                    point = [0, 0, 0];
                    break;
                case 'ship':
                    point = this.plan.coords;
                    break;
                default:
                    if (this.orbits[body] == undefined)
                        throw new Error("body not tracked: " + body);
                    point = this.orbits[body][this.plan.current_turn];
                    break;
            }
            return this.layout.scale_point(point);
        };
        Transit.prototype.body = function (body) {
            if (this.bodies[body] == undefined)
                throw new Error("body not tracked: " + body);
            return this.bodies[body];
        };
        Transit.prototype.path = function (body) {
            switch (body) {
                case 'ship':
                    return this.layout.scale_path(this.plan.path.map(function (p) { return p.position; }));
                case 'sun':
                    return [this.layout.scale_point([0, 0, 0])];
                default:
                    return this.layout.scale_path(this.full_orbits[body]);
            }
        };
        // TODO bodies positions are taken from orbits using current_turn. If the
        // transit is continued after the game is restarted, the position at index 0
        // in orbits won't correspond to current_turn, since orbit_by_turns starts at
        // the current game turn.
        Transit.prototype.update_bodies = function () {
            var e_1, _a, e_2, _b;
            if (Object.keys(this.orbits).length == 0) {
                try {
                    for (var _c = __values(system_1.default.all_bodies()), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var body = _d.value;
                        this.orbits[body] = system_1.default.orbit_by_turns(body);
                        this.full_orbits[body] = system_1.default.full_orbit(body);
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
            this.bodies['ship'] = {
                coords: this.position('ship'),
                diameter: this.diameter('ship'),
            };
            this.bodies['sun'] = {
                coords: this.position('sun'),
                diameter: this.diameter('sun'),
            };
            try {
                for (var _e = __values(system_1.default.all_bodies()), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var body = _f.value;
                    this.bodies[body] = {
                        coords: this.position(body),
                        diameter: this.diameter(body),
                    };
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                }
                finally { if (e_2) throw e_2.error; }
            }
        };
        Transit.prototype.turn = function () {
            this.plan.turn();
            window.game.player.ship.burn(this.plan.accel);
            window.game.turn(1, true);
            this.update_bodies();
        };
        Object.defineProperty(Transit.prototype, "center", {
            /**
             * Returns the ideal centerpoint of the view as a point in meters.
             */
            get: function () {
                var center;
                var dest_central = system_1.default.central(this.plan.dest);
                var orig_central = system_1.default.central(this.plan.origin);
                var bodies = [];
                // Moon to moon in same system
                if (dest_central == orig_central && dest_central != 'sun') {
                    bodies.push(system_1.default.position(dest_central));
                    bodies.push(this.plan.flip_point);
                    bodies.push(this.plan.start);
                }
                // Planet to its own moon
                else if (window.game.locus == dest_central) {
                    bodies.push(system_1.default.position(this.plan.origin));
                    bodies.push(this.plan.flip_point);
                    bodies.push(this.plan.start);
                }
                // Moon to it's host planet
                else if (this.plan.dest == orig_central) {
                    bodies.push(system_1.default.position(this.plan.dest));
                    bodies.push(this.plan.flip_point);
                    bodies.push(this.plan.start);
                }
                // Cross system path
                else {
                    bodies.push(system_1.default.position(this.plan.dest));
                    bodies.push(system_1.default.position(this.plan.origin));
                    bodies.push(this.plan.coords);
                }
                bodies.push(this.plan.end);
                return physics_1.default.centroid.apply(physics_1.default, __spread(bodies));
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Transit.prototype, "fov", {
            get: function () {
                var _this = this;
                var e_3, _a, e_4, _b;
                var points = [];
                var dest_central = system_1.default.central(this.plan.dest);
                var orig_central = system_1.default.central(this.plan.origin);
                // Moon to moon in same system
                if (dest_central == orig_central && dest_central != 'sun') {
                    points.push(this.plan.start);
                    points.push(system_1.default.position(dest_central));
                }
                // Planet to its own moon
                else if (this.plan.origin == dest_central) {
                    points.push(this.plan.start);
                    try {
                        for (var _c = __values(system_1.default.bodies()), _d = _c.next(); !_d.done; _d = _c.next()) {
                            var body = _d.value;
                            if (system_1.default.central(body) == dest_central) {
                                points.push(system_1.default.position(body));
                            }
                        }
                    }
                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                    finally {
                        try {
                            if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                        }
                        finally { if (e_3) throw e_3.error; }
                    }
                }
                // Moon to it's host planet
                else if (this.plan.dest == orig_central) {
                    points.push(this.plan.start);
                    try {
                        for (var _e = __values(system_1.default.bodies()), _f = _e.next(); !_f.done; _f = _e.next()) {
                            var body = _f.value;
                            if (system_1.default.central(body) == orig_central) {
                                points.push(system_1.default.position(body));
                            }
                        }
                    }
                    catch (e_4_1) { e_4 = { error: e_4_1 }; }
                    finally {
                        try {
                            if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                        }
                        finally { if (e_4) throw e_4.error; }
                    }
                }
                // Cross system path
                else {
                    points.push(physics_1.default.centroid(this.plan.start, this.plan.coords));
                }
                points.push(this.plan.end);
                var max = Math.max.apply(Math, __spread(points.map(function (p) { return physics_1.default.distance(p, _this.center); })));
                return max / physics_1.default.AU * 1.2;
            },
            enumerable: true,
            configurable: true
        });
        return Transit;
    }());
    return Transit;
});
