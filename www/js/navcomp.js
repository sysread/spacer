var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
    function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
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
    var DT = 200; // frames per turn for euler integration
    var TI = SPT / DT; // seconds per frame
    var POSITION = 0;
    var VELOCITY = 1;
    var Course = /** @class */ (function () {
        function Course(target, agent, maxAccel, turns, dt) {
            this.target = target;
            this.agent = agent;
            this.maxAccel = maxAccel;
            this.turns = turns;
            this.tflip = (SPT * this.turns) / 2; // seconds to flip point
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
                // Start with initial position
                path.push({ position: p, velocity: Vec.length(v) });
                for (var turn = 0; turn < this.turns; ++turn) {
                    // Split turn's updates into DT increments to prevent inaccuracies
                    // creeping into the final result.
                    for (var i = 0; i < this.dt; ++i) {
                        t_1 += TI_1;
                        if (t_1 > this.tflip) {
                            v = Vec.sub(v, vax); // decelerate after flip
                        }
                        else if (t_1 < this.tflip) {
                            v = Vec.add(v, vax); // accelerate before flip
                        }
                        // Update position
                        p = Vec.add(p, Vec.add(Vec.mul_scalar(v, TI_1), dax));
                    }
                    path.push({ position: p, velocity: Vec.length(v) });
                }
                this._path = path;
            }
            return this._path;
        };
        return Course;
    }());
    exports.Course = Course;
    var NavComp = /** @class */ (function () {
        function NavComp(player, orig, showAll, fuelTarget, nominal) {
            this.player = player;
            this.orig = orig;
            this.showAll = showAll || false;
            this.max = player.maxAcceleration();
            this.nominal = nominal ? true : false;
            if (!this.nominal && fuelTarget !== undefined) {
                this.fuelTarget = Math.min(fuelTarget, this.player.ship.fuel);
            }
            else if (this.nominal) {
                this.fuelTarget = this.player.ship.tank;
            }
            else {
                this.fuelTarget = this.player.ship.fuel;
            }
        }
        NavComp.prototype.getTransitsTo = function (dest) {
            return __awaiter(this, void 0, void 0, function () {
                var e_1, _a, transits, transits_1, transits_1_1, transit, e_1_1;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!this.data) {
                                this.data = {};
                            }
                            if (!!this.data[dest]) return [3 /*break*/, 12];
                            this.data[dest] = [];
                            transits = this.astrogator(dest);
                            _b.label = 1;
                        case 1:
                            _b.trys.push([1, 6, 7, 12]);
                            transits_1 = __asyncValues(transits);
                            _b.label = 2;
                        case 2: return [4 /*yield*/, transits_1.next()];
                        case 3:
                            if (!(transits_1_1 = _b.sent(), !transits_1_1.done)) return [3 /*break*/, 5];
                            transit = transits_1_1.value;
                            this.data[dest].push(transit);
                            _b.label = 4;
                        case 4: return [3 /*break*/, 2];
                        case 5: return [3 /*break*/, 12];
                        case 6:
                            e_1_1 = _b.sent();
                            e_1 = { error: e_1_1 };
                            return [3 /*break*/, 12];
                        case 7:
                            _b.trys.push([7, , 10, 11]);
                            if (!(transits_1_1 && !transits_1_1.done && (_a = transits_1.return))) return [3 /*break*/, 9];
                            return [4 /*yield*/, _a.call(transits_1)];
                        case 8:
                            _b.sent();
                            _b.label = 9;
                        case 9: return [3 /*break*/, 11];
                        case 10:
                            if (e_1) throw e_1.error;
                            return [7 /*endfinally*/];
                        case 11: return [7 /*endfinally*/];
                        case 12: return [2 /*return*/, this.data[dest]];
                    }
                });
            });
        };
        // TODO this does not match Course.calculateAcceleration() in the slightest.
        NavComp.prototype.guestimate = function (dest) {
            return __awaiter(this, void 0, void 0, function () {
                var max_turns, start_pos, start_time, i, t_2, end, s, t_flip, s_flip, v, a, target, agent, course;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            max_turns = data_1.default.turns_per_day * 365;
                            return [4 /*yield*/, system_1.default.position(this.orig)];
                        case 1:
                            start_pos = _a.sent();
                            start_time = system_1.default.time.getTime();
                            i = 1;
                            _a.label = 2;
                        case 2:
                            if (!(i < max_turns)) return [3 /*break*/, 5];
                            t_2 = i * data_1.default.hours_per_turn * 3600;
                            return [4 /*yield*/, system_1.default.position(dest, start_time + t_2)];
                        case 3:
                            end = _a.sent();
                            s = physics_1.default.distance(start_pos, end);
                            t_flip = Math.ceil(t_2 / 2);
                            s_flip = s / 2;
                            v = (2 * s_flip) / t_flip;
                            a = Math.abs(((2 * s_flip) / (t_flip * t_flip)) - ((2 * v) / t_flip));
                            if (a <= this.max) {
                                target = [end, [0, 0, 0]];
                                agent = [start_pos, [0, 0, 0]];
                                course = new Course(target, agent, a, i, this.dt);
                                return [2 /*return*/, new transitplan_1.TransitPlan({
                                        origin: this.orig,
                                        dest: dest,
                                        start: start_pos,
                                        end: end,
                                        dist: s,
                                        fuel: this.player.ship.burnRate(a) * i,
                                        course: course,
                                    })];
                            }
                            _a.label = 4;
                        case 4:
                            ++i;
                            return [3 /*break*/, 2];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        NavComp.prototype.getFastestTransitTo = function (dest) {
            return __awaiter(this, void 0, void 0, function () {
                var e_2, _a, transits, transits_2, transits_2_1, transit, e_2_1;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            transits = this.astrogator(dest);
                            _b.label = 1;
                        case 1:
                            _b.trys.push([1, 6, 7, 12]);
                            transits_2 = __asyncValues(transits);
                            _b.label = 2;
                        case 2: return [4 /*yield*/, transits_2.next()];
                        case 3:
                            if (!(transits_2_1 = _b.sent(), !transits_2_1.done)) return [3 /*break*/, 5];
                            transit = transits_2_1.value;
                            return [2 /*return*/, transit];
                        case 4: return [3 /*break*/, 2];
                        case 5: return [3 /*break*/, 12];
                        case 6:
                            e_2_1 = _b.sent();
                            e_2 = { error: e_2_1 };
                            return [3 /*break*/, 12];
                        case 7:
                            _b.trys.push([7, , 10, 11]);
                            if (!(transits_2_1 && !transits_2_1.done && (_a = transits_2.return))) return [3 /*break*/, 9];
                            return [4 /*yield*/, _a.call(transits_2)];
                        case 8:
                            _b.sent();
                            _b.label = 9;
                        case 9: return [3 /*break*/, 11];
                        case 10:
                            if (e_2) throw e_2.error;
                            return [7 /*endfinally*/];
                        case 11: return [7 /*endfinally*/];
                        case 12: return [2 /*return*/];
                    }
                });
            });
        };
        NavComp.prototype.getShipAcceleration = function () {
            if (this.nominal) {
                return physics_1.default.deltav(this.player.ship.thrust, this.player.ship.currentMass());
            }
            else {
                return this.player.shipAcceleration();
            }
        };
        NavComp.prototype.getShipMass = function () {
            if (this.nominal) {
                return this.player.ship.nominalMass(true);
                ;
            }
            else {
                return this.player.ship.currentMass();
            }
        };
        NavComp.prototype.astrogator = function (destination) {
            return __asyncGenerator(this, arguments, function astrogator_1() {
                var orig, dest, vInit, bestAcc, fuelrate, thrust, fuel, mass, prevFuelUsed, turns, distance, fuelPerTurn, thrustPerTurn, availAcc, maxAccel, vFinal, target, agent, course, a, fuelUsed, fuelUsedPerTurn;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, __await(system_1.default.orbit_by_turns(this.orig))];
                        case 1:
                            orig = _a.sent();
                            return [4 /*yield*/, __await(system_1.default.orbit_by_turns(destination))];
                        case 2:
                            dest = _a.sent();
                            vInit = Vec.div_scalar(Vec.sub(orig[1], orig[0]), SPT);
                            bestAcc = Math.min(this.player.maxAcceleration(), this.getShipAcceleration());
                            fuelrate = this.player.ship.fuelrate;
                            thrust = this.player.ship.thrust;
                            fuel = this.fuelTarget;
                            mass = this.getShipMass();
                            turns = 1;
                            _a.label = 3;
                        case 3:
                            if (!(turns < dest.length)) return [3 /*break*/, 7];
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
                                return [3 /*break*/, 6];
                            fuelUsed = a / availAcc * fuelPerTurn * turns * 0.99;
                            fuelUsedPerTurn = fuelUsed / turns;
                            if (fuelUsed > fuel)
                                return [3 /*break*/, 6];
                            if (prevFuelUsed === undefined || prevFuelUsed >= fuelUsed) {
                                prevFuelUsed = fuelUsed;
                            }
                            else {
                                return [3 /*break*/, 6];
                            }
                            return [4 /*yield*/, __await(new transitplan_1.TransitPlan({
                                    origin: this.orig,
                                    dest: destination,
                                    start: orig[0],
                                    end: dest[turns],
                                    dist: distance,
                                    fuel: fuelUsed,
                                    course: course,
                                }))];
                        case 4: return [4 /*yield*/, _a.sent()];
                        case 5:
                            _a.sent();
                            _a.label = 6;
                        case 6:
                            ++turns;
                            return [3 /*break*/, 3];
                        case 7: return [2 /*return*/];
                    }
                });
            });
        };
        return NavComp;
    }());
    exports.NavComp = NavComp;
});
