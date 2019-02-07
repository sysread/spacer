var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "./bodies/sun", "./bodies/mercury", "./bodies/earth", "./bodies/mars", "./bodies/ceres", "./bodies/jupiter", "./bodies/saturn", "./bodies/uranus", "./bodies/neptune", "./bodies/pluto"], function (require, exports, sun_1, mercury_1, earth_1, mars_1, ceres_1, jupiter_1, saturn_1, uranus_1, neptune_1, pluto_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    sun_1 = __importDefault(sun_1);
    mercury_1 = __importDefault(mercury_1);
    earth_1 = __importDefault(earth_1);
    mars_1 = __importDefault(mars_1);
    ceres_1 = __importDefault(ceres_1);
    jupiter_1 = __importDefault(jupiter_1);
    saturn_1 = __importDefault(saturn_1);
    uranus_1 = __importDefault(uranus_1);
    neptune_1 = __importDefault(neptune_1);
    pluto_1 = __importDefault(pluto_1);
    exports.sun = sun_1.default;
    exports.mercury = mercury_1.default;
    exports.earth = earth_1.default;
    exports.mars = mars_1.default;
    exports.ceres = ceres_1.default;
    exports.jupiter = jupiter_1.default;
    exports.saturn = saturn_1.default;
    exports.uranus = uranus_1.default;
    exports.neptune = neptune_1.default;
    exports.pluto = pluto_1.default;
});
