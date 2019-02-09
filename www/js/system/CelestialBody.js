var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
define(["require", "exports", "./helpers/units", "./helpers/time", "./data/constants", "../quaternion"], function (require, exports, units, time, constants, Q) {
    "use strict";
    units = __importStar(units);
    time = __importStar(time);
    constants = __importStar(constants);
    Q = __importStar(Q);
    /**
     * Convenience function to convert degrees to normalized radians.
     */
    var circleInRadians = 2 * Math.PI;
    var ratioDegToRad = Math.PI / 180;
    var rad = function (n) { return n * ratioDegToRad; };
    var nrad = function (n) { return (n * ratioDegToRad) % circleInRadians; };
    var CelestialBody = /** @class */ (function () {
        function CelestialBody(key, data, central) {
            this.satellites = {};
            var init = CelestialBody.adaptData(data);
            this.key = key;
            this.central = central;
            this.name = init.name;
            this.type = init.type;
            this.radius = init.radius;
            this.elements = init.elements;
            this.mass = init.mass || 1;
            this.ring = init.ring;
            this.position = init.position;
            this.mu = constants.G * this.mass; // m^3/s^2
            this.tilt = init.tilt == undefined ? 0 : rad(-init.tilt);
        }
        CelestialBody.adaptData = function (body) {
            // deep clone the body data, which is ro
            var data = JSON.parse(JSON.stringify(body));
            data.radius = units.kmToMeters(data.radius);
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
            var a = this.getElementAtTime('a', t);
            var period = 0;
            if (this.central) {
                period = 2 * Math.PI * Math.sqrt((a * a * a) / this.central.mu);
            }
            return period;
        };
        CelestialBody.prototype.solar_period = function (t) {
            return (!this.central || this.central.key == 'sun')
                ? this.period(t)
                : this.central.period(t);
        };
        CelestialBody.prototype.getElementAtTime = function (name, t) {
            if (!this.elements)
                throw new Error("getElementAtTime called with no elements defined on " + this.name);
            var value = this.elements.base[name];
            if (this.elements.cy !== undefined && this.elements.cy[name] !== undefined)
                value += this.elements.cy[name] * time.centuriesBetween(t, time.J2000);
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
                    M += this.elements.day.M * time.daysBetween(t, time.J2000);
                }
                // augmentation for outer planets per:
                //   https://ssd.jpl.nasa.gov/txt/aprx_pos_planets.pdf
                if (this.elements.aug) {
                    var T = time.centuriesBetween(t, time.J2000);
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
                return [0, 0, 0];
            }
            var _a = this.getElementsAtTime(t), a = _a.a, e = _a.e, i = _a.i, L = _a.L, lp = _a.lp, node = _a.node, w = _a.w, M = _a.M, E = _a.E;
            i = nrad(i);
            node = nrad(node);
            w = nrad(w);
            M = nrad(M);
            E = nrad(E);
            var x = a * (Math.cos(E) - e);
            var y = a * Math.sin(E) * Math.sqrt(1 - (e * e));
            return Q.rotate_vector(Q.mul(Q.from_euler(node, this.central.tilt, 0), Q.from_euler(w, i, 0)), [x, y, 0]);
        };
        // Array of 360 points, representing positions at each degree for the body's
        // orbital period.
        CelestialBody.prototype.getOrbitPath = function (start, periods, msPerPeriod) {
            if (periods === void 0) { periods = 360; }
            // sun
            if (!this.central)
                return new Array(periods).fill([0, 0, 0]);
            if (msPerPeriod === undefined) {
                msPerPeriod = (this.period(start) * 1000) / periods;
            }
            var date = new Date(start);
            var points = [];
            for (var i = 0; i < periods; ++i) {
                points.push(this.getPositionAtTime(date));
                date.setMilliseconds(date.getMilliseconds() + msPerPeriod);
            }
            return points;
        };
        return CelestialBody;
    }());
    return CelestialBody;
});
