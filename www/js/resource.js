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
define(["require", "exports", "./data", "./common", "./util"], function (require, exports, data_1, t, util) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    data_1 = __importDefault(data_1);
    t = __importStar(t);
    util = __importStar(util);
    function craftValue(item) {
        let value = 0;
        for (const mat of Object.keys(item.recipe.materials)) {
            const amt = item.recipe.materials[mat] || 0;
            const val = resourceValue(mat);
            value += amt * val;
        }
        value += data_1.default.craft_fee * value; // craft fee
        value += value * (1 + (0.05 * item.recipe.tics)); // time to craft
        return value;
    }
    function resourceValue(name) {
        if (exports.resources[name] != undefined) {
            return exports.resources[name].value;
        }
        const item = data_1.default.resources[name];
        let value = 0;
        if (item.recipe) {
            value = craftValue(item);
        }
        else if (item.mine) {
            value = item.mine.value;
        }
        // Adjust value due to expense in reaction mass to move it
        value += value * (0.01 * item.mass);
        return value;
    }
    /*
     * Global storage of resource objects
     */
    function isRaw(res) {
        return res.mine !== undefined;
    }
    exports.isRaw = isRaw;
    function isCraft(res) {
        return res.recipe !== undefined;
    }
    exports.isCraft = isCraft;
    class Resource {
        constructor(name) {
            this.name = name;
            this.mass = data_1.default.resources[name].mass;
            this.contraband = data_1.default.resources[name].contraband;
            this.value = Math.ceil(resourceValue(name));
            this.minPrice = Math.ceil(this.calcMinPrice());
            this.maxPrice = Math.ceil(this.calcMaxPrice());
        }
        calcMaxPrice() {
            let factor = data_1.default.necessity[this.name] ? 9 : 3;
            for (let i = 10; i < this.value; i *= 10) {
                factor /= 2;
            }
            return this.value * Math.max(1.2, factor);
        }
        calcMinPrice() {
            let factor = data_1.default.necessity[this.name] ? 3 : 9;
            for (let i = 10; i < this.value; i *= 10) {
                factor /= 2;
            }
            return this.value / Math.max(1.2, factor);
        }
        clampPrice(price) {
            return Math.ceil(util.clamp(price, this.minPrice, this.maxPrice));
        }
    }
    exports.Resource = Resource;
    class Raw extends Resource {
        constructor(name) {
            super(name);
            const res = data_1.default.resources[name];
            if (!t.isRaw(res)) {
                throw new Error(`not a raw material: ${name}`);
            }
            this.mine = res.mine;
            this.mineTurns = this.mine.tics;
        }
    }
    exports.Raw = Raw;
    class Craft extends Resource {
        constructor(name) {
            super(name);
            const res = data_1.default.resources[name];
            if (!t.isCraft(res)) {
                throw new Error(`not a craftable resource: ${name}`);
            }
            this.recipe = res.recipe;
            this.craftTurns = this.recipe.tics;
            this.ingredients = Object.keys(this.recipe.materials);
        }
    }
    exports.Craft = Craft;
    exports.resources = {};
    for (const item of t.resources) {
        if (data_1.default.resources[item].recipe) {
            exports.resources[item] = new Craft(item);
        }
        else if (data_1.default.resources[item].mine) {
            exports.resources[item] = new Raw(item);
        }
    }
});
