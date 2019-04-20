var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "./mercury", "./earth", "./mars", "./ceres", "./jupiter", "./saturn", "./uranus", "./neptune", "./pluto"], function (require, exports, mercury_1, earth_1, mars_1, ceres_1, jupiter_1, saturn_1, uranus_1, neptune_1, pluto_1) {
    "use strict";
    mercury_1 = __importDefault(mercury_1);
    earth_1 = __importDefault(earth_1);
    mars_1 = __importDefault(mars_1);
    ceres_1 = __importDefault(ceres_1);
    jupiter_1 = __importDefault(jupiter_1);
    saturn_1 = __importDefault(saturn_1);
    uranus_1 = __importDefault(uranus_1);
    neptune_1 = __importDefault(neptune_1);
    pluto_1 = __importDefault(pluto_1);
    const sun = {
        name: 'The Sun',
        type: 'star',
        radius: 6.955e5,
        mass: 1.988544e30,
        position: [0, 0, 0],
        satellites: {
            mercury: mercury_1.default,
            earth: earth_1.default,
            mars: mars_1.default,
            ceres: ceres_1.default,
            jupiter: jupiter_1.default,
            saturn: saturn_1.default,
            uranus: uranus_1.default,
            neptune: neptune_1.default,
            pluto: pluto_1.default,
        },
    };
    return sun;
});
