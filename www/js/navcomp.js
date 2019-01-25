var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
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
define(["require", "exports", "./data", "./system", "./physics", "./transitplan", "./vector"], function (require, exports, data_1, system_1, physics_1, transitplan_1, Vec) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    data_1 = __importDefault(data_1);
    system_1 = __importDefault(system_1);
    physics_1 = __importDefault(physics_1);
    Vec = __importStar(Vec);
    var SPT = data_1.default.hours_per_turn * 3600; // seconds per turn
    var DT = 10000; // frames per turn for euler integration
    var TI = SPT / DT; // seconds per frame
    var POSITION = 0;
    var VELOCITY = 1;
    var Course = /** @class */ (function () {
        function Course(target, agent, maxAccel, turns, dt) {
            this.target = target;
            this.agent = agent;
            this.maxAccel = maxAccel;
            this.turns = turns;
            this.tflip = SPT * this.turns / 2; // seconds to flip point
            this.accel = this.calculateAcceleration();
            this.dt = dt || DT;
            this._path = null;
        }
        Course.prototype.export = function () {
            return {
                target: this.target,
                agent: this.agent,
                accel: this.accel,
                maxAccel: this.maxAccel,
                turns: this.turns,
            };
        };
        Course.import = function (opt) {
            return new Course(opt.target, opt.agent, opt.maxAccel, opt.turns);
        };
        Object.defineProperty(Course.prototype, "acc", {
            get: function () { return Vec.clone(this.accel); },
            enumerable: true,
            configurable: true
        });
        // a = (2s / t^2) - (2v / t)
        Course.prototype.calculateAcceleration = function () {
            // Calculate portion of target velocity to match by flip point
            var dvf = Vec.mul_scalar(this.target[VELOCITY], 2 / this.tflip);
            // Calculate portion of total change in velocity to apply by flip point
            var dvi = Vec.mul_scalar(Vec.sub(this.agent[VELOCITY], dvf), 2 / this.tflip);
            var acc = Vec.sub(this.target[POSITION], this.agent[POSITION]); // (2s / 2) for flip point
            acc = Vec.div_scalar(acc, this.tflip * this.tflip); // t^2
            acc = Vec.sub(acc, dvi); // less the change in velocity
            return acc;
        };
        Course.prototype.maxVelocity = function () {
            var t = this.tflip;
            return Vec.length(Vec.mul_scalar(this.accel, t));
        };
        Course.prototype.path = function () {
            if (!this._path) {
                var p = this.agent[POSITION]; // initial position
                var v = this.agent[VELOCITY]; // initial velocity
                var TI_1 = SPT / this.dt;
                var vax = Vec.mul_scalar(this.acc, TI_1); // static portion of change in velocity each TI
                var dax = Vec.mul_scalar(this.acc, TI_1 * TI_1 / 2); // static portion of change in position each TI
                var path = [];
                var t_1 = 0;
                for (var turn = 0; turn < this.turns; ++turn) {
                    // Split turn's updates into DT increments to prevent inaccuracies
                    // creeping into the final result.
                    for (var i = 0; i < this.dt; ++i) {
                        t_1 += TI_1;
                        if (t_1 > this.tflip) {
                            v = Vec.sub(v, vax); // decelerate after flip
                        }
                        else {
                            v = Vec.add(v, vax); // accelerate before flip
                        }
                        // Update position
                        p = Vec.add(p, Vec.add(Vec.mul_scalar(v, TI_1), dax));
                    }
                    var segment = {
                        position: p,
                        velocity: Vec.length(v),
                    };
                    path.push(segment);
                }
                this._path = path;
            }
            return this._path;
        };
        return Course;
    }());
    exports.Course = Course;
    var NavComp = /** @class */ (function () {
        function NavComp(player, orig, showAll, fuelTarget) {
            this.player = player;
            this.orig = orig;
            this.showAll = showAll || false;
            this.fuelTarget = fuelTarget ? Math.min(fuelTarget, player.ship.fuel) : player.ship.fuel;
            this.max = player.maxAcceleration();
        }
        NavComp.prototype.setFuelTarget = function (units) {
            this.fuelTarget = Math.min(units, this.player.ship.fuel);
        };
        NavComp.prototype.getTransitsTo = function (dest) {
            var e_1, _a;
            if (!this.data) {
                this.data = {};
            }
            if (!this.data[dest]) {
                this.data[dest] = [];
                var transits = this.astrogator(dest);
                try {
                    for (var transits_1 = __values(transits), transits_1_1 = transits_1.next(); !transits_1_1.done; transits_1_1 = transits_1.next()) {
                        var transit = transits_1_1.value;
                        this.data[dest].push(transit);
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (transits_1_1 && !transits_1_1.done && (_a = transits_1.return)) _a.call(transits_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
            return this.data[dest];
        };
        NavComp.prototype.getFastestTransitTo = function (dest) {
            var e_2, _a;
            var transits = this.astrogator(dest);
            try {
                for (var transits_2 = __values(transits), transits_2_1 = transits_2.next(); !transits_2_1.done; transits_2_1 = transits_2.next()) {
                    var transit = transits_2_1.value;
                    return transit;
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (transits_2_1 && !transits_2_1.done && (_a = transits_2.return)) _a.call(transits_2);
                }
                finally { if (e_2) throw e_2.error; }
            }
        };
        NavComp.prototype.astrogator = function (destination) {
            var orig, dest, vInit, bestAcc, mass, fuelrate, thrust, fuel, prevFuelUsed, turns, distance, fuelPerTurn, thrustPerTurn, availAcc, maxAccel, vFinal, target, agent, course, a, fuelUsed, fuelUsedPerTurn;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        orig = system_1.default.orbit_by_turns(this.orig);
                        dest = system_1.default.orbit_by_turns(destination);
                        vInit = Vec.div_scalar(Vec.sub(orig[1], orig[0]), SPT);
                        bestAcc = Math.min(this.player.maxAcceleration(), this.player.shipAcceleration());
                        mass = this.player.ship.currentMass();
                        fuelrate = this.player.ship.fuelrate;
                        thrust = this.player.ship.thrust;
                        fuel = this.fuelTarget;
                        turns = 1;
                        _a.label = 1;
                    case 1:
                        if (!(turns < dest.length)) return [3 /*break*/, 4];
                        distance = physics_1.default.distance(orig[0], dest[turns]);
                        fuelPerTurn = Math.min(fuel / turns, fuelrate);
                        thrustPerTurn = thrust * fuelPerTurn / fuelrate;
                        availAcc = thrustPerTurn / mass;
                        maxAccel = Math.min(bestAcc, availAcc);
                        vFinal = Vec.div_scalar(Vec.sub(dest[turns], dest[turns - 1]), SPT);
                        target = [dest[turns], vFinal];
                        agent = [orig[0], vInit];
                        course = new Course(target, agent, maxAccel, turns, this.dt);
                        a = Vec.length(course.accel);
                        if (a > maxAccel)
                            return [3 /*break*/, 3];
                        fuelUsed = a / availAcc * fuelPerTurn * turns * 0.99;
                        fuelUsedPerTurn = fuelUsed / turns;
                        if (fuelUsed > fuel)
                            return [3 /*break*/, 3];
                        if (prevFuelUsed === undefined || prevFuelUsed >= fuelUsed) {
                            prevFuelUsed = fuelUsed;
                        }
                        else {
                            return [3 /*break*/, 3];
                        }
                        return [4 /*yield*/, new transitplan_1.TransitPlan({
                                origin: this.orig,
                                dest: destination,
                                start: orig[0],
                                end: dest[turns],
                                dist: distance,
                                fuel: fuelUsed,
                                course: course,
                            })];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        ++turns;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        };
        return NavComp;
    }());
    exports.NavComp = NavComp;
});
