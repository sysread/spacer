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
define(["require", "exports", "./data", "./system", "./ship", "./physics", "./common", "./model", "./resource"], function (require, exports, data_1, system_1, ship_1, physics_1, t, model, resource_1) {
    "use strict";
    data_1 = __importDefault(data_1);
    system_1 = __importDefault(system_1);
    ship_1 = __importDefault(ship_1);
    physics_1 = __importDefault(physics_1);
    t = __importStar(t);
    model = __importStar(model);
    ;
    var Person = /** @class */ (function () {
        function Person(init) {
            if (init == undefined) {
                this.name = 'Marco Solo';
                this.ship = new ship_1.default({ type: data_1.default.initial_ship });
                this.faction = new model.Faction('MC');
                this.home = 'mars';
                this.money = data_1.default.initial_money;
            }
            else {
                this.name = init.name;
                this.ship = new ship_1.default(init.ship);
                this.faction = new model.Faction(init.faction);
                this.home = init.home;
                this.money = Math.floor(init.money);
            }
            this.standing = {};
            for (var _i = 0, _a = Object.keys(data_1.default.factions); _i < _a.length; _i++) {
                var faction = _a[_i];
                if (init == undefined || init.standing == undefined || init.standing[faction] == undefined) {
                    this.standing[faction] = data_1.default.factions[this.faction.abbrev].standing[faction];
                }
                else {
                    this.standing[faction] = init.standing[faction];
                }
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
            var res = resource_1.resources[item];
            if (resource_1.isCraft(res)) {
                var max = void 0;
                for (var _i = 0, _a = Object.keys(res.recipe.materials); _i < _a.length; _i++) {
                    var mat = _a[_i];
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
            if (faction instanceof model.Faction) {
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
            var _a = this.standingRange(label), min = _a[0], max = _a[1];
            return this.getStanding(faction) >= min;
        };
        Person.prototype.hasStandingOrLower = function (faction, label) {
            var _a = this.standingRange(label), min = _a[0], max = _a[1];
            return this.getStanding(faction) <= max;
        };
        Person.prototype.standingRange = function (standing) {
            return t.Standing[standing];
        };
        Person.prototype.getStandingLabel = function (faction) {
            var value = this.getStanding(faction);
            for (var _i = 0, _a = t.standings; _i < _a.length; _i++) {
                var standing = _a[_i];
                var _b = t.Standing[standing], min = _b[0], max = _b[1];
                if (value >= min && value <= max) {
                    return standing;
                }
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
    return Person;
});
