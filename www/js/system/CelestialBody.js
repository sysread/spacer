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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
define(["require", "exports", "./orbit", "../deferred", "./helpers/units", "./data/constants", "../quaternion"], function (require, exports, orbit_1, deferred_1, units, constants, Q) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    deferred_1 = __importDefault(deferred_1);
    units = __importStar(units);
    constants = __importStar(constants);
    Q = __importStar(Q);
    /*
     * Convenience functions to convert degrees to normalized radians.
     */
    var circleInRadians = 2 * Math.PI;
    var ratioDegToRad = Math.PI / 180;
    var rad = function (n) { return n * ratioDegToRad; };
    var nrad = function (n) { return (n * ratioDegToRad) % circleInRadians; };
    /*
     * Convenience functions to work with time stamps
     */
    var J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
    var DayInMS = 24 * 60 * 60 * 1000;
    var CenturyInMS = 100 * 365.24 * DayInMS;
    var daysBetween = function (a, b) { return (a - b) / DayInMS; };
    var centuriesBetween = function (a, b) { return (a - b) / CenturyInMS; };
    var SpaceThing = /** @class */ (function () {
        function SpaceThing(key, name, type, radius) {
            this.key = key;
            this.name = name;
            this.type = type;
            this.radius = units.kmToMeters(radius);
        }
        SpaceThing.prototype.orbit = function (start) {
            return new orbit_1.Orbit(this, start);
        };
        return SpaceThing;
    }());
    exports.SpaceThing = SpaceThing;
    var CelestialBody = /** @class */ (function (_super) {
        __extends(CelestialBody, _super);
        function CelestialBody(key, data, central) {
            var _this = _super.call(this, key, data.name, data.type, data.radius) || this;
            _this.satellites = {};
            var init = CelestialBody.adaptData(data);
            _this.central = central;
            _this.elements = init.elements;
            _this.mass = init.mass || 1;
            _this.ring = init.ring;
            _this.position = init.position;
            _this.mu = constants.G * _this.mass; // m^3/s^2
            _this.tilt = init.tilt == undefined ? 0 : rad(-init.tilt);
            _this.pending = {};
            _this.worker = new Worker("js/orbit_worker.js");
            _this.worker.onmessage = function (e) {
                var _a = e.data, time = _a.time, result = _a.result;
                _this.pending[time].resolve(result);
            };
            return _this;
        }
        CelestialBody.adaptData = function (body) {
            // deep clone the body data, which is ro
            var data = JSON.parse(JSON.stringify(body));
            data.mass = data.mass || 1;
            if (data.ring) {
                data.ring.innerRadius = units.kmToMeters(data.ring.innerRadius);
                data.ring.outerRadius = units.kmToMeters(data.ring.outerRadius);
            }
            if (data.elements) { // not the sun or another static body
                switch (data.elements.format) {
                    case 'jpl-satellites-table':
                    case 'heavens-above':
                        data.elements.base.a = units.kmToMeters(data.elements.base.a);
                        break;
                    default:
                        data.elements.base.a = units.AUToMeters(data.elements.base.a);
                        if (data.elements.cy) {
                            data.elements.cy.a = units.AUToMeters(data.elements.cy.a);
                        }
                        break;
                }
            }
            return data;
        };
        CelestialBody.prototype.getElementsAtTimeSoon = function (time) {
            return __awaiter(this, void 0, void 0, function () {
                var body;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.pending[time] = new deferred_1.default;
                            body = {
                                elements: this.elements,
                                central: this.central ? { mu: this.central.mu } : undefined,
                            };
                            this.worker.postMessage({
                                body: body,
                                time: time,
                            });
                            return [4 /*yield*/, this.pending[time].promise];
                        case 1: return [2 /*return*/, _a.sent()];
                    }
                });
            });
        };
        CelestialBody.prototype.getPositionAtTimeSoon = function (t) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, a, e, i, L, lp, node, w, M, E, x, y, p;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!this.central) {
                                return [2 /*return*/, new orbit_1.Frame([0, 0, 0], undefined, t)];
                            }
                            return [4 /*yield*/, this.getElementsAtTimeSoon(t)];
                        case 1:
                            _a = _b.sent(), a = _a.a, e = _a.e, i = _a.i, L = _a.L, lp = _a.lp, node = _a.node, w = _a.w, M = _a.M, E = _a.E;
                            i = nrad(i);
                            node = nrad(node);
                            w = nrad(w);
                            M = nrad(M);
                            E = nrad(E);
                            x = a * (Math.cos(E) - e);
                            y = a * Math.sin(E) * Math.sqrt(1 - (e * e));
                            p = Q.rotate_vector(Q.mul(Q.from_euler(node, this.central.tilt, 0), Q.from_euler(w, i, 0)), [x, y, 0]);
                            return [2 /*return*/, new orbit_1.Frame(p, this.central, t)];
                    }
                });
            });
        };
        CelestialBody.prototype.period = function (t) {
            if (!this.central)
                return 0;
            var a = this.getElementAtTime('a', t);
            var period = 0;
            if (this.central) {
                period = 2 * Math.PI * Math.sqrt((a * a * a) / this.central.mu);
            }
            return period;
        };
        CelestialBody.prototype.getElementAtTime = function (name, t) {
            if (!this.elements)
                throw new Error("getElementAtTime called with no elements defined on " + this.name);
            var value = this.elements.base[name];
            if (this.elements.cy !== undefined && this.elements.cy[name] !== undefined)
                value += this.elements.cy[name] * centuriesBetween(t, J2000);
            return value;
        };
        CelestialBody.prototype.getElementsAtTime = function (t) {
            var a = this.getElementAtTime('a', t);
            var e = this.getElementAtTime('e', t);
            var i = this.getElementAtTime('i', t);
            var L = this.getElementAtTime('L', t);
            var lp = this.getElementAtTime('lp', t);
            var node = this.getElementAtTime('node', t);
            var w = lp - node; // argument of periapsis
            var M = this.getMeanAnomaly(L, lp, t);
            var E = this.getEccentricAnomaly(M, e);
            var period = this.period(t);
            return { a: a, e: e, i: i, L: L, lp: lp, node: node, w: w, M: M, E: E, period: period };
        };
        CelestialBody.prototype.getMeanAnomaly = function (L, lp, t) {
            var M = L - lp;
            if (this.elements) {
                if (this.elements.day) {
                    M += this.elements.day.M * daysBetween(t, J2000);
                }
                // augmentation for outer planets per:
                //   https://ssd.jpl.nasa.gov/txt/aprx_pos_planets.pdf
                if (this.elements.aug) {
                    var T = centuriesBetween(t, J2000);
                    var b = this.elements.aug.b;
                    var c = this.elements.aug.c;
                    var s = this.elements.aug.s;
                    var f = this.elements.aug.f;
                    if (b != undefined) {
                        M += T * T * b;
                    }
                    if (f != undefined) {
                        if (c != undefined) {
                            M += c * Math.cos(f * T);
                        }
                        if (s != undefined) {
                            M += s * Math.sin(f * T);
                        }
                    }
                }
            }
            return M;
        };
        CelestialBody.prototype.getEccentricAnomaly = function (M, e) {
            var E = M;
            while (true) {
                var dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
                E -= dE;
                if (Math.abs(dE) < (1e-6)) {
                    break;
                }
            }
            return E;
        };
        CelestialBody.prototype.getPositionAtTime = function (t) {
            if (!this.central) {
                return new orbit_1.Frame([0, 0, 0], undefined, t);
            }
            var _a = this.getElementsAtTime(t), a = _a.a, e = _a.e, i = _a.i, L = _a.L, lp = _a.lp, node = _a.node, w = _a.w, M = _a.M, E = _a.E;
            i = nrad(i);
            node = nrad(node);
            w = nrad(w);
            M = nrad(M);
            E = nrad(E);
            var x = a * (Math.cos(E) - e);
            var y = a * Math.sin(E) * Math.sqrt(1 - (e * e));
            var p = Q.rotate_vector(Q.mul(Q.from_euler(node, this.central.tilt, 0), Q.from_euler(w, i, 0)), [x, y, 0]);
            return new orbit_1.Frame(p, this.central, t);
        };
        return CelestialBody;
    }(SpaceThing));
    exports.CelestialBody = CelestialBody;
    var LaGrangePoint = /** @class */ (function (_super) {
        __extends(LaGrangePoint, _super);
        function LaGrangePoint(key, data, parent) {
            var _this = _super.call(this, key, data.name, "lagrange", data.radius) || this;
            _this.offset = data.offset;
            _this.parent = parent;
            return _this;
        }
        LaGrangePoint.prototype.period = function (t) {
            return this.parent.period(t);
        };
        LaGrangePoint.prototype.getPositionAtTime = function (t) {
            var r = this.offset;
            var _a = __read(this.parent.getPositionAtTime(t).position, 3), x = _a[0], y = _a[1], z = _a[2];
            var x1 = (x * Math.cos(this.offset)) - (y * Math.sin(this.offset));
            var y1 = (x * Math.sin(this.offset)) + (y * Math.cos(this.offset));
            return new orbit_1.Frame([x1, y1, z], undefined, t);
        };
        LaGrangePoint.prototype.getPositionAtTimeSoon = function (t) {
            return __awaiter(this, void 0, void 0, function () {
                var r, _a, x, y, z, x1, y1;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            r = this.offset;
                            return [4 /*yield*/, this.parent.getPositionAtTimeSoon(t)];
                        case 1:
                            _a = __read.apply(void 0, [(_b.sent()).position, 3]), x = _a[0], y = _a[1], z = _a[2];
                            x1 = (x * Math.cos(this.offset)) - (y * Math.sin(this.offset));
                            y1 = (x * Math.sin(this.offset)) + (y * Math.cos(this.offset));
                            return [2 /*return*/, new orbit_1.Frame([x1, y1, z], undefined, t)];
                    }
                });
            });
        };
        return LaGrangePoint;
    }(SpaceThing));
    exports.LaGrangePoint = LaGrangePoint;
    function isCelestialBody(body) {
        return body.type != undefined;
    }
    exports.isCelestialBody = isCelestialBody;
    function isLaGrangePoint(body) {
        return body.parent != undefined;
    }
    exports.isLaGrangePoint = isLaGrangePoint;
});
