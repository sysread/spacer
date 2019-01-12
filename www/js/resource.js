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
    /*
     * Global storage of resource objects
     */
    exports.resources = {};
    function getResource(item) {
        if (!exports.resources[item]) {
            if (t.isCraft(data_1.default.resources[item])) {
                exports.resources[item] = new Craft(item);
            }
            else if (t.isRaw(data_1.default.resources[item])) {
                exports.resources[item] = new Raw(item);
            }
        }
        return exports.resources[item];
    }
    exports.getResource = getResource;
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
        }
        Object.defineProperty(Resource.prototype, "value", {
            get: function () {
                if (this._value == null) {
                    this._value = this.calculateBaseValue();
                }
                return this._value;
            },
            enumerable: true,
            configurable: true
        });
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
            return _this;
        }
        Object.defineProperty(Raw.prototype, "mineTurns", {
            get: function () { return this.mine.tics; },
            enumerable: true,
            configurable: true
        });
        Raw.prototype.calculateBaseValue = function () {
            return this.mine.value;
        };
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
            return _this;
        }
        Object.defineProperty(Craft.prototype, "craftTurns", {
            get: function () { return this.recipe.tics; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Craft.prototype, "ingredients", {
            get: function () { return Object.keys(this.recipe.materials); },
            enumerable: true,
            configurable: true
        });
        Craft.prototype.calculateBaseValue = function () {
            var value = 0;
            for (var _i = 0, _a = this.ingredients; _i < _a.length; _i++) {
                var mat = _a[_i];
                var amt = this.recipe.materials[mat] || 0;
                var val = getResource(mat).calculateBaseValue();
                value += amt * val;
            }
            value += Math.max(1, util.R(data_1.default.craft_fee * value, 2));
            for (var i = 0; i < this.recipe.tics; ++i) {
                value *= 1.5;
            }
            return value;
        };
        return Craft;
    }(Resource));
    exports.Craft = Craft;
});
