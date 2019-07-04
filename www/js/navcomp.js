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
    function calculate_acceleration(turns, initial, final) {
        const key = wasm.navcomp.course_new(turns);
        wasm.navcomp.course_set_initial_position(key, ...initial[POSITION]);
        wasm.navcomp.course_set_initial_velocity(key, ...initial[VELOCITY]);
        wasm.navcomp.course_set_final_position(key, ...final[POSITION]);
        wasm.navcomp.course_set_final_velocity(key, ...final[VELOCITY]);
        const size_arg = 2 * Uint32Array.BYTES_PER_ELEMENT;
        const size_res = 4 * Float64Array.BYTES_PER_ELEMENT;
        const ptr = wasm.navcomp.alloc(size_res);
        wasm.navcomp.course_accel(key, ptr, size_res);
        const [res_ptr, res_len] = new Uint32Array(wasm.navcomp.memory.buffer.slice(ptr, ptr + size_arg));
        const [len, x, y, z] = new Float64Array(wasm.navcomp.memory.buffer.slice(res_ptr, res_ptr + size_res));
        wasm.navcomp.free(ptr, size_arg);
        wasm.navcomp.course_del(key);
        return {
            length: len,
            vector: [x, y, z],
        };
    }
    exports.calculate_acceleration = calculate_acceleration;
    function calculate_path(turns, initial, final) {
        const key = wasm.navcomp.course_new(turns);
        wasm.navcomp.course_set_initial_position(key, ...initial[POSITION]);
        wasm.navcomp.course_set_initial_velocity(key, ...initial[VELOCITY]);
        wasm.navcomp.course_set_final_position(key, ...final[POSITION]);
        wasm.navcomp.course_set_final_velocity(key, ...final[VELOCITY]);
        wasm.navcomp.course_build_path(key);
        const size_arg = 2 * Uint32Array.BYTES_PER_ELEMENT;
        const size_res = 4 * Float64Array.BYTES_PER_ELEMENT;
        const ptr = wasm.navcomp.alloc(size_res);
        const path = [];
        for (let i = 0; i < turns + 1; ++i) { // turns+1 because initial position is the first segment
            const result = wasm.navcomp.course_segment(key, ptr, size_res);
            if (result) {
                const [res_ptr, res_len] = new Uint32Array(wasm.navcomp.memory.buffer.slice(ptr, ptr + size_arg));
                const [vel, x, y, z] = new Float64Array(wasm.navcomp.memory.buffer.slice(res_ptr, res_ptr + size_res));
                path.push({
                    position: [x, y, z],
                    velocity: vel,
                });
            }
        }
        wasm.navcomp.free(ptr, size_arg);
        wasm.navcomp.course_del(key);
        return path;
    }
    exports.calculate_path = calculate_path;
    const SPT = data_1.default.hours_per_turn * 3600; // seconds per turn
    const DT = 200; // frames per turn for euler integration
    const TI = SPT / DT; // seconds per frame
    const POSITION = 0;
    const VELOCITY = 1;
    class Course {
        constructor(target, agent, turns) {
            this.key = wasm.navcomp.course_new(turns);
            this.turns = turns;
            this.target = target;
            this.agent = agent;
            wasm.navcomp.course_set_initial_position(this.key, agent[POSITION][0], agent[POSITION][1], agent[POSITION][2]);
            wasm.navcomp.course_set_initial_velocity(this.key, agent[VELOCITY][0], agent[VELOCITY][1], agent[VELOCITY][2]);
            wasm.navcomp.course_set_final_position(this.key, target[POSITION][0], target[POSITION][1], target[POSITION][2]);
            wasm.navcomp.course_set_final_velocity(this.key, target[VELOCITY][0], target[VELOCITY][1], target[VELOCITY][2]);
            [this.acc, this.accel] = Course.fetch_accel(this.key);
            this._path = null;
        }
        static import(opt) {
            return new Course(opt.target, opt.agent, opt.turns);
        }
        static fetch_accel(key) {
            const size_arg = 2 * Uint32Array.BYTES_PER_ELEMENT;
            const size_res = 4 * Float64Array.BYTES_PER_ELEMENT;
            const ptr = wasm.navcomp.alloc(size_res);
            wasm.navcomp.course_accel(key, ptr, size_res);
            const [res_ptr, res_len] = new Uint32Array(wasm.navcomp.memory.buffer.slice(ptr, ptr + size_arg));
            const [len, x, y, z] = new Float64Array(wasm.navcomp.memory.buffer.slice(res_ptr, res_ptr + size_res));
            wasm.navcomp.free(ptr, size_arg);
            return [len, [x, y, z]];
        }
        static fetch_next_segment(key) {
            const size_arg = 2 * Uint32Array.BYTES_PER_ELEMENT;
            const size_res = 4 * Float64Array.BYTES_PER_ELEMENT;
            const ptr = wasm.navcomp.alloc(size_res);
            const result = wasm.navcomp.course_segment(key, ptr, size_res);
            const [res_ptr, res_len] = new Uint32Array(wasm.navcomp.memory.buffer.slice(ptr, ptr + size_arg));
            const [vel, x, y, z] = new Float64Array(wasm.navcomp.memory.buffer.slice(res_ptr, res_ptr + size_res));
            wasm.navcomp.free(ptr, size_arg);
            if (result) {
                return {
                    position: [x, y, z],
                    velocity: vel,
                };
            }
            //wasm.navcomp.course_del(key);
            return null;
        }
        maxVelocity() {
            return wasm.navcomp.course_max_velocity(this.key);
        }
        path() {
            wasm.navcomp.course_build_path(this.key);
            if (!this._path) {
                this._path = [];
                let segment;
                while ((segment = Course.fetch_next_segment(this.key)) != null) {
                    this._path.push(segment);
                }
            }
            return this._path;
        }
    }
    exports.Course = Course;
    class NavComp {
        constructor(player, orig, showAll, fuelTarget, nominal) {
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
        // TODO this does not match Course.calculateAcceleration() in the slightest.
        guestimate(dest) {
            const max_turns = data_1.default.turns_per_day * 365;
            const start_pos = system_1.default.position(this.orig);
            const start_time = system_1.default.time.getTime();
            for (let i = 1; i < max_turns; ++i) {
                const t = i * data_1.default.hours_per_turn * 3600;
                const end = system_1.default.position(dest, start_time + t);
                const s = physics_1.default.distance(start_pos, end);
                const t_flip = Math.ceil(t / 2);
                const s_flip = s / 2;
                const v = (2 * s_flip) / t_flip;
                const a = Math.abs(((2 * s_flip) / Math.pow(t_flip, 2)) - ((2 * v) / t_flip));
                if (a <= this.max) {
                    const target = [end, [0, 0, 0]];
                    const agent = [start_pos, [0, 0, 0]];
                    //const course = new Course(target, agent, a, i, this.dt);
                    const course = new Course(target, agent, i);
                    return new transitplan_1.TransitPlan({
                        origin: this.orig,
                        dest: dest,
                        start: start_pos,
                        end: end,
                        dist: s,
                        fuel: this.player.ship.burnRate(a) * i,
                        course: course,
                    });
                }
            }
        }
        getFastestTransitTo(dest) {
            const transits = this.astrogator(dest);
            for (const transit of transits) {
                return transit;
            }
        }
        getShipAcceleration() {
            if (this.nominal) {
                return physics_1.default.deltav(this.player.ship.thrust, this.player.ship.currentMass());
            }
            else {
                return this.player.shipAcceleration();
            }
        }
        getShipMass() {
            if (this.nominal) {
                return this.player.ship.nominalMass(true);
                ;
            }
            else {
                return this.player.ship.currentMass();
            }
        }
        *astrogator(destination) {
            const orig = system_1.default.orbit_by_turns(this.orig);
            const dest = system_1.default.orbit_by_turns(destination);
            const vInit = Vec.div_scalar(Vec.sub(orig[1], orig[0]), SPT);
            const bestAcc = Math.min(this.player.maxAcceleration(), this.getShipAcceleration());
            const fuelrate = this.player.ship.fuelrate;
            const thrust = this.player.ship.thrust;
            const fuel = this.fuelTarget;
            const mass = this.getShipMass();
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
                const course = new Course(target, agent, turns);
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
