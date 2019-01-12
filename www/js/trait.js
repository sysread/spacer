var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "./data"], function (require, exports, data_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    data_1 = __importDefault(data_1);
    var Trait = /** @class */ (function () {
        function Trait(name) {
            this.name = name;
        }
        Object.defineProperty(Trait.prototype, "produces", {
            get: function () { return data_1.default.traits[this.name].produces || {}; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Trait.prototype, "consumes", {
            get: function () { return data_1.default.traits[this.name].consumes || {}; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Trait.prototype, "price", {
            get: function () { return data_1.default.traits[this.name].price || {}; },
            enumerable: true,
            configurable: true
        });
        Trait.prototype.priceOf = function (item) {
            return this.price[item] || 0;
        };
        return Trait;
    }());
    exports.Trait = Trait;
    ;
});
