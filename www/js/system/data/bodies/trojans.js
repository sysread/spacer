var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "./jupiter"], function (require, exports, jupiter_1) {
    "use strict";
    jupiter_1 = __importDefault(jupiter_1);
    var trojans = {
        name: 'Trojans',
        type: 'lagrange',
        radius: jupiter_1.default.radius,
        elements: jupiter_1.default.elements,
        lagrangeOf: jupiter_1.default,
    };
    return trojans;
});
