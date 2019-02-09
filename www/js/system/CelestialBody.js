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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
define(["require", "exports", "./orbit", "./helpers/units", "./data/constants", "../quaternion"], function (require, exports, orbit_1, units, constants, Q) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
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
