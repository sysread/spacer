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
    var ms_per_turn = data_1.default.hours_per_turn * ms_per_hour;
    var System = /** @class */ (function () {
        function System() {
            var _this = this;
            this.system = system;
            this.cache = {};
            this.pos = {};
            this.orbits = {};
            window.addEventListener("turn", function () { return __awaiter(_this, void 0, void 0, function () {
                var e_1, _a, turns, date, _b, _c, body, key, _d, _e, e_1_1;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            this.orbits = {};
                            this.pos = {};
                            turns = data_1.default.turns_per_day * 365 - 1;
                            date = turns * ms_per_turn + this.time.getTime();
                            _f.label = 1;
                        case 1:
                            _f.trys.push([1, 7, 8, 9]);
                            _b = __values(this.all_bodies()), _c = _b.next();
                            _f.label = 2;
                        case 2:
                            if (!!_c.done) return [3 /*break*/, 6];
                            body = _c.value;
                            key = body + ".orbit.turns";
                            if (!(this.cache[key] == undefined)) return [3 /*break*/, 3];
                            this.orbit_by_turns(body);
                            return [3 /*break*/, 5];
                        case 3:
                            this.cache[key].shift();
                            _e = (_d = this.cache[key]).push;
                            return [4 /*yield*/, this.position(body, date)];
                        case 4:
                            _e.apply(_d, [_f.sent()]);
                            _f.label = 5;
                        case 5:
                            _c = _b.next();
                            return [3 /*break*/, 2];
                        case 6: return [3 /*break*/, 9];
                        case 7:
                            e_1_1 = _f.sent();
                            e_1 = { error: e_1_1 };
                            return [3 /*break*/, 9];
                        case 8:
                            try {
                                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                            }
                            finally { if (e_1) throw e_1.error; }
                            return [7 /*endfinally*/];
                        case 9: return [2 /*return*/];
                    }
                });
            }); });
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
            return __awaiter(this, void 0, void 0, function () {
                var e_3, _a, ranges, _b, _c, body, _d, _e, _f, _g, _h, e_3_1;
                return __generator(this, function (_j) {
                    switch (_j.label) {
                        case 0:
                            ranges = {};
                            _j.label = 1;
                        case 1:
                            _j.trys.push([1, 6, 7, 8]);
                            _b = __values(this.bodies()), _c = _b.next();
                            _j.label = 2;
                        case 2:
                            if (!!_c.done) return [3 /*break*/, 5];
                            body = _c.value;
                            _d = ranges;
                            _e = body;
                            _g = (_f = physics_1.default).distance;
                            _h = [point];
                            return [4 /*yield*/, this.position(body)];
                        case 3:
                            _d[_e] = _g.apply(_f, _h.concat([_j.sent()]));
                            _j.label = 4;
                        case 4:
                            _c = _b.next();
                            return [3 /*break*/, 2];
                        case 5: return [3 /*break*/, 8];
                        case 6:
                            e_3_1 = _j.sent();
                            e_3 = { error: e_3_1 };
                            return [3 /*break*/, 8];
                        case 7:
                            try {
                                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                            }
                            finally { if (e_3) throw e_3.error; }
                            return [7 /*endfinally*/];
                        case 8: return [2 /*return*/, ranges];
                    }
                });
            });
        };
        System.prototype.closestBodyToPoint = function (point) {
            return __awaiter(this, void 0, void 0, function () {
                var e_4, _a, dist, closest, _b, _c, body, d, _d, _e, _f, e_4_1;
                return __generator(this, function (_g) {
                    switch (_g.label) {
                        case 0:
                            _g.trys.push([0, 5, 6, 7]);
                            _b = __values(this.bodies()), _c = _b.next();
                            _g.label = 1;
                        case 1:
                            if (!!_c.done) return [3 /*break*/, 4];
                            body = _c.value;
                            _e = (_d = physics_1.default).distance;
                            _f = [point];
                            return [4 /*yield*/, this.position(body)];
                        case 2:
                            d = _e.apply(_d, _f.concat([_g.sent()]));
                            if (dist === undefined || d < dist) {
                                dist = d;
                                closest = body;
                            }
                            _g.label = 3;
                        case 3:
                            _c = _b.next();
                            return [3 /*break*/, 1];
                        case 4: return [3 /*break*/, 7];
                        case 5:
                            e_4_1 = _g.sent();
                            e_4 = { error: e_4_1 };
                            return [3 /*break*/, 7];
                        case 6:
                            try {
                                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                            }
                            finally { if (e_4) throw e_4.error; }
                            return [7 /*endfinally*/];
                        case 7: return [2 /*return*/, [closest, dist]];
                    }
                });
            });
        };
        System.prototype.orbit = function (name) {
            if (!this.orbits[name]) {
                this.orbits[name] = this.body(name).orbit(this.time.getTime());
            }
            return this.orbits[name];
        };
        System.prototype.position = function (name, date) {
            return __awaiter(this, void 0, void 0, function () {
                var body, t, pos;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (name == 'sun') {
                                return [2 /*return*/, [0, 0, 0]];
                            }
                            date = date || this.time;
                            body = this.body(name);
                            t = date instanceof Date ? date.getTime() : date;
                            return [4 /*yield*/, body.getPositionAtTimeSoon(t)];
                        case 1:
                            pos = _a.sent();
                            return [4 /*yield*/, pos.absolute()];
                        case 2: return [2 /*return*/, _a.sent()];
                    }
                });
            });
        };
        // turns, relative to sun
        System.prototype.orbit_by_turns = function (name) {
            return __awaiter(this, void 0, void 0, function () {
                var key, periods, points, date, i, _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            key = name + ".orbit.turns";
                            if (!(this.cache[key] == undefined)) return [3 /*break*/, 5];
                            periods = data_1.default.turns_per_day * 365;
                            points = [];
                            date = this.time.getTime();
                            i = 0;
                            _c.label = 1;
                        case 1:
                            if (!(i < periods)) return [3 /*break*/, 4];
                            _b = (_a = points).push;
                            return [4 /*yield*/, this.position(name, date)];
                        case 2:
                            _b.apply(_a, [_c.sent()]);
                            date += ms_per_turn;
                            _c.label = 3;
                        case 3:
                            ++i;
                            return [3 /*break*/, 1];
                        case 4:
                            this.cache[key] = points;
                            _c.label = 5;
                        case 5: return [2 /*return*/, this.cache[key]];
                    }
                });
            });
        };
        System.prototype.distance = function (origin, destination) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _b = (_a = physics_1.default).distance;
                            return [4 /*yield*/, this.position(origin)];
                        case 1:
                            _c = [_d.sent()];
                            return [4 /*yield*/, this.position(destination)];
                        case 2: return [2 /*return*/, _b.apply(_a, _c.concat([_d.sent()]))];
                    }
                });
            });
        };
        return System;
    }());
    return new System;
});
