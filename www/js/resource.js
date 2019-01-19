var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
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
define(["require", "exports", "./data", "./common", "./util"], function (require, exports, data_1, t, util) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    data_1 = __importDefault(data_1);
    t = __importStar(t);
    util = __importStar(util);
    var e_1, _a;
    function craftValue(item) {
        var e_2, _a;
        var value = 0;
        try {
            for (var _b = __values(Object.keys(item.recipe.materials)), _c = _b.next(); !_c.done; _c = _b.next()) {
                var mat = _c.value;
                var amt = item.recipe.materials[mat] || 0;
                var val = resourceValue(mat);
                value += amt * val;
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_2) throw e_2.error; }
        }
        value += data_1.default.craft_fee * value; // craft fee
        value += value * (1 + (0.05 * item.recipe.tics)); // time to craft
        return value;
    }
    function resourceValue(name) {
        if (exports.resources[name] != undefined) {
            return exports.resources[name].value;
        }
        var item = data_1.default.resources[name];
        var value = 0;
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
    var Resource = /** @class */ (function () {
        function Resource(name) {
            this.name = name;
            this.mass = data_1.default.resources[name].mass;
            this.contraband = data_1.default.resources[name].contraband;
            this.value = Math.ceil(resourceValue(name));
            this.minPrice = Math.ceil(this.calcMinPrice());
            this.maxPrice = Math.ceil(this.calcMaxPrice());
        }
        Resource.prototype.calcMaxPrice = function () {
            var factor = 6;
            for (var i = 10; i < this.value; i *= 10) {
                factor /= 1.8;
            }
            return this.value * Math.max(1.2, factor);
        };
        Resource.prototype.calcMinPrice = function () {
            var factor = 3;
            for (var i = 10; i < this.value; i *= 10) {
                factor /= 1.8;
            }
            return this.value / Math.max(1.2, factor);
        };
        Resource.prototype.clampPrice = function (price) {
            return Math.ceil(util.clamp(price, this.minPrice, this.maxPrice));
        };
        return Resource;
    }());
    exports.Resource = Resource;
    var Raw = /** @class */ (function (_super) {
        __extends(Raw, _super);
        function Raw(name) {
            var _this = _super.call(this, name) || this;
            var res = data_1.default.resources[name];
            if (!t.isRaw(res)) {
                throw new Error("not a raw material: " + name);
            }
            _this.mine = res.mine;
            _this.mineTurns = _this.mine.tics;
            return _this;
        }
        return Raw;
    }(Resource));
    exports.Raw = Raw;
    var Craft = /** @class */ (function (_super) {
        __extends(Craft, _super);
        function Craft(name) {
            var _this = _super.call(this, name) || this;
            var res = data_1.default.resources[name];
            if (!t.isCraft(res)) {
                throw new Error("not a craftable resource: " + name);
            }
            _this.recipe = res.recipe;
            _this.craftTurns = _this.recipe.tics;
            _this.ingredients = Object.keys(_this.recipe.materials);
            return _this;
        }
        return Craft;
    }(Resource));
    exports.Craft = Craft;
    exports.resources = {};
    try {
        for (var _b = __values(t.resources), _c = _b.next(); !_c.done; _c = _b.next()) {
            var item = _c.value;
            if (data_1.default.resources[item].recipe) {
                exports.resources[item] = new Craft(item);
            }
            else if (data_1.default.resources[item].mine) {
                exports.resources[item] = new Raw(item);
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_1) throw e_1.error; }
    }
});
