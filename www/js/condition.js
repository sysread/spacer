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
            this.affectedResources = {};
            Object.assign(this.affectedResources, this.produces, this.consumes);
            if (init) {
                this.turns_total = init.turns_total;
                this.turns_done = init.turns_done;
            }
            else {
                this.turns_total = this.randomDuration();
                this.turns_done = 0;
            }
        }
        get minDays() { return data_1.default.conditions[this.name].days[0]; }
        get maxDays() { return data_1.default.conditions[this.name].days[1]; }
        get turnsLeft() { return this.turns_total - this.turns_done; }
        get isOver() { return this.turns_done >= this.turns_total; }
        randomDuration() {
            return data_1.default.turns_per_day * util.getRandomInt(this.minDays, this.maxDays);
        }
        reduceDuration(fraction) {
            this.turns_total = Math.ceil(this.turns_total * fraction);
        }
        turn(p) {
            for (const item of Object.keys(this.triggers.shortage)) {
                if (!p.hasShortage(item)) {
                    this.reduceDuration(0.8);
                }
            }
            for (const item of Object.keys(this.triggers.surplus)) {
                if (!p.hasSurplus(item)) {
                    this.reduceDuration(0.8);
                }
            }
            for (const cond of Object.keys(this.triggers.condition)) {
                if (!p.hasCondition(cond) && !p.hasTrait(cond)) {
                    this.reduceDuration(0.8);
                }
            }
            ++this.turns_done;
        }
        /**
         * Tests for the chance that this condition might befall a market. Always
         * false if the market is already suffering from the condition. Otherwise,
         * the chance is based on the probability for the given resource
         * shortage/surplus or existence of another condition for trait (see
         * data.conditions.triggers).
         */
        testForChance(p) {
            // False if already active
            if (p.hasCondition(this.name)) {
                return false;
            }
            // Shortages
            for (const item of Object.keys(this.triggers.shortage)) {
                if (p.hasShortage(item)) {
                    if (util.chance(this.triggers.shortage[item])) {
                        return true;
                    }
                }
            }
            // Surpluses
            for (const item of Object.keys(this.triggers.surplus)) {
                if (p.hasSurplus(item)) {
                    if (util.chance(this.triggers.surplus[item])) {
                        return true;
                    }
                }
            }
            // Conditions
            for (const cond of Object.keys(this.triggers.condition)) {
                if (p.hasCondition(cond) || p.hasTrait(cond)) {
                    if (util.chance(this.triggers.condition[cond])) {
                        return true;
                    }
                }
            }
            return false;
        }
    }
    exports.Condition = Condition;
});
