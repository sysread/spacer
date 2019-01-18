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
define(["require", "exports", "./data", "./physics", "./util"], function (require, exports, data_1, physics_1, util) {
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
    var TransitPlan = /** @class */ (function () {
        function TransitPlan(opt) {
            this.fuel = opt.fuel; // fuel used during trip
            this.start = opt.start; // start point of transit
            this.end = opt.end; // final point of transit
            this.origin = opt.origin; // origin body name
            this.dest = opt.dest; // destination body name
            this.dist = opt.dist; // trip distance in meters
            if (isSavedTransitPlan(opt)) {
                this.turns = opt.turns;
                this.accel = opt.accel;
                this.maxVelocity = opt.maxVelocity;
                this.path = opt.path;
                this.left = opt.left;
                this.coords = opt.coords;
                this.velocity = opt.velocity;
                this.au = opt.au;
                this.km = opt.dist;
            }
            else if (isNewTransitPlan(opt)) {
                this.turns = opt.course.turns;
                this.accel = opt.course.accel.length;
                this.maxVelocity = opt.course.maxVelocity();
                this.path = opt.course.path();
                this.left = opt.course.turns;
                this.coords = this.start;
                this.velocity = 0;
                this.au = this.dist / physics_1.default.AU;
                this.km = this.dist / 1000;
            }
            else {
                throw new Error('invalid transit plan args');
            }
            this.accel_g = this.accel / physics_1.default.G;
        }
        Object.defineProperty(TransitPlan.prototype, "hours", {
            get: function () { return this.turns * data_1.default.hours_per_turn; } // hours
            ,
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TransitPlan.prototype, "currentTurn", {
            get: function () { return this.turns - this.left; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TransitPlan.prototype, "turnpct", {
            get: function () { return 100 / this.turns; } // percent of trip per turn
            ,
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TransitPlan.prototype, "is_complete", {
            get: function () { return this.left === 0; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TransitPlan.prototype, "pct_complete", {
            get: function () { return 100 - (this.left * this.turnpct); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TransitPlan.prototype, "segment", {
            get: function () { return physics_1.default.distance(this.start, this.end); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TransitPlan.prototype, "segment_au", {
            get: function () { return this.segment / physics_1.default.AU; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TransitPlan.prototype, "flip_point", {
            get: function () { return this.path[Math.floor(this.turns / 2)].position; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TransitPlan.prototype, "days_left", {
            get: function () {
                return Math.ceil(this.left * data_1.default.hours_per_turn / 24);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TransitPlan.prototype, "days_hours", {
            get: function () {
                var d = this.hours / 24;
                var h = this.hours % 24;
                return [util.R(d), h];
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TransitPlan.prototype, "str_arrival", {
            get: function () {
                var _a = __read(this.days_hours, 2), d = _a[0], h = _a[1];
                return d + " days, " + h + " hours";
            },
            enumerable: true,
            configurable: true
        });
        TransitPlan.prototype.turn = function (turns) {
            if (turns === void 0) { turns = 1; }
            if (!this.is_complete) {
                turns = Math.min(this.left, turns);
                var path = this.path[this.currentTurn + turns - 1];
                this.velocity = path.velocity;
                this.coords = path.position;
                this.left -= turns;
            }
        };
        TransitPlan.prototype.distanceRemaining = function () {
            return physics_1.default.distance(this.coords, this.end);
        };
        TransitPlan.prototype.auRemaining = function () {
            return this.distanceRemaining() / physics_1.default.AU;
        };
        return TransitPlan;
    }());
    exports.TransitPlan = TransitPlan;
});
