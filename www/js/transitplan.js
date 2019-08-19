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
define(["require", "exports", "./data", "./physics", "./navcomp", "./util"], function (require, exports, data_1, physics_1, navcomp_1, util) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    data_1 = __importDefault(data_1);
    physics_1 = __importDefault(physics_1);
    util = __importStar(util);
    function isNewTransitPlan(opt) {
        return opt.current_turn == undefined;
    }
    function isSavedTransitPlan(opt) {
        return opt.current_turn != undefined;
    }
    class TransitPlan {
        constructor(opt) {
            this.turns = opt.turns; // total turns to complete trip
            this.fuel = opt.fuel; // fuel used during trip
            this.start = opt.start; // start point of transit
            this.end = opt.end; // final point of transit
            this.origin = opt.origin; // origin body name
            this.dest = opt.dest; // destination body name
            this.dist = opt.dist; // trip distance in meters
            this.acc = opt.acc;
            this.current_turn = 0;
            this.initial = opt.initial;
            this.final = opt.final;
            if (isSavedTransitPlan(opt)) {
                this.current_turn = opt.current_turn;
                this._course = opt._course;
            }
        }
        get maxVelocity() { return this.course.max_velocity; }
        get path() { return this.course.path; }
        get accel() { return this.acc.length; } // m/s/s
        get accel_g() { return this.accel / physics_1.default.G; }
        get hours() { return this.turns * data_1.default.hours_per_turn; } // hours
        get left() { return this.turns - this.current_turn; }
        get currentTurn() { return this.current_turn; }
        get turnpct() { return 100 / this.turns; } // percent of trip per turn
        get is_started() { return this.current_turn > 0; }
        get is_complete() { return this.left <= 0; }
        get pct_complete() { return 100 - (this.left * this.turnpct); }
        get segment() { return physics_1.default.distance(this.start, this.end); }
        get segment_au() { return this.segment / physics_1.default.AU; }
        get flip_point() { return this.path[Math.floor(this.turns / 2)].position; }
        get coords() { return this.path[this.current_turn].position; }
        get velocity() { return this.path[this.current_turn].velocity; }
        get au() { return this.dist / physics_1.default.AU; }
        get km() { return this.dist / 1000; }
        get initial_velocity() { return this.path[0].vector; }
        get final_velocity() { return this.path[this.turns - 1].vector; }
        get current_velocity() { return this.path[this.current_turn].vector; }
        get course() {
            if (this._course == undefined) {
                this._course = navcomp_1.calculate_trajectory(this.turns, this.initial, this.final);
            }
            return this._course;
        }
        get days_left() {
            return Math.ceil(this.left * data_1.default.hours_per_turn / 24);
        }
        get days_hours() {
            const d = this.hours / 24;
            const h = this.hours % 24;
            return [util.R(d), h];
        }
        get str_arrival() {
            const [d, h] = this.days_hours;
            return `${d} days, ${h} hours`;
        }
        turn() {
            if (!this.is_complete) {
                ++this.current_turn;
            }
        }
        distanceRemaining() {
            return physics_1.default.distance(this.coords, this.end);
        }
        auRemaining() {
            return this.distanceRemaining() / physics_1.default.AU;
        }
    }
    exports.TransitPlan = TransitPlan;
});
