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
    class Condition {
        constructor(name, init) {
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
        get min_days() { return data_1.default.conditions[this.name].days[0]; }
        get max_days() { return data_1.default.conditions[this.name].days[1]; }
        get on_shortage() { return this.triggers.shortage || {}; }
        get on_surplus() { return this.triggers.surplus || {}; }
        get on_condition() { return this.triggers.condition || {}; }
        get turns_left() { return this.turns_total - this.turns_done; }
        get is_over() { return this.turns_done >= this.turns_total; }
        inc_turns() { ++this.turns_done; }
        mul_turns(f) {
            this.turns_total = Math.ceil(this.turns_total * f);
        }
    }
    exports.Condition = Condition;
    ;
});
