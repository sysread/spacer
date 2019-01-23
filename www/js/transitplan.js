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
define(["require", "exports", "./data", "./physics", "./navcomp", "./vector", "./util"], function (require, exports, data_1, physics_1, navcomp_1, vector_1, util) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    data_1 = __importDefault(data_1);
    physics_1 = __importDefault(physics_1);
    util = __importStar(util);
    function isNewTransitPlan(opt) {
        return opt.course != undefined;
    }
    function isSavedTransitPlan(opt) {
        return opt.left != undefined;
    }
    class TransitPlan {
        constructor(opt) {
            this.fuel = opt.fuel; // fuel used during trip
            this.start = opt.start; // start point of transit
            this.end = opt.end; // final point of transit
            this.origin = opt.origin; // origin body name
            this.dest = opt.dest; // destination body name
            this.dist = opt.dist; // trip distance in meters
            if (isSavedTransitPlan(opt)) {
                this.course = navcomp_1.Course.import(opt.course);
                this.left = opt.left;
                this.coords = opt.coords;
                this.velocity = opt.velocity;
                this.au = opt.au;
                this.km = opt.dist;
            }
            else if (isNewTransitPlan(opt)) {
                this.course = opt.course;
                this.left = opt.course.turns;
                this.coords = this.start;
                this.velocity = 0;
                this.au = this.dist / physics_1.default.AU;
                this.km = this.dist / 1000;
            }
            else {
                throw new Error('invalid transit plan args');
            }
        }
        get turns() { return this.course.turns; } // turns
        get accel() { return vector_1.length(this.course.accel); } // m/s/s
        get accel_g() { return this.accel / physics_1.default.G; }
        get path() { return this.course.path(); }
        get maxVelocity() { return this.course.maxVelocity(); }
        get hours() { return this.turns * data_1.default.hours_per_turn; } // hours
        get currentTurn() { return this.turns - this.left; }
        get turnpct() { return 100 / this.turns; } // percent of trip per turn
        get is_complete() { return this.left === 0; }
        get pct_complete() { return 100 - (this.left * this.turnpct); }
        get segment() { return physics_1.default.distance(this.start, this.end); }
        get segment_au() { return this.segment / physics_1.default.AU; }
        get flip_point() { return this.path[Math.floor(this.turns / 2)].position; }
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
        turn(turns = 1) {
            if (!this.is_complete) {
                turns = Math.min(this.left, turns);
                const path = this.path[this.currentTurn + turns - 1];
                this.velocity = path.velocity;
                this.coords = path.position;
                this.left -= turns;
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
