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
    function craftValue(item) {
        var value = 0;
        for (var _i = 0, _a = Object.keys(item.recipe.materials); _i < _a.length; _i++) {
            var mat = _a[_i];
            var amt = item.recipe.materials[mat] || 0;
            var val = resourceValue(data_1.default.resources[mat]);
            value += amt * val;
        }
        value += Math.max(1, util.R(data_1.default.craft_fee * value, 2));
        for (var i = 0; i < item.recipe.tics; ++i) {
            value *= 1.5;
        }
        return value;
    }
    function resourceValue(item) {
        if (t.isCraft(item)) {
            return craftValue(item);
        }
        else if (t.isRaw(item)) {
            return item.mine.value;
        }
        else {
            return 0;
        }
    }
    /*
     * Global storage of resource objects
     */
    exports.resources = {};
    function getResource(item) {
        if (exports.resources[item] == undefined) {
            if (data_1.default.resources[item].recipe) {
                exports.resources[item] = new Craft(item);
            }
            else if (data_1.default.resources[item].mine) {
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
            this.value = resourceValue(data_1.default.resources[name]);
        }
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
});
