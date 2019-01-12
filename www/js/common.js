define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var _resource = {
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
    var _faction = {
        UN: true,
        MC: true,
        CERES: true,
        JFT: true,
        TRANSA: true,
    };
    var _body = {
        mercury: true,
        earth: true,
        moon: true,
        venus: true,
        mars: true,
        phobos: true,
        ceres: true,
        europa: true,
        callisto: true,
        ganymede: true,
        trojans: true,
        enceladus: true,
        rhea: true,
        titan: true,
        triton: true,
        titania: true,
        pluto: true,
    };
    var _drive = {
        ion: true,
        fusion: true,
    };
    var _shipdmg = {
        armor: true,
        hull: true,
    };
    var _shiptype = {
        shuttle: true,
        schooner: true,
        hauler: true,
        merchantman: true,
        freighter: true,
        corvette: true,
        cruiser: true,
        battleship: true,
        fortuna: true,
        neptune: true,
        barsoom: true,
        'rock-hopper': true,
    };
    var _addon = {
        cargo_pod: true,
        fuel_tank: true,
        liquid_schwartz: true,
        ion: true,
        fusion: true,
        armor: true,
        advanced_armor: true,
        railgun_turret: true,
        railgun_cannon: true,
        light_torpedo: true,
        medium_torpedo: true,
        heavy_torpedo: true,
        pds: true,
        ecm: true,
        stealthPlating: true,
    };
    exports.resources = Object.keys(_resource);
    exports.factions = Object.keys(_faction);
    exports.bodies = Object.keys(_body);
    exports.drives = Object.keys(_drive);
    exports.shipdmgs = Object.keys(_shipdmg);
    exports.shiptypes = Object.keys(_shiptype);
    exports.addons = Object.keys(_addon);
    function isRaw(res) {
        return res.mine !== undefined;
    }
    exports.isRaw = isRaw;
    function isCraft(res) {
        return res.recipe !== undefined;
    }
    exports.isCraft = isCraft;
});
