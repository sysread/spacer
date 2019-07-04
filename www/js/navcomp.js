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
    const ARG_2_U32 = 2 * Uint32Array.BYTES_PER_ELEMENT;
    const RES_4_F64 = 4 * Float64Array.BYTES_PER_ELEMENT;
    const RES_5_F64 = 5 * Float64Array.BYTES_PER_ELEMENT;
    const SPT = data_1.default.hours_per_turn * 3600; // seconds per turn
    const DT = 200; // frames per turn for euler integration
    const TI = SPT / DT; // seconds per frame
    const POSITION = 0;
    const VELOCITY = 1;
    // See comment about ugliness in navcomp.zig
    function calculate_acceleration_fast(turns, initial, final) {
        wasm.navcomp.course_accel_fast(turns, initial.position[0], initial.position[1], initial.position[2], initial.velocity[0], initial.velocity[1], initial.velocity[2], final.position[0], final.position[1], final.position[2], final.velocity[0], final.velocity[1], final.velocity[2], ptr, RES_5_F64);
        const [res_ptr, res_len] = new Uint32Array(wasm.navcomp.memory.buffer.slice(ptr, ptr + ARG_2_U32));
        const [maxvel, len, x, y, z] = new Float64Array(wasm.navcomp.memory.buffer.slice(res_ptr, res_ptr + RES_5_F64));
        return {
            vector: [x, y, z],
            length: len,
            maxvel: maxvel,
        };
    }
    exports.calculate_acceleration_fast = calculate_acceleration_fast;
    const ptr = wasm.navcomp.alloc(RES_4_F64);
    function calculate_acceleration(turns, initial, final) {
        const key = wasm.navcomp.course_new(turns);
        wasm.navcomp.course_set_initial_position(key, ...initial.position);
        wasm.navcomp.course_set_initial_velocity(key, ...initial.velocity);
        wasm.navcomp.course_set_final_position(key, ...final.position);
        wasm.navcomp.course_set_final_velocity(key, ...final.velocity);
        const maxvel = wasm.navcomp.course_max_velocity(key);
        //const ptr = wasm.navcomp.alloc(RES_4_F64);
        wasm.navcomp.course_accel(key, ptr, RES_4_F64);
        const [res_ptr, res_len] = new Uint32Array(wasm.navcomp.memory.buffer.slice(ptr, ptr + ARG_2_U32));
        const [len, x, y, z] = new Float64Array(wasm.navcomp.memory.buffer.slice(res_ptr, res_ptr + RES_4_F64));
        //wasm.navcomp.free(ptr, ARG_4_F64);
        wasm.navcomp.course_del(key);
        return {
            vector: [x, y, z],
            length: len,
            maxvel: maxvel,
        };
    }
    exports.calculate_acceleration = calculate_acceleration;
    function calculate_trajectory(turns, initial, final) {
        const key = wasm.navcomp.course_new(turns);
        wasm.navcomp.course_set_initial_position(key, ...initial.position);
        wasm.navcomp.course_set_initial_velocity(key, ...initial.velocity);
        wasm.navcomp.course_set_final_position(key, ...final.position);
        wasm.navcomp.course_set_final_velocity(key, ...final.velocity);
        wasm.navcomp.course_build_path(key);
        const max_velocity = wasm.navcomp.course_max_velocity(key);
        //const ptr = wasm.navcomp.alloc(RES_4_F64);
        const path = [];
        for (let i = 0; i < turns + 2; ++i) { // turns+2 because initial is first, final is last, path is in the middle
            const result = wasm.navcomp.course_segment(key, ptr, RES_4_F64);
            if (result) {
                const [res_ptr, res_len] = new Uint32Array(wasm.navcomp.memory.buffer.slice(ptr, ptr + ARG_2_U32));
                const [vel, x, y, z] = new Float64Array(wasm.navcomp.memory.buffer.slice(res_ptr, res_ptr + RES_4_F64));
                path.push({
                    position: [x, y, z],
                    velocity: vel,
                });
            }
        }
        //wasm.navcomp.free(ptr, ARG_4_F64);
        wasm.navcomp.course_del(key);
        return {
            max_velocity: max_velocity,
            path: path,
        };
    }
    exports.calculate_trajectory = calculate_trajectory;
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
                const target = { position: dest[turns], velocity: vFinal };
                const agent = { position: orig[0], velocity: vInit };
                const a = calculate_acceleration_fast(turns, agent, target);
                if (a.length > maxAccel)
                    continue;
                const fuelUsed = a.length / availAcc * fuelPerTurn * turns * 0.99; // `* 0.99` to work around rounding error
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
                    turns: turns,
                    initial: agent,
                    final: target,
                    origin: this.orig,
                    dest: destination,
                    start: orig[0],
                    end: dest[turns],
                    dist: distance,
                    fuel: fuelUsed,
                    acc: a,
                });
            }
        }
    }
    exports.NavComp = NavComp;
});
