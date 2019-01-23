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
            this.produces = data_1.default.traits[name].produces || {};
            this.consumes = data_1.default.traits[name].consumes || {};
            this.price = data_1.default.traits[name].price || {};
        }
        return Trait;
    }());
    exports.Trait = Trait;
    ;
});
