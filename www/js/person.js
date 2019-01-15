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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
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
define(["require", "exports", "./data", "./system", "./ship", "./physics", "./common", "./faction", "./resource"], function (require, exports, data_1, system_1, ship_1, physics_1, t, faction_1, resource_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    data_1 = __importDefault(data_1);
    system_1 = __importDefault(system_1);
    ship_1 = __importDefault(ship_1);
    physics_1 = __importDefault(physics_1);
    t = __importStar(t);
    ;
    var Person = /** @class */ (function () {
        function Person(init) {
            var e_1, _a;
            if (init == undefined) {
                this.name = 'Marco Solo';
                this.ship = new ship_1.default({ type: data_1.default.initial_ship });
                this.faction = new faction_1.Faction('MC');
                this.home = 'mars';
                this.money = data_1.default.initial_money;
            }
            else {
                this.name = init.name;
                this.ship = new ship_1.default(init.ship);
                this.faction = new faction_1.Faction(init.faction);
                this.home = init.home;
                this.money = Math.floor(init.money);
            }
            this.standing = {};
            try {
                for (var _b = __values(Object.keys(data_1.default.factions)), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var faction = _c.value;
                    if (init == undefined || init.standing == undefined || init.standing[faction] == undefined) {
                        this.standing[faction] = data_1.default.factions[this.faction.abbrev].standing[faction];
                    }
                    else {
                        this.standing[faction] = init.standing[faction];
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
            this.homeGravity = system_1.default.gravity(this.home);
        }
        Object.defineProperty(Person.prototype, "localStanding", {
            get: function () {
                return this.getStanding(window.game.here.faction);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Person.prototype, "localStandingLabel", {
            get: function () {
                return this.getStandingLabel(window.game.here.faction);
            },
            enumerable: true,
            configurable: true
        });
        // Returns the number of item that the player has the resources to craft
        Person.prototype.canCraft = function (item) {
            var e_2, _a;
            var res = resource_1.resources[item];
            if (resource_1.isCraft(res)) {
                var max = void 0;
                try {
                    for (var _b = __values(Object.keys(res.recipe.materials)), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var mat = _c.value;
                        var have = this.ship.cargo.count(mat);
                        var need = res.recipe.materials[mat] || 0;
                        if (have < need) {
                            return 0;
                        }
                        var count = Math.floor(have / need);
                        if (max == undefined || max > count) {
                            max = count;
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
                return max || 0;
            }
            return 0;
        };
        Person.prototype.maxAcceleration = function () {
            return physics_1.default.G * this.homeGravity * data_1.default.grav_deltav_factor;
        };
        Person.prototype.shipAcceleration = function () {
            return this.ship.currentAcceleration();
        };
        Person.prototype.bestAcceleration = function () {
            return Math.min(this.maxAcceleration(), this.shipAcceleration());
        };
        Person.prototype.credit = function (n) {
            this.money += n;
        };
        Person.prototype.debit = function (n) {
            this.money -= n;
        };
        Person.prototype.getStanding = function (faction) {
            faction = faction || this.faction;
            if (faction instanceof faction_1.Faction) {
                faction = faction.abbrev;
            }
            if (this.standing[faction] == undefined) {
                if (faction === this.faction.abbrev) {
                    this.standing[faction] = data_1.default.factions[this.faction.abbrev].standing[faction];
                }
            }
            return Math.floor(this.standing[faction] || 0);
        };
        Person.prototype.hasStanding = function (faction, label) {
            var _a = __read(this.standingRange(label), 2), min = _a[0], max = _a[1];
            return this.getStanding(faction) >= min;
        };
        Person.prototype.hasStandingOrLower = function (faction, label) {
            var _a = __read(this.standingRange(label), 2), min = _a[0], max = _a[1];
            return this.getStanding(faction) <= max;
        };
        Person.prototype.standingRange = function (standing) {
            return t.Standing[standing];
        };
        Person.prototype.getStandingLabel = function (faction) {
            var e_3, _a;
            var value = this.getStanding(faction);
            try {
                for (var _b = __values(t.standings), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var standing = _c.value;
                    var _d = __read(t.Standing[standing], 2), min = _d[0], max = _d[1];
                    if (value >= min && value <= max) {
                        return standing;
                    }
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_3) throw e_3.error; }
            }
        };
        Person.prototype.incStanding = function (faction, amt) {
            this.standing[faction] = Math.min(data_1.default.max_abs_standing, this.getStanding(faction) + amt);
        };
        Person.prototype.decStanding = function (faction, amt) {
            this.standing[faction] = Math.max(-data_1.default.max_abs_standing, this.getStanding(faction) - amt);
        };
        Person.prototype.setStanding = function (faction, amt) {
            this.standing[faction] = Math.min(data_1.default.max_abs_standing, Math.max(-data_1.default.max_abs_standing, amt));
        };
        Person.prototype.getStandingPriceAdjustment = function (faction) {
            return this.getStanding(faction) / 1000;
        };
        return Person;
    }());
    exports.Person = Person;
});
