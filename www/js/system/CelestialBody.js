var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
define(["require", "exports", "./orbit", "../quaternion", "../fastmath"], function (require, exports, orbit_1, Q, FastMath) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    Q = __importStar(Q);
    FastMath = __importStar(FastMath);
    const G = 6.67408e-11; // G, in m^3/s^2
    const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
    const DayInMS = 24 * 60 * 60 * 1000;
    const CenturyInMS = 100 * 365.24 * DayInMS;
    function daysBetween(a, b) {
        return (a - b) / DayInMS;
    }
    function centuriesBetween(a, b) {
        return (a - b) / CenturyInMS;
    }
    function degreesToRadians(n) {
        return n * (Math.PI / 180);
    }
    function normalizeRadians(n) {
        return (n * (Math.PI / 180)) % (2 * Math.PI);
    }
    function kmToMeters(v) {
        return v * 1000;
    }
    function metersToKM(v) {
        return v / 1000;
    }
    function AUToMeters(v) {
        return v * 149597870700;
    }
    function metersToAU(v) {
        return v / 149597870700;
    }
    class SpaceThing {
        constructor(key, name, type, radius) {
            this.key = key;
            this.name = name;
            this.type = type;
            this.radius = kmToMeters(radius);
        }
        orbit(start) {
            return new orbit_1.Orbit(this, start);
        }
    }
    exports.SpaceThing = SpaceThing;
    class CelestialBody extends SpaceThing {
        constructor(key, data, central) {
            super(key, data.name, data.type, data.radius);
            this.satellites = {};
            const init = CelestialBody.adaptData(data);
            this.central = central;
            this.elements = init.elements;
            this.mass = init.mass || 1;
            this.ring = init.ring;
            this.position = init.position;
            this.mu = this.mass * G;
            this.tilt = init.tilt == undefined ? 0 : degreesToRadians(-init.tilt);
        }
        static adaptData(body) {
            // deep clone the body data, which is ro
            const data = JSON.parse(JSON.stringify(body));
            data.mass = data.mass || 1;
            if (data.ring) {
                data.ring.innerRadius = kmToMeters(data.ring.innerRadius);
                data.ring.outerRadius = kmToMeters(data.ring.outerRadius);
            }
            if (data.elements) { // not the sun or another static body
                switch (data.elements.format) {
                    case 'jpl-satellites-table':
                    case 'heavens-above':
                        data.elements.base.a = kmToMeters(data.elements.base.a);
                        break;
                    default:
                        data.elements.base.a = AUToMeters(data.elements.base.a);
                        if (data.elements.cy) {
                            data.elements.cy.a = AUToMeters(data.elements.cy.a);
                        }
                        break;
                }
            }
            return data;
        }
        period(t) {
            if (!this.central)
                return 0;
            const a = this.getElementAtTime('a', t);
            return 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / this.central.mu);
        }
        getElementAtTime(name, t) {
            if (!this.elements) {
                throw new Error(`getElementAtTime called with no elements defined on ${this.name}`);
            }
            const base = this.elements.base[name];
            if (this.elements.cy && this.elements.cy[name] != null) {
                return base + this.elements.cy[name] * centuriesBetween(t, J2000);
            }
            else {
                return base;
            }
        }
        getElementsAtTime(t) {
            const a = this.getElementAtTime('a', t);
            const e = this.getElementAtTime('e', t);
            const i = this.getElementAtTime('i', t);
            const L = this.getElementAtTime('L', t);
            const lp = this.getElementAtTime('lp', t);
            const node = this.getElementAtTime('node', t);
            const w = lp - node; // argument of periapsis
            const M = this.getMeanAnomaly(L, lp, t);
            const E = this.getEccentricAnomaly(M, e);
            const period = this.period(t);
            return { a, e, i, L, lp, node, w, M, E, period };
        }
        getMeanAnomaly(L, lp, t) {
            let M = L - lp;
            if (this.elements) {
                if (this.elements.day) {
                    M += this.elements.day.M * daysBetween(t, J2000);
                }
                // augmentation for outer planets per:
                //   https://ssd.jpl.nasa.gov/txt/aprx_pos_planets.pdf
                if (this.elements.aug) {
                    const T = centuriesBetween(t, J2000);
                    const b = this.elements.aug.b;
                    const c = this.elements.aug.c;
                    const s = this.elements.aug.s;
                    const f = this.elements.aug.f;
                    if (b != undefined) {
                        M += Math.pow(T, 2) * b;
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
        }
        getEccentricAnomaly(M, e) {
            let E = M;
            while (true) {
                const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
                E -= dE;
                if (FastMath.abs(dE) < (1e-6)) {
                    break;
                }
            }
            return E;
        }
        getPositionAtTime(t) {
            if (!this.central) {
                return new orbit_1.Frame([0, 0, 0], undefined, t);
            }
            let { a, e, i, L, lp, node, w, M, E } = this.getElementsAtTime(t);
            i = normalizeRadians(i);
            node = normalizeRadians(node);
            w = normalizeRadians(w);
            M = normalizeRadians(M);
            E = normalizeRadians(E);
            const x = a * (Math.cos(E) - e);
            const y = a * Math.sin(E) * Math.sqrt(1 - Math.pow(e, 2));
            const p = Q.rotate_vector(Q.mul(Q.from_euler(node, this.central.tilt, 0), Q.from_euler(w, i, 0)), [x, y, 0]);
            return new orbit_1.Frame(p, this.central, t);
        }
    }
    exports.CelestialBody = CelestialBody;
    class LaGrangePoint extends SpaceThing {
        constructor(key, data, parent) {
            super(key, data.name, "lagrange", data.radius);
            this.offset = data.offset;
            this.parent = parent;
        }
        period(t) {
            return this.parent.period(t);
        }
        getPositionAtTime(t) {
            const r = this.offset;
            let [x, y, z] = this.parent.getPositionAtTime(t).position;
            const x1 = (x * Math.cos(this.offset)) - (y * Math.sin(this.offset));
            const y1 = (x * Math.sin(this.offset)) + (y * Math.cos(this.offset));
            return new orbit_1.Frame([x1, y1, z], undefined, t);
        }
    }
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
