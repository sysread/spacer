var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "./data", "./physics", "./system/SolarSystem", "./system/CelestialBody", "./events"], function (require, exports, data_1, physics_1, SolarSystem_1, CelestialBody_1, events_1) {
    "use strict";
    data_1 = __importDefault(data_1);
    physics_1 = __importDefault(physics_1);
    SolarSystem_1 = __importDefault(SolarSystem_1);
    const system = new SolarSystem_1.default;
    const ms_per_hour = 60 * 60 * 1000;
    const ms_per_turn = data_1.default.hours_per_turn * ms_per_hour;
    class System {
        constructor() {
            this.system = system;
            this.cache = {};
            this.pos = {};
            this.orbits = {};
            events_1.watch("turn", (ev) => {
                this.reset_orbit_cache();
                return { complete: false };
            });
        }
        reset_orbit_cache() {
            this.orbits = {};
            this.pos = {};
            const turns = data_1.default.turns_per_day * 365 - 1;
            const date = turns * ms_per_turn + this.time.getTime();
            for (const body of this.all_bodies()) {
                const key = `${body}.orbit.turns`;
                if (this.cache[key] == undefined) {
                    this.orbit_by_turns(body);
                }
                else {
                    this.cache[key].shift();
                    this.cache[key].push(this.position(body, date));
                }
            }
        }
        get time() {
            return window.game.date;
        }
        bodies() {
            return Object.keys(data_1.default.bodies);
        }
        all_bodies() {
            const bodies = {};
            for (const body of this.bodies()) {
                bodies[body] = true;
                bodies[this.central(body)] = true;
            }
            return Object.keys(bodies);
        }
        body(name) {
            if (this.system.bodies[name] == undefined) {
                throw new Error(`body not found: ${name}`);
            }
            return this.system.bodies[name];
        }
        short_name(name) {
            if (name === 'moon')
                return 'Luna';
            return this.body(name).name;
        }
        name(name) {
            if (data_1.default.bodies.hasOwnProperty(name)) {
                return data_1.default.bodies[name].name;
            }
            return this.body(name).name;
        }
        faction(name) {
            return data_1.default.bodies[name].faction;
        }
        type(name) {
            return this.body(name).type;
        }
        central(name) {
            let body = this.body(name);
            if (CelestialBody_1.isCelestialBody(body) && body.central) {
                return body.central.key;
            }
            return 'sun';
        }
        kind(name) {
            let body = this.body(name);
            let type = this.type(name);
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
        }
        gravity(name) {
            // Artificial gravity (spun up, orbital)
            const artificial = data_1.default.bodies[name].gravity;
            if (artificial != undefined) {
                return artificial;
            }
            const body = this.body(name);
            const grav = 6.67e-11;
            if (CelestialBody_1.isCelestialBody(body)) {
                const mass = body.mass;
                const radius = body.radius;
                return (grav * mass) / Math.pow(radius, 2) / physics_1.default.G;
            }
            throw new Error(name + " does not have parameters for calculation of gravity");
        }
        ranges(point) {
            const ranges = {};
            for (const body of this.bodies()) {
                ranges[body] = physics_1.default.distance(point, this.position(body));
            }
            return ranges;
        }
        closestBodyToPoint(point) {
            let dist, closest;
            for (const body of this.bodies()) {
                const d = physics_1.default.distance(point, this.position(body));
                if (dist === undefined || d < dist) {
                    dist = d;
                    closest = body;
                }
            }
            return [closest, dist];
        }
        position(name, date) {
            if (name == 'sun') {
                return [0, 0, 0];
            }
            date = date || this.time;
            const key = date.valueOf();
            if (this.pos[key] == undefined) {
                this.pos[key] = {};
            }
            if (this.pos[key][name] == undefined) {
                const body = this.body(name);
                const t = date instanceof Date ? date.getTime() : date;
                let pos = body.getPositionAtTime(t);
                this.pos[key][name] = pos.absolute;
            }
            return this.pos[key][name];
        }
        position_on_turn(name, turn) {
            const dt = new Date(window.game.date);
            dt.setHours(dt.getHours() + ((turn - window.game.turns) * data_1.default.hours_per_turn));
            return this.position(name, dt);
        }
        orbit(name) {
            if (!this.orbits[name]) {
                this.orbits[name] = this.body(name).orbit(this.time.getTime());
            }
            return this.orbits[name];
        }
        // turns, relative to sun
        orbit_by_turns(name) {
            const key = `${name}.orbit.turns`;
            if (this.cache[key] == undefined) {
                const periods = data_1.default.turns_per_day * 365;
                const points = [];
                let date = this.time.getTime();
                for (let i = 0; i < periods; ++i) {
                    points.push(this.position(name, date));
                    date += ms_per_turn;
                }
                this.cache[key] = points;
            }
            return this.cache[key];
        }
        distance(origin, destination) {
            return physics_1.default.distance(this.position(origin), this.position(destination));
        }
    }
    return new System;
});
