var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
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
define(["require", "exports", "./game", "./data", "./store", "./util"], function (require, exports, game_1, data_1, store_1, util) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    game_1 = __importDefault(game_1);
    data_1 = __importDefault(data_1);
    store_1 = __importDefault(store_1);
    util = __importStar(util);
    var Action = /** @class */ (function () {
        function Action() {
        }
        Object.defineProperty(Action.prototype, "isReady", {
            get: function () { return true; },
            enumerable: true,
            configurable: true
        });
        Action.prototype.nextRound = function () { };
        ;
        return Action;
    }());
    var Attack = /** @class */ (function (_super) {
        __extends(Attack, _super);
        function Attack(opt) {
            var _this = _super.call(this) || this;
            _this.opt = opt;
            _this.count = 1;
            _this._round = 0;
            _this._reload = 0;
            if (_this.isReloadable) {
                _this._magazine = _this.magazine;
            }
            return _this;
        }
        Object.defineProperty(Attack.prototype, "name", {
            get: function () { return this.opt.name; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Attack.prototype, "rate", {
            get: function () { if (this.opt.rate)
                return this.count * this.opt.rate; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Attack.prototype, "magazine", {
            get: function () { if (this.opt.magazine)
                return this.count * this.opt.magazine; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Attack.prototype, "accuracy", {
            get: function () { return this.opt.accuracy; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Attack.prototype, "reload", {
            get: function () { return this.opt.reload; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Attack.prototype, "damage", {
            get: function () { return this.opt.damage; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Attack.prototype, "interceptable", {
            get: function () { return this.opt.interceptable ? true : false; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Attack.prototype, "isReloadable", {
            get: function () {
                return this.reload !== undefined;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Attack.prototype, "isReloading", {
            get: function () {
                return this.isReloadable && this._magazine === 0;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Attack.prototype, "isReady", {
            get: function () {
                if (!this.isReloadable || this._magazine == undefined)
                    return true;
                return this._magazine > 0;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Attack.prototype, "roundsUntilReload", {
            get: function () {
                if (!this.isReloadable)
                    return 0;
                return this._reload;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Attack.prototype, "magazineRemaining", {
            get: function () {
                return this._magazine;
            },
            enumerable: true,
            configurable: true
        });
        Attack.prototype.addUnit = function () {
            if (this._magazine != undefined && this.magazine)
                this._magazine += this.magazine;
            ++this.count;
        };
        Attack.prototype.nextRound = function () {
            ++this._round;
            if (this.isReloadable) {
                if (this._magazine === 0 && this._reload === 1) {
                    this._reload = 0;
                    this._magazine = this.magazine;
                }
            }
        };
        Attack.prototype.use = function (from, to) {
            if (!this.isReady) {
                throw new Error('action.use: action is not ready');
            }
            var damage = 0;
            var hits = 0;
            var rate = this.rate || 1;
            var acc = this.accuracy || 1;
            var dmg = this.damage || 0;
            for (var i = 0; i < rate; ++i) {
                if (util.chance(acc)) { // TODO: modified by skill?
                    damage += Math.max(0.1, util.getRandomNum(0, dmg));
                    ++hits;
                }
                if (this.isReloadable && this._magazine != undefined) {
                    --this._magazine;
                    if (this._magazine === 0) {
                        this._reload = this.reload;
                        break;
                    }
                }
            }
            var effect = !hits ? 'miss'
                : this.interceptable && to.tryIntercept() ? 'intercepted'
                    : to.tryDodge() ? 'dodged'
                        : to.ship.applyDamage(damage) ? 'destroyed'
                            : 'hit';
            var pct = effect === 'hit'
                ? damage / (to.fullHull + to.fullArmor) * 100
                : 0;
            return {
                type: this.name,
                source: from.name,
                hits: hits,
                damage: util.R(damage, 2),
                effect: effect,
                pct: pct,
            };
        };
        return Attack;
    }(Action));
    exports.Attack = Attack;
    var Flight = /** @class */ (function (_super) {
        __extends(Flight, _super);
        function Flight() {
            var _this = _super.call(this) || this;
            _this.name = 'Flee';
            return _this;
        }
        Flight.prototype.use = function (from, to) {
            var effect = from.tryFlight(to);
            return {
                type: this.name,
                source: from.name,
                effect: effect ? 'flee' : 'chase',
            };
        };
        return Flight;
    }(Action));
    exports.Flight = Flight;
    var Surrender = /** @class */ (function (_super) {
        __extends(Surrender, _super);
        function Surrender() {
            var _this = _super.call(this) || this;
            _this.name = 'Surrender';
            return _this;
        }
        Surrender.prototype.use = function (from, to) {
            return {
                type: this.name,
                source: from.name,
                effect: 'surrender',
            };
        };
        return Surrender;
    }(Action));
    exports.Surrender = Surrender;
    var Pass = /** @class */ (function (_super) {
        __extends(Pass, _super);
        function Pass() {
            var _this = _super.call(this) || this;
            _this.name = 'Pass';
            return _this;
        }
        Pass.prototype.use = function (from, to) {
            return {
                type: this.name,
                source: from.name,
                effect: 'pass',
            };
        };
        return Pass;
    }(Action));
    exports.Pass = Pass;
    var Combatant = /** @class */ (function () {
        function Combatant(combatant) {
            var e_1, _a;
            this.combatant = combatant;
            this.flight = new Flight;
            this.surrender = new Surrender;
            this.pass = new Pass;
            this._actions = {};
            try {
                for (var _b = __values(this.ship.addons), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var addon = _c.value;
                    var info = data_1.default.addons[addon];
                    if (info.damage) {
                        if (this._actions[addon]) {
                            this._actions[addon].addUnit();
                        }
                        else {
                            this._actions[addon] = new Attack(info);
                        }
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
        }
        Object.defineProperty(Combatant.prototype, "name", {
            get: function () { return this.combatant.name; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Combatant.prototype, "faction", {
            get: function () { return this.combatant.faction; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Combatant.prototype, "ship", {
            get: function () { return this.combatant.ship; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Combatant.prototype, "hull", {
            get: function () { return this.ship.hull; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Combatant.prototype, "armor", {
            get: function () { return this.ship.armor; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Combatant.prototype, "fullHull", {
            get: function () { return this.ship.fullHull; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Combatant.prototype, "fullArmor", {
            get: function () { return this.ship.fullArmor; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Combatant.prototype, "pctHull", {
            get: function () { return this.ship.hull / this.ship.fullHull; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Combatant.prototype, "pctArmor", {
            get: function () { return this.ship.armor / this.ship.fullArmor; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Combatant.prototype, "rawDodge", {
            get: function () { return this.ship.rawDodge; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Combatant.prototype, "isDestroyed", {
            get: function () { return this.ship.isDestroyed; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Combatant.prototype, "ready", {
            get: function () { return this.actions.filter(function (a) { return a.isReady; }); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Combatant.prototype, "attacks", {
            get: function () { return Object.values(this._actions).filter(function (a) { return a.isReady; }); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Combatant.prototype, "intercept", {
            get: function () { return Math.max(0, this.ship.intercept - this.ship.damageMalus()); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Combatant.prototype, "dodge", {
            get: function () {
                return Math.max(0, this.ship.dodge - this.ship.damageMalus());
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Combatant.prototype, "actions", {
            get: function () {
                return __spread(Object.values(this._actions), [this.flight, this.surrender, this.pass]);
            },
            enumerable: true,
            configurable: true
        });
        ;
        Object.defineProperty(Combatant.prototype, "flightRisk", {
            /*
             * The chance of flight is inversely proportional to the percentage of
             * armor and hull remaining.
             */
            get: function () {
                return (1 - this.pctHull) / 2;
            },
            enumerable: true,
            configurable: true
        });
        Combatant.prototype.nextRound = function () {
            var e_2, _a;
            try {
                for (var _b = __values(this.actions), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var action = _c.value;
                    action.nextRound();
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
        };
        Combatant.prototype.tryIntercept = function () { return util.chance(this.intercept); };
        Combatant.prototype.tryDodge = function () { return util.chance(this.dodge); };
        /*
         * Compares this combatant's dodge, which takes into account power/mass
         * ratio and defensive gear which enhances dodge, like ecm, against the raw
         * dodge abilit of an opponent (which does not include gear, since ecm
         * would not help the chaser).
         *
         * TODO adjust based on pilots' skill levels
         */
        Combatant.prototype.tryFlight = function (opponent) {
            var chance = this.dodge / opponent.rawDodge / 5;
            return util.chance(chance);
        };
        return Combatant;
    }());
    exports.Combatant = Combatant;
    var Combat = /** @class */ (function () {
        function Combat(opt) {
            this.round = 1;
            this.log = [];
            this.player = new Combatant(game_1.default.player);
            this.opponent = new Combatant(opt.opponent);
            this.initiative = util.oneOf(['player', 'opponent']);
            this.round = 1;
            this.log = [];
            this.escaped = false;
            this.surrendered = false;
        }
        Object.defineProperty(Combat.prototype, "isOver", {
            get: function () {
                return this.escaped
                    || this.surrendered
                    || this.player.isDestroyed
                    || this.opponent.isDestroyed;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Combat.prototype, "playerSurrendered", {
            get: function () {
                return this.surrendered === this.player.name;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Combat.prototype, "opponentSurrendered", {
            get: function () {
                return this.surrendered === this.opponent.name;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Combat.prototype, "salvage", {
            get: function () {
                var e_3, _a;
                if (this.opponent.isDestroyed || this.opponentSurrendered) {
                    if (!this._salvage) {
                        this._salvage = new store_1.default;
                        try {
                            for (var _b = __values(this.opponent.ship.cargo.keys()), _c = _b.next(); !_c.done; _c = _b.next()) {
                                var item = _c.value;
                                var amount = this.opponent.ship.cargo.count(item);
                                // Randomize the remaining cargo amounts that survived the encounter
                                if (!this.surrendered) {
                                    amount = util.getRandomInt(0, this.opponent.ship.cargo.count(item));
                                }
                                this._salvage.inc(item, amount);
                            }
                        }
                        catch (e_3_1) { e_3 = { error: e_3_1 }; }
                        finally {
                            try {
                                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                            }
                            finally { if (e_3) throw e_3.error; }
                        }
                    }
                    return this._salvage;
                }
                return;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Combat.prototype, "currentRound", {
            get: function () {
                return Math.ceil(this.round / 2);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Combat.prototype, "isPlayerTurn", {
            get: function () {
                if (this.initiative === 'player') {
                    return (this.round + 2) % 2 !== 0;
                }
                else {
                    return (this.round + 2) % 2 === 0;
                }
            },
            enumerable: true,
            configurable: true
        });
        Combat.prototype.addLogEntry = function (entry) {
            var round = this.currentRound;
            if (this.log.length === 0 || this.log[0].round !== round) {
                this.log.unshift({
                    round: round,
                    player: undefined,
                    opponent: undefined,
                });
            }
            this.log[0][this.isPlayerTurn ? 'player' : 'opponent'] = entry;
        };
        Combat.prototype.start = function () {
            if (!this.isPlayerTurn) {
                this.opponentAction();
            }
        };
        Combat.prototype.playerAction = function (action) {
            if (!this.isPlayerTurn)
                throw new Error("It is not the player's turn");
            this.player.nextRound();
            this.doAction(action, this.player, this.opponent);
        };
        Combat.prototype.opponentAction = function () {
            if (this.isPlayerTurn)
                throw new Error("It is not the opponents's turn");
            this.opponent.nextRound();
            var risk = this.opponent.flightRisk;
            var chance = util.chance(risk);
            var action;
            if (chance) {
                if (this.opponent.pctHull < 25) {
                    action = this.opponent.surrender;
                }
                else {
                    action = this.opponent.flight;
                }
            }
            else {
                action = util.oneOf(this.opponent.attacks);
            }
            this.doAction(action, this.opponent, this.player);
        };
        Combat.prototype.doAction = function (action, from, to) {
            var result = action.use(from, to);
            if (result.effect === 'flee') {
                this.escaped = from.name;
            }
            else if (result.effect === 'surrender') {
                this.surrendered = from.name;
            }
            this.addLogEntry(result);
            ++this.round;
        };
        return Combat;
    }());
    exports.Combat = Combat;
});
