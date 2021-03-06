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
define(["require", "exports", "./data", "./system", "./ship", "./physics", "./common", "./fastmath", "./faction", "./resource", "./mission", "./events"], function (require, exports, data_1, system_1, ship_1, physics_1, t, FastMath, faction_1, resource_1, mission_1, events_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    data_1 = __importDefault(data_1);
    system_1 = __importDefault(system_1);
    ship_1 = __importDefault(ship_1);
    physics_1 = __importDefault(physics_1);
    t = __importStar(t);
    FastMath = __importStar(FastMath);
    ;
    class Person {
        constructor(init) {
            this.contracts = [];
            if (init == undefined) {
                this.name = 'Marco Solo';
                this.ship = new ship_1.default({ type: data_1.default.initial_ship });
                this.home = 'mars';
                this.money = data_1.default.initial_money;
                this.faction_name = 'MC';
            }
            else {
                this.name = init.name;
                this.ship = new ship_1.default(init.ship);
                this.home = init.home;
                this.money = FastMath.floor(init.money);
                this.faction_name = init.faction_name;
                if (init.contracts) {
                    for (const c of init.contracts) {
                        events_1.watch("gameLoaded", (ev) => {
                            const contract = mission_1.restoreMission(c, window.game.locus);
                            contract.accept();
                            return { complete: true };
                        });
                    }
                }
            }
            this.standing = {};
            for (const faction of Object.keys(data_1.default.factions)) {
                if (init == undefined || init.standing == undefined || init.standing[faction] == undefined) {
                    this.standing[faction] = data_1.default.factions[this.faction.abbrev].standing[faction];
                }
                else {
                    this.standing[faction] = init.standing[faction];
                }
            }
            this.homeGravity = system_1.default.gravity(this.home);
        }
        get faction() {
            return faction_1.factions[this.faction_name];
        }
        get localStanding() {
            return this.getStanding(window.game.here.faction);
        }
        get localStandingLabel() {
            return this.getStandingLabel(window.game.here.faction);
        }
        // Returns the number of item that the player has the resources to craft
        canCraft(item) {
            const res = resource_1.resources[item];
            if (resource_1.isCraft(res)) {
                let max;
                for (const mat of Object.keys(res.recipe.materials)) {
                    const have = this.ship.cargo.count(mat);
                    const need = res.recipe.materials[mat] || 0;
                    if (have < need) {
                        return 0;
                    }
                    const count = FastMath.floor(have / need);
                    if (max == undefined || max > count) {
                        max = count;
                    }
                }
                return max || 0;
            }
            return 0;
        }
        maxAcceleration() {
            return physics_1.default.G * this.homeGravity * data_1.default.grav_deltav_factor;
        }
        shipAcceleration() {
            return this.ship.currentAcceleration();
        }
        bestAcceleration() {
            return Math.min(this.maxAcceleration(), this.shipAcceleration());
        }
        credit(n) {
            this.money += n;
        }
        debit(n) {
            this.money = Math.max(0, this.money - n);
        }
        getStanding(faction) {
            faction = faction || this.faction;
            if (faction instanceof faction_1.Faction) {
                faction = faction.abbrev;
            }
            if (this.standing[faction] == undefined) {
                if (faction === this.faction.abbrev) {
                    this.standing[faction] = data_1.default.factions[this.faction.abbrev].standing[faction];
                }
            }
            return FastMath.floor(this.standing[faction] || 0);
        }
        hasStanding(faction, label) {
            const [min, max] = this.standingRange(label);
            return this.getStanding(faction) >= min;
        }
        hasStandingOrLower(faction, label) {
            const [min, max] = this.standingRange(label);
            return this.getStanding(faction) <= max;
        }
        standingRange(standing) {
            return t.Standing[standing];
        }
        getStandingLabel(faction) {
            const value = this.getStanding(faction);
            for (const standing of t.standings) {
                const [min, max] = t.Standing[standing];
                if (value >= min && value <= max) {
                    return standing;
                }
            }
        }
        incStanding(faction, amt) {
            this.standing[faction] = Math.min(data_1.default.max_abs_standing, this.getStanding(faction) + amt);
        }
        decStanding(faction, amt) {
            this.standing[faction] = Math.max(-data_1.default.max_abs_standing, this.getStanding(faction) - amt);
        }
        setStanding(faction, amt) {
            this.standing[faction] = Math.min(data_1.default.max_abs_standing, Math.max(-data_1.default.max_abs_standing, amt));
        }
        getStandingPriceAdjustment(faction) {
            return this.getStanding(faction) / 1000;
        }
        acceptMission(mission) {
            this.contracts.push(mission);
        }
        completeMission(mission) {
            this.contracts = this.contracts.filter(c => c.title != mission.title);
        }
    }
    exports.Person = Person;
});
