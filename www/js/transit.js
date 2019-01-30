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
define(["require", "exports", "./system"], function (require, exports, system_1) {
    "use strict";
    system_1 = __importDefault(system_1);
    var Transit = /** @class */ (function () {
        function Transit(plan, layout) {
            this.plan = plan;
            this.layout = layout;
            this.bodies = {};
            this.orbits = {};
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
        return Transit;
    }());
    return Transit;
});
