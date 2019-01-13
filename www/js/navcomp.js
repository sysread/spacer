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
define(["require", "exports", "./data", "./system", "./physics", "./transitplan", "./vector"], function (require, exports, data_1, system_1, physics_1, transitplan_1, vector_1) {
    "use strict";
    data_1 = __importDefault(data_1);
    system_1 = __importDefault(system_1);
    physics_1 = __importDefault(physics_1);
    transitplan_1 = __importDefault(transitplan_1);
    var SPT = data_1.default.hours_per_turn * 3600; // seconds per turn
    var DT = 1000; // frames per turn for euler integration
    var TI = SPT / DT; // seconds per frame
    var Body = /** @class */ (function () {
        function Body(position, velocity) {
            this.position = position.clone();
            this.velocity = velocity.clone();
        }
        Object.defineProperty(Body.prototype, "pos", {
            get: function () { return this.position.clone(); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Body.prototype, "vel", {
            get: function () { return this.velocity.clone(); },
            enumerable: true,
            configurable: true
        });
        return Body;
    }());
    var Course = /** @class */ (function () {
        function Course(target, agent, maxAccel, turns) {
            this.target = target;
            this.agent = agent;
            this.maxAccel = maxAccel;
            this.turns = turns;
            this.tflip = SPT * this.turns / 2; // seconds to flip point
            this.accel = this.calculateAcceleration();
            this._path = null;
        }
        Object.defineProperty(Course.prototype, "acc", {
            get: function () { return this.accel.clone(); },
            enumerable: true,
            configurable: true
        });
        // a = (2s / t^2) - (2v / t)
        Course.prototype.calculateAcceleration = function () {
            // Calculate portion of target velocity to match by flip point
            var dvf = this.target.vel
                .mul_scalar(2 / this.tflip);
            // Calculate portion of total change in velocity to apply by flip point
            var dvi = this.agent.vel
                .sub(dvf)
                .mul_scalar(2 / this.tflip);
            return this.target.pos // change in position
                .sub(this.agent.position) // (2s / 2) for flip point
                .div_scalar(this.tflip * this.tflip) // t^2
                .sub(dvi); // less the change in velocity
        };
        Course.prototype.maxVelocity = function () {
            var t = this.tflip;
            return this.accel.clone().mul_scalar(t).length;
        };
        Course.prototype.path = function () {
            if (this._path != null) {
                return this._path;
            }
            var p = this.agent.pos; // initial position
            var v = this.agent.vel; // initial velocity
            var vax = this.acc.mul_scalar(TI); // static portion of change in velocity each TI
            var dax = this.acc.mul_scalar(TI * TI / 2); // static portion of change in position each TI
            var path = [];
            var t = 0;
            for (var turn = 0; turn < this.turns; ++turn) {
                // Split turn's updates into DT increments to prevent inaccuracies
                // creeping into the final result.
                for (var i = 0; i < DT; ++i) {
                    t += TI;
                    if (t > this.tflip) {
                        v.sub(vax); // decelerate after flip
                    }
                    else {
                        v.add(vax); // accelerate before flip
                    }
                    // Update position
                    p.add(v.clone().mul_scalar(TI).add(dax));
                }
                var segment = {
                    position: p.clone().point,
                    velocity: v.clone().length,
                };
                path.push(segment);
            }
            this._path = path;
            return path;
        };
        return Course;
    }());
    var NavComp = /** @class */ (function () {
        function NavComp(player, orig, show_all, fuel_target) {
            this.player = player;
            this.orig = orig;
            this.fuel_target = fuel_target || player.ship.fuel;
            this.show_all = show_all || false;
            this.max = player.maxAcceleration();
        }
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
        NavComp.prototype.astrogator = function (destination) {
            var orig, dest, startPos, vInit, bestAcc, mass, fuelrate, thrust, fuel, prevFuelUsed, turns, distance, fuelPerTurn, thrustPerTurn, availAcc, maxAccel, targetPos, vFinal, target, agent, course, a, fuelUsed, fuelUsedPerTurn;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        orig = system_1.default.orbit_by_turns(this.orig);
                        dest = system_1.default.orbit_by_turns(destination);
                        startPos = vector_1.vec(orig[0]);
                        vInit = vector_1.vec(orig[1]).sub(vector_1.vec(orig[0])).div_scalar(SPT);
                        bestAcc = Math.min(this.player.maxAcceleration(), this.player.shipAcceleration());
                        mass = this.player.ship.currentMass();
                        fuelrate = this.player.ship.fuelrate;
                        thrust = this.player.ship.thrust;
                        fuel = this.fuel_target;
                        turns = 1;
                        _a.label = 1;
                    case 1:
                        if (!(turns < dest.length)) return [3 /*break*/, 4];
                        distance = physics_1.default.distance(orig[0], dest[turns]);
                        fuelPerTurn = Math.min(fuel / turns, fuelrate);
                        thrustPerTurn = thrust * fuelPerTurn / fuelrate;
                        availAcc = thrustPerTurn / mass;
                        maxAccel = Math.min(bestAcc, availAcc);
                        targetPos = vector_1.vec(dest[turns]);
                        vFinal = targetPos.clone().sub(vector_1.vec(dest[turns - 1])).div_scalar(SPT);
                        target = new Body(targetPos, vFinal);
                        agent = new Body(startPos, vInit);
                        course = new Course(target, agent, maxAccel, turns);
                        a = course.accel.length;
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
                        return [4 /*yield*/, new transitplan_1.default({
                                origin: this.orig,
                                dest: destination,
                                start: startPos.point,
                                end: targetPos.point,
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
    return NavComp;
});
