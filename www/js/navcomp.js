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
    const SPT = data_1.default.hours_per_turn * 3600; // seconds per turn
    const DT = 1000; // frames per turn for euler integration
    const TI = SPT / DT; // seconds per frame
    const POSITION = 0;
    const VELOCITY = 1;
    class Course {
        constructor(target, agent, maxAccel, turns) {
            this.target = target;
            this.agent = agent;
            this.maxAccel = maxAccel;
            this.turns = turns;
            this.tflip = SPT * this.turns / 2; // seconds to flip point
            this.accel = this.calculateAcceleration();
            this._path = null;
        }
        export() {
            return {
                target: this.target,
                agent: this.agent,
                accel: this.accel,
                maxAccel: this.maxAccel,
                turns: this.turns,
            };
        }
        static import(opt) {
            return new Course(opt.target, opt.agent, opt.maxAccel, opt.turns);
        }
        get acc() { return Vec.clone(this.accel); }
        // a = (2s / t^2) - (2v / t)
        calculateAcceleration() {
            // Calculate portion of target velocity to match by flip point
            const dvf = Vec.mul_scalar(this.target[VELOCITY], 2 / this.tflip);
            // Calculate portion of total change in velocity to apply by flip point
            const dvi = Vec.mul_scalar(Vec.sub(this.agent[VELOCITY], dvf), 2 / this.tflip);
            let acc = Vec.sub(this.target[POSITION], this.agent[POSITION]); // (2s / 2) for flip point
            acc = Vec.div_scalar(acc, this.tflip * this.tflip); // t^2
            acc = Vec.sub(acc, dvi); // less the change in velocity
            return acc;
        }
        maxVelocity() {
            const t = this.tflip;
            return Vec.length(Vec.mul_scalar(this.accel, t));
        }
        path() {
            if (this._path != null) {
                return this._path;
            }
            let p = this.agent[POSITION]; // initial position
            let v = this.agent[VELOCITY]; // initial velocity
            const vax = Vec.mul_scalar(this.acc, TI); // static portion of change in velocity each TI
            const dax = Vec.mul_scalar(this.acc, TI * TI / 2); // static portion of change in position each TI
            const path = [];
            let t = 0;
            for (let turn = 0; turn < this.turns; ++turn) {
                // Split turn's updates into DT increments to prevent inaccuracies
                // creeping into the final result.
                for (let i = 0; i < DT; ++i) {
                    t += TI;
                    if (t > this.tflip) {
                        v = Vec.sub(v, vax); // decelerate after flip
                    }
                    else {
                        v = Vec.add(v, vax); // accelerate before flip
                    }
                    // Update position
                    p = Vec.add(p, Vec.add(Vec.mul_scalar(v, TI), dax));
                }
                const segment = {
                    position: p,
                    velocity: Vec.length(v),
                };
                path.push(segment);
            }
            this._path = path;
            return path;
        }
    }
    exports.Course = Course;
    class NavComp {
        constructor(player, orig, showAll, fuelTarget) {
            this.player = player;
            this.orig = orig;
            this.showAll = showAll || false;
            this.fuelTarget = fuelTarget ? Math.min(fuelTarget, player.ship.fuel) : player.ship.fuel;
            this.max = player.maxAcceleration();
        }
        setFuelTarget(units) {
            this.fuelTarget = Math.min(units, this.player.ship.fuel);
        }
        getTransitsTo(dest) {
            if (!this.data) {
                this.data = {};
            }
            if (!this.data[dest]) {
                this.data[dest] = [];
                const transits = this.astrogator(dest);
                for (const transit of transits) {
                    this.data[dest].push(transit);
                }
            }
            return this.data[dest];
        }
        getFastestTransitTo(dest) {
            const transits = this.astrogator(dest);
            for (const transit of transits) {
                return transit;
            }
        }
        *astrogator(destination) {
            const orig = system_1.default.orbit_by_turns(this.orig);
            const dest = system_1.default.orbit_by_turns(destination);
            const vInit = Vec.div_scalar(Vec.sub(orig[1], orig[0]), SPT);
            const bestAcc = Math.min(this.player.maxAcceleration(), this.player.shipAcceleration());
            const mass = this.player.ship.currentMass();
            const fuelrate = this.player.ship.fuelrate;
            const thrust = this.player.ship.thrust;
            const fuel = this.fuelTarget;
            let prevFuelUsed;
            for (let turns = 1; turns < dest.length; ++turns) {
                const distance = physics_1.default.distance(orig[0], dest[turns]);
                const fuelPerTurn = Math.min(fuel / turns, fuelrate);
                const thrustPerTurn = thrust * fuelPerTurn / fuelrate;
                const availAcc = thrustPerTurn / mass;
                const maxAccel = Math.min(bestAcc, availAcc);
                const vFinal = Vec.div_scalar(Vec.sub(dest[turns], dest[turns - 1]), SPT);
                const target = [dest[turns], vFinal];
                const agent = [orig[0], vInit];
                const course = new Course(target, agent, maxAccel, turns);
                const a = Vec.length(course.accel);
                if (a > maxAccel)
                    continue;
                const fuelUsed = a / availAcc * fuelPerTurn * turns * 0.99; // `* 0.99` to work around rounding error
                const fuelUsedPerTurn = fuelUsed / turns;
                if (fuelUsed > fuel)
                    continue;
                if (prevFuelUsed === undefined || prevFuelUsed >= fuelUsed) {
                    prevFuelUsed = fuelUsed;
                }
                else {
                    continue;
                }
                yield new transitplan_1.TransitPlan({
                    origin: this.orig,
                    dest: destination,
                    start: orig[0],
                    end: dest[turns],
                    dist: distance,
                    fuel: fuelUsed,
                    course: course,
                });
            }
        }
    }
    exports.NavComp = NavComp;
});
