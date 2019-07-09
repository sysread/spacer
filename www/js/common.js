define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const _resource = {
        water: true,
        ore: true,
        minerals: true,
        hydrocarbons: true,
        food: true,
        fuel: true,
        luxuries: true,
        metal: true,
        ceramics: true,
        medicine: true,
        machines: true,
        electronics: true,
        cybernetics: true,
        narcotics: true,
        weapons: true,
    };
    const _faction = {
        UN: true,
        MC: true,
        CERES: true,
        JFT: true,
        TRANSA: true,
    };
    const _body = {
        mercury: true,
        earth: true,
        moon: true,
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
    const _drive = {
        ion: true,
        fusion: true,
    };
    const _shipdmg = {
        armor: true,
        hull: true,
    };
    const _shiptype = {
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
    const _addon = {
        cargo_pod: true,
        fuel_tank: true,
        heat_reclaimer: true,
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
    const _trait = {
        'mineral rich': true,
        'mineral poor': true,
        'water rich': true,
        'water poor': true,
        'hydrocarbon rich': true,
        'hydrocarbon poor': true,
        'rocky': true,
        'icy': true,
        'asteroids': true,
        'ringed system': true,
        'agricultural': true,
        'habitable': true,
        'domed': true,
        'subterranean': true,
        'orbital': true,
        'black market': true,
        'tech hub': true,
        'manufacturing hub': true,
        'capital': true,
        'military': true,
    };
    const _condition_trigger = {
        shortage: true,
        surplus: true,
        condition: true,
    };
    exports.Standing = {
        Criminal: [-100, -50],
        Untrusted: [-49, -30],
        Suspicious: [-29, -20],
        Dubious: [-19, -10],
        Neutral: [-9, 9],
        Friendly: [10, 19],
        Respected: [20, 29],
        Trusted: [30, 49],
        Admired: [50, 100],
    };
    exports.resources = Object.keys(_resource);
    exports.factions = Object.keys(_faction);
    exports.bodies = Object.keys(_body);
    exports.drives = Object.keys(_drive);
    exports.shipdmgs = Object.keys(_shipdmg);
    exports.shiptypes = Object.keys(_shiptype);
    exports.addons = Object.keys(_addon);
    exports.traits = Object.keys(_trait);
    exports.standings = Object.keys(exports.Standing);
    exports.condition_triggers = Object.keys(_condition_trigger);
    exports.isRaw = (res) => res.mine !== undefined;
    exports.isCraft = (res) => res.recipe !== undefined;
    exports.isOffensive = (addon) => addon.is_offensive;
    exports.isDefensive = (addon) => addon.is_defensive;
    exports.isMisc = (addon) => addon.is_misc;
});
