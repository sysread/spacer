var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
define(["require", "exports", "../data/constants"], function (require, exports, constants) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    constants = __importStar(constants);
    function kmToMeters(v) {
        return v * 1000;
    }
    exports.kmToMeters = kmToMeters;
    function metersToKM(v) {
        return v / 1000;
    }
    exports.metersToKM = metersToKM;
    function AUToMeters(v) {
        return v * constants.metersInAU;
    }
    exports.AUToMeters = AUToMeters;
    function metersToAU(v) {
        return v / constants.metersInAU;
    }
    exports.metersToAU = metersToAU;
});
