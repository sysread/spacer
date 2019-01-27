var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
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
define(["require", "exports", "./data", "./physics", "./store", "./events", "./util", "./common"], function (require, exports, data_1, physics_1, store_1, events_1, util, t) {
    "use strict";
    data_1 = __importDefault(data_1);
    physics_1 = __importDefault(physics_1);
    store_1 = __importDefault(store_1);
    util = __importStar(util);
    t = __importStar(t);
    var Ship = /** @class */ (function () {
        function Ship(init) {
            var _this = this;
            init = init || { 'type': 'shuttle' };
            if (!data_1.default.shipclass.hasOwnProperty(init.type)) {
                throw new Error("Ship type not recognized: " + init.type);
            }
            this.type = init.type;
            this.addons = init.addons || [];
            this.damage = init.damage || { hull: 0, armor: 0 };
            this.fuel = init.fuel || this.tank;
            this.cargo = new store_1.default(init.cargo);
            /*
             * When the player arrives at dock, increase demand for any resources
             * related to ship's maintenance (fuel, metal) that are not currently
             * available.
             */
            events_1.Events.watch(events_1.Ev.Arrived, function (ev) {
                // metal to repair damage to the ship
                if (_this.hasDamage()) {
                    var want = _this.damage.armor + _this.damage.hull;
                    window.game.here.requestResource('metal', want);
                }
                // fuel for the tank
                if (_this.needsFuel()) {
                    var want = _this.refuelUnits();
                    window.game.here.requestResource('fuel', want);
                }
            });
        }
        Object.defineProperty(Ship.prototype, "shipclass", {
            get: function () { return data_1.default.shipclass[this.type]; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Ship.prototype, "drive", {
            get: function () { return data_1.default.drives[this.shipclass.drive]; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Ship.prototype, "hardpoints", {
            get: function () { return this.shipclass.hardpoints; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Ship.prototype, "drives", {
            get: function () { return this.shipclass.drives; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Ship.prototype, "driveMass", {
            get: function () { return this.drives * this.drive.mass; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Ship.prototype, "mass", {
            get: function () { return this.shipclass.mass + this.driveMass; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Ship.prototype, "restricted", {
            get: function () { return this.shipclass.restricted; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Ship.prototype, "faction", {
            get: function () { return this.shipclass.faction; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Ship.prototype, "thrust", {
            get: function () { return this.drives * this.drive.thrust + Math.max(0, this.attr('thrust', true)); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Ship.prototype, "acceleration", {
            get: function () { return physics_1.default.deltav(this.thrust, this.mass); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Ship.prototype, "tank", {
            get: function () { return Math.max(0, this.attr('tank', true)); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Ship.prototype, "fullHull", {
            get: function () { return Math.max(0, this.attr('hull', true)); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Ship.prototype, "fullArmor", {
            get: function () { return Math.max(0, this.attr('armor', true)); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Ship.prototype, "hull", {
            get: function () { return Math.max(0, this.attr('hull')); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Ship.prototype, "armor", {
            get: function () { return Math.max(0, this.attr('armor')); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Ship.prototype, "stealth", {
            get: function () { return Math.min(0.5, this.attr('stealth')); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Ship.prototype, "cargoSpace", {
            get: function () { return Math.max(0, this.attr('cargo')); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Ship.prototype, "intercept", {
            get: function () { return Math.min(0.35, this.attr('intercept')); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Ship.prototype, "powerMassRatio", {
            get: function () { return this.thrust / this.mass; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Ship.prototype, "fuelrate", {
            get: function () {
                var base = this.drives * this.drive.burn_rate;
                var linear = this.attr('burn_rate', true);
                var pct = 1 - this.attr('burn_rate_pct', true);
                var rate = (base + linear) * pct;
                return Math.max(0.001, rate);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Ship.prototype, "rawDodge", {
            /*
             * Base dodge chance based on power-mass ratio
             */
            get: function () {
                var ratio = this.powerMassRatio;
                return ratio / 100;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Ship.prototype, "dodge", {
            /*
             * Dodge chance accounting for upgrades
             */
            get: function () {
                return Math.min(0.7, this.rawDodge + this.attr('dodge'));
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Ship.prototype, "cargoUsed", {
            /*
             * Calculated properties of the ship itself
             */
            get: function () { return this.cargo.sum(); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Ship.prototype, "cargoLeft", {
            get: function () { return this.cargoSpace - this.cargoUsed; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Ship.prototype, "holdIsFull", {
            get: function () { return this.cargoLeft === 0; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Ship.prototype, "holdIsEmpty", {
            get: function () { return this.cargoUsed === 0; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Ship.prototype, "hasContraband", {
            get: function () {
                var e_1, _a;
                try {
                    for (var _b = __values(t.resources), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var item = _c.value;
                        var amt = this.cargo.get(item);
                        if (amt == 0)
                            continue;
                        if (amt > 0 && data_1.default.resources[item].contraband) {
                            return true;
                        }
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
                return false;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Ship.prototype, "isDestroyed", {
            get: function () {
                return this.armor === 0
                    && this.hull === 0;
            },
            enumerable: true,
            configurable: true
        });
        /*
         * Methods
         */
        Ship.prototype.attr = function (name, nominal) {
            if (nominal === void 0) { nominal = false; }
            var e_2, _a;
            var value = 0;
            if (typeof this.shipclass[name] === 'number') {
                value += this.shipclass[name];
            }
            try {
                for (var _b = __values(this.addons), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var addon = _c.value;
                    if (typeof data_1.default.addons[addon][name] === 'number') {
                        value += data_1.default.addons[addon][name];
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
            if (!nominal) {
                if (name == 'hull' || name == 'armor') {
                    value -= this.damage[name];
                }
            }
            return value;
        };
        Ship.prototype.thrustRatio = function (deltav, mass) {
            if (mass === undefined)
                mass = this.currentMass();
            // Calculate thrust required to accelerate our mass at deltav
            var thrust = physics_1.default.force(mass, deltav);
            // Calculate fraction of full thrust required
            return thrust / this.thrust;
        };
        Ship.prototype.burnRate = function (deltav, mass) {
            // Calculate fraction of full thrust required
            var thrustRatio = this.thrustRatio(deltav, mass);
            // Reduce burn rate by the fraction of thrust being used
            return Math.max(0.001, this.fuelrate * thrustRatio);
        };
        Ship.prototype.maxBurnTime = function (accel, nominal, extra_mass) {
            if (nominal === void 0) { nominal = false; }
            if (extra_mass === void 0) { extra_mass = 0; }
            var mass, fuel;
            if (nominal) {
                fuel = this.tank;
                mass = this.nominalMass(true) + extra_mass;
                if (accel === undefined)
                    accel = physics_1.default.deltav(this.thrust, mass);
            }
            else {
                fuel = this.fuel;
                mass = this.currentMass() + extra_mass;
                if (accel === undefined)
                    accel = this.currentAcceleration(extra_mass);
            }
            return Math.floor(fuel / this.burnRate(accel, mass));
        };
        Ship.prototype.cargoMass = function () {
            var e_3, _a;
            var mass = 0;
            try {
                for (var _b = __values(this.cargo.keys()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var item = _c.value;
                    mass += data_1.default.resources[item].mass * this.cargo.get(item);
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_3) throw e_3.error; }
            }
            return mass;
        };
        Ship.prototype.addOnMass = function () {
            return this.addons.reduce(function (a, b) { return a + data_1.default.addons[b].mass; }, 0);
        };
        Ship.prototype.nominalMass = function (full_tank) {
            if (full_tank === void 0) { full_tank = false; }
            var m = this.mass;
            if (full_tank)
                m += this.tank;
            return m;
        };
        Ship.prototype.currentMass = function () {
            return this.mass + this.cargoMass() + this.addOnMass() + this.fuel;
        };
        Ship.prototype.currentAcceleration = function (extra_mass) {
            if (extra_mass === void 0) { extra_mass = 0; }
            return physics_1.default.deltav(this.thrust, this.currentMass() + extra_mass);
        };
        Ship.prototype.accelerationWithMass = function (mass) {
            return physics_1.default.deltav(this.thrust, this.currentMass() + mass);
        };
        Ship.prototype.refuelUnits = function () { return Math.ceil(this.tank - this.fuel); };
        Ship.prototype.needsFuel = function () { return this.fuel < this.tank; };
        Ship.prototype.tankIsFull = function () { return Math.floor(this.fuel) >= this.tank; };
        Ship.prototype.tankIsEmpty = function () { return util.R(this.fuel) === 0; };
        Ship.prototype.refuel = function (units) {
            this.fuel = Math.min(this.tank, this.fuel + units);
        };
        Ship.prototype.burn = function (deltav) {
            this.fuel = Math.max(0, this.fuel - this.burnRate(deltav, this.currentMass()));
            return this.fuel;
        };
        Ship.prototype.loadCargo = function (resource, amount) {
            if (this.cargoLeft < amount)
                throw new Error('no room left in the hold');
            this.cargo.inc(resource, amount);
        };
        Ship.prototype.unloadCargo = function (resource, amount) {
            if (this.cargo.get(resource) < amount)
                throw new Error('you do not have that many units available');
            this.cargo.dec(resource, amount);
        };
        Ship.prototype.shipValue = function (market) {
            var sc = this.shipclass;
            var metal = market.sellPrice('metal');
            var ceramics = market.sellPrice('ceramics');
            var price = (sc.hull / sc.mass * metal * 5000)
                + (sc.armor * 5 * ceramics)
                + (sc.tank * 1000)
                + (sc.cargo * 2000)
                + (sc.drives * data_1.default.drives[sc.drive].value)
                + (sc.hardpoints * 20000);
            if (sc.restricted) {
                price *= 1.5;
            }
            return Math.ceil(price);
        };
        Ship.prototype.cargoValue = function (market) {
            var e_4, _a;
            var price = 0;
            try {
                for (var _b = __values(this.cargo.keys()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var item = _c.value;
                    price += this.cargo.count(item) * market.sellPrice(item);
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_4) throw e_4.error; }
            }
            return price;
        };
        Ship.prototype.fuelValue = function (market) {
            return market.sellPrice('fuel') * Math.floor(this.fuel);
        };
        Ship.prototype.addOnValue = function () {
            var e_5, _a;
            var price = 0;
            try {
                for (var _b = __values(this.addons), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var addon = _c.value;
                    price += data_1.default.addons[addon].price;
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_5) throw e_5.error; }
            }
            return price;
        };
        Ship.prototype.damageValue = function () {
            var price = 0;
            if (this.hasDamage()) {
                price -= this.damage.hull * data_1.default.ship.hull.repair;
                price -= this.damage.armor * data_1.default.ship.armor.repair;
            }
            return price;
        };
        Ship.prototype.price = function (tradein, market) {
            var cargo = this.cargoValue(market);
            var fuel = this.fuelValue(market);
            var dmg = this.damageValue();
            var ship = this.shipValue(market) + this.addOnValue();
            if (tradein)
                ship = Math.ceil(ship * 0.7);
            return ship + cargo + fuel + dmg;
        };
        Ship.prototype.numAddOns = function () {
            return this.addons.length;
        };
        Ship.prototype.availableHardPoints = function () {
            return this.hardpoints - this.numAddOns();
        };
        Ship.prototype.installAddOn = function (addon) {
            this.addons.push(addon);
        };
        Ship.prototype.hasAddOn = function (addon) {
            var e_6, _a;
            var count = 0;
            try {
                for (var _b = __values(this.addons), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var a = _c.value;
                    if (a === addon) {
                        ++count;
                    }
                }
            }
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_6) throw e_6.error; }
            }
            return count;
        };
        Ship.prototype.removeAddOn = function (addon) {
            this.addons = this.addons.filter(function (x) { return x !== addon; });
        };
        Ship.prototype.damageMalus = function () {
            return this.damage.hull / this.hull / 2;
        };
        Ship.prototype.hasDamage = function () {
            return this.damage.hull > 0
                || this.damage.armor > 0;
        };
        Ship.prototype.repairDamage = function (hull, armor) {
            if (hull === void 0) { hull = 0; }
            if (armor === void 0) { armor = 0; }
            this.damage.hull = Math.max(this.damage.hull - hull, 0);
            this.damage.armor = Math.max(this.damage.armor - armor, 0);
        };
        Ship.prototype.applyDamage = function (dmg) {
            var armor = this.armor;
            var hull = this.hull;
            var armor_dmg = Math.min(this.armor, dmg);
            this.damage.armor += armor_dmg;
            dmg -= armor_dmg;
            var hull_dmg = Math.min(this.hull, dmg);
            this.damage.hull += hull_dmg;
            dmg -= hull_dmg;
            // Return true if the ship is destroyed
            return this.isDestroyed;
        };
        return Ship;
    }());
    return Ship;
});
