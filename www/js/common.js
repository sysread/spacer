define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Resource = {
        water: true,
        ore: true,
        minerals: true,
        hydrocarbons: true,
        food: true,
        fuel: true,
        metal: true,
        ceramics: true,
        medicine: true,
        machines: true,
        electronics: true,
        cybernetics: true,
        narcotics: true,
        weapons: true,
    };
    exports.resources = Object.keys(Resource);
});
