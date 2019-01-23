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
define(["require", "exports", "./data", "./util"], function (require, exports, data_1, util) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    data_1 = __importDefault(data_1);
    util = __importStar(util);
    var Condition = /** @class */ (function () {
        function Condition(name, init) {
            this.name = name;
            this.produces = data_1.default.conditions[this.name].produces || {};
            this.consumes = data_1.default.conditions[this.name].consumes || {};
            this.triggers = data_1.default.conditions[this.name].triggers || {};
            if (init) {
                this.turns_total = init.turns_total;
                this.turns_done = init.turns_done;
            }
            else {
                this.turns_total = data_1.default.turns_per_day * util.getRandomInt(this.min_days, this.max_days);
                this.turns_done = 0;
            }
        }
        Object.defineProperty(Condition.prototype, "min_days", {
            get: function () { return data_1.default.conditions[this.name].days[0]; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Condition.prototype, "max_days", {
            get: function () { return data_1.default.conditions[this.name].days[1]; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Condition.prototype, "on_shortage", {
            get: function () { return this.triggers.shortage || {}; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Condition.prototype, "on_surplus", {
            get: function () { return this.triggers.surplus || {}; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Condition.prototype, "on_condition", {
            get: function () { return this.triggers.condition || {}; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Condition.prototype, "turns_left", {
            get: function () { return this.turns_total - this.turns_done; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Condition.prototype, "is_over", {
            get: function () { return this.turns_done >= this.turns_total; },
            enumerable: true,
            configurable: true
        });
        Condition.prototype.inc_turns = function () { ++this.turns_done; };
        return Condition;
    }());
    exports.Condition = Condition;
    ;
});
