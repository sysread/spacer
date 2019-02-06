var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
define(["require", "exports", "./helpers/units", "./helpers/time", "./data/constants", "./helpers/angles", "./helpers/quaternion"], function (require, exports, units, time, constants, angles_1, quaternion_1) {
    "use strict";
    units = __importStar(units);
    time = __importStar(time);
    constants = __importStar(constants);
    function v_add(p1, p2) {
        return [
            p1[0] + p2[0],
            p1[1] + p2[1],
            p1[2] + p2[2],
        ];
    }
    function v_sub(p1, p2) {
        return [
            p1[0] - p2[0],
            p1[1] - p2[1],
            p1[2] - p2[2],
        ];
    }
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
            this.tilt = init.tilt;
            this.ring = init.ring;
            this.position = init.position;
            this.mu = constants.G * this.mass; // m^3/s^2
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
        CelestialBody.prototype.setTime = function (time) {
            this.time = time;
            if (this.elements) {
                this.position = this.getPositionAtTime(time);
            }
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
            var period;
            if (this.central) {
                period = 2 * Math.PI * Math.sqrt((a * a * a) / this.central.mu);
            }
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
            i = angles_1.normalizeRadians(angles_1.degreesToRadians(i));
            node = angles_1.normalizeRadians(angles_1.degreesToRadians(node));
            w = angles_1.normalizeRadians(angles_1.degreesToRadians(w));
            M = angles_1.normalizeRadians(angles_1.degreesToRadians(M));
            E = angles_1.normalizeRadians(angles_1.degreesToRadians(E));
            var x = a * (Math.cos(E) - e);
            var y = a * Math.sin(E) * Math.sqrt(1 - (e * e));
            var tilt = this.central != undefined
                && this.central.tilt != undefined
                ? angles_1.degreesToRadians(-this.central.tilt)
                : 0;
            var pos = quaternion_1.quaternion_rotate_vector(quaternion_1.quaternion_mul(quaternion_1.quaternion_from_euler(node, tilt, 0), quaternion_1.quaternion_from_euler(w, i, 0)), [x, y, 0]);
            return v_add(pos, this.central.getPositionAtTime(t));
        };
        // Array of 360 points, representing positions at each degree for the body's
        // orbital period.
        CelestialBody.prototype.getOrbitPath = function () {
            if (!this.time) {
                throw new Error('setTime must be called before getOrbitPath');
            }
            var period = this.getElementsAtTime(this.time).period;
            var ms = period === undefined
                ? undefined
                : (period * 1000) / 360;
            if (!this.central || this.central.key == 'sun') {
                var points = this.getOrbitPathSegment(359, ms);
                points.push(points[0].slice());
                return points;
            }
            else {
                return this.getOrbitPathSegment(360, ms);
            }
        };
        CelestialBody.prototype.getOrbitPathSegment = function (periods, msPerPeriod) {
            if (!this.time) {
                throw new Error('setTime must be called before getOrbitPath');
            }
            var points = [];
            // sun
            if (msPerPeriod === undefined) {
                for (var i = 0; i < periods; ++i) {
                    points.push([0, 0, 0]);
                }
                return points;
            }
            var date = new Date(this.time);
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
