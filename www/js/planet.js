var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
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
define(["require", "exports", "./data", "./system", "./physics", "./store", "./history", "./resource", "./trait", "./faction", "./condition", "./mission", "./common", "./util"], function (require, exports, data_1, system_1, physics_1, store_1, history_1, resource_1, trait_1, faction_1, condition_1, mission_1, t, util) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    data_1 = __importDefault(data_1);
    system_1 = __importDefault(system_1);
    physics_1 = __importDefault(physics_1);
    store_1 = __importDefault(store_1);
    history_1 = __importDefault(history_1);
    t = __importStar(t);
    util = __importStar(util);
    function isImportTask(task) {
        return task.type == 'import';
    }
    exports.isImportTask = isImportTask;
    function isCraftTask(task) {
        return task.type == 'craft';
        ;
    }
    exports.isCraftTask = isCraftTask;
    var Planet = /** @class */ (function () {
        function Planet(body, init) {
            var e_1, _a, e_2, _b, e_3, _c, e_4, _d, e_5, _e;
            var _this = this;
            init = init || {};
            /*
             * Physical and faction
             */
            this.body = body;
            this.name = data_1.default.bodies[this.body].name;
            this.size = data_1.default.bodies[this.body].size;
            this.kind = system_1.default.kind(this.body);
            this.central = system_1.default.central(this.body);
            this.gravity = system_1.default.gravity(this.body);
            this.faction = new faction_1.Faction(data_1.default.bodies[body].faction);
            this.traits = data_1.default.bodies[body].traits.map(function (t) { return new trait_1.Trait(t); });
            /*
             * Temporary conditions
             */
            if (init.conditions) {
                this.conditions = init.conditions.map(function (c) { return new condition_1.Condition(c.name, c); });
            }
            else {
                this.conditions = [];
            }
            /*
             * Fabrication
             */
            this.max_fab_units = Math.ceil(this.scale(data_1.default.fabricators));
            this.max_fab_health = this.max_fab_units * data_1.default.fab_health;
            this.fab_health = this.max_fab_units * data_1.default.fab_health;
            /*
             * Work
             */
            this.work_tasks = [];
            try {
                TASK: for (var _f = __values(data_1.default.work), _g = _f.next(); !_g.done; _g = _f.next()) {
                    var task = _g.value;
                    try {
                        for (var _h = __values(task.avail), _j = _h.next(); !_j.done; _j = _h.next()) {
                            var req = _j.value;
                            try {
                                for (var _k = __values(this.traits), _l = _k.next(); !_l.done; _l = _k.next()) {
                                    var trait = _l.value;
                                    if (req === trait.name) {
                                        this.work_tasks.push(task.name);
                                        continue TASK;
                                    }
                                }
                            }
                            catch (e_3_1) { e_3 = { error: e_3_1 }; }
                            finally {
                                try {
                                    if (_l && !_l.done && (_c = _k.return)) _c.call(_k);
                                }
                                finally { if (e_3) throw e_3.error; }
                            }
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (_j && !_j.done && (_b = _h.return)) _b.call(_h);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_g && !_g.done && (_a = _f.return)) _a.call(_f);
                }
                finally { if (e_1) throw e_1.error; }
            }
            this.contracts = [];
            // TODO This is perhaps the worst piece of programming I have
            // ever done. I *really* hope you are not a potential employer
            // reading this hack.
            if (init.contracts) {
                window.addEventListener('arrived', function () {
                    var e_6, _a;
                    if (init && init.contracts) {
                        try {
                            for (var _b = __values(init.contracts), _c = _b.next(); !_c.done; _c = _b.next()) {
                                var info = _c.value;
                                _this.contracts.push({
                                    valid_until: info.valid_until,
                                    mission: mission_1.restoreMission(info.mission),
                                });
                            }
                        }
                        catch (e_6_1) { e_6 = { error: e_6_1 }; }
                        finally {
                            try {
                                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                            }
                            finally { if (e_6) throw e_6.error; }
                        }
                        delete init.contracts;
                    }
                });
            }
            // END shame
            /*
             * Economics
             */
            this.stock = new store_1.default(init.stock);
            this.supply = new history_1.default(data_1.default.market_history, init.supply);
            this.demand = new history_1.default(data_1.default.market_history, init.demand);
            this.need = new history_1.default(data_1.default.market_history, init.need);
            this.pending = new store_1.default(init.pending);
            this.queue = init.queue || [];
            this.min_stock = this.scale(data_1.default.min_stock_count);
            this.produces = new store_1.default;
            this.consumes = new store_1.default;
            try {
                for (var _m = __values(t.resources), _o = _m.next(); !_o.done; _o = _m.next()) {
                    var item = _o.value;
                    this.produces.inc(item, this.scale(data_1.default.market.produces[item]));
                    this.consumes.inc(item, this.scale(data_1.default.market.consumes[item]));
                    this.produces.inc(item, this.scale(this.faction.produces[item] || 0));
                    this.consumes.inc(item, this.scale(this.faction.consumes[item] || 0));
                    try {
                        for (var _p = __values(this.traits), _q = _p.next(); !_q.done; _q = _p.next()) {
                            var trait = _q.value;
                            this.produces.inc(item, this.scale(trait.produces[item]));
                            this.consumes.inc(item, this.scale(trait.consumes[item]));
                        }
                    }
                    catch (e_5_1) { e_5 = { error: e_5_1 }; }
                    finally {
                        try {
                            if (_q && !_q.done && (_e = _p.return)) _e.call(_p);
                        }
                        finally { if (e_5) throw e_5.error; }
                    }
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_o && !_o.done && (_d = _m.return)) _d.call(_m);
                }
                finally { if (e_4) throw e_4.error; }
            }
            // Assign directly in constructor rather than in a method call for
            // performance reasons. V8's jit will produce more optimized classes by
            // avoiding dynamic assignment in the constructor.
            this._price = {};
            this._cycle = {};
            this._need = {};
            this._exporter = {};
            window.addEventListener("turn", function () { return _this.turn(window.game.turns); });
        }
        Planet.prototype.turn = function (turn) {
            // Spread expensive daily procedures out over multiple turns; note the
            // fall-through in each case to default, which are actions called on every
            // turn.
            switch (turn % data_1.default.turns_per_day) {
                case 0:
                    this.manufacture();
                case 1:
                    this.imports();
                case 2:
                    // >= should catch the final turn of a new game being prepared so
                    // the new game starts with a selection of jobs generated
                    if (turn >= data_1.default.initial_days * data_1.default.turns_per_day) {
                        this.refreshContracts();
                    }
                    this.replenishFabricators();
                    this.luxuriate();
                    this.apply_conditions();
                    this.rollups(turn);
                default:
                    this.produce();
                    this.consume();
                    this.processQueue();
            }
        };
        Planet.prototype.rollups = function (turn) {
            var e_7, _a, e_8, _b, e_9, _c;
            try {
                for (var _d = __values(this.stock.keys()), _e = _d.next(); !_e.done; _e = _d.next()) {
                    var item = _e.value;
                    this.incSupply(item, this.getStock(item));
                }
            }
            catch (e_7_1) { e_7 = { error: e_7_1 }; }
            finally {
                try {
                    if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
                }
                finally { if (e_7) throw e_7.error; }
            }
            this.supply.rollup();
            this.demand.rollup();
            try {
                for (var _f = __values(this.need.keys()), _g = _f.next(); !_g.done; _g = _f.next()) {
                    var item = _g.value;
                    this.need.inc(item, this.getNeed(item));
                }
            }
            catch (e_8_1) { e_8 = { error: e_8_1 }; }
            finally {
                try {
                    if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
                }
                finally { if (e_8) throw e_8.error; }
            }
            this.need.rollup();
            this._exporter = {};
            this._need = {};
            try {
                // randomly cycle updates to price
                for (var _h = __values(t.resources), _j = _h.next(); !_j.done; _j = _h.next()) {
                    var item = _j.value;
                    if (!this._cycle[item] || turn % this._cycle[item]) {
                        // drop the saved price
                        delete this._price[item];
                        // set a new turn modulus for 3-12 days
                        this._cycle[item] = util.getRandomInt(3, 12) * data_1.default.turns_per_day;
                    }
                }
            }
            catch (e_9_1) { e_9 = { error: e_9_1 }; }
            finally {
                try {
                    if (_j && !_j.done && (_c = _h.return)) _c.call(_h);
                }
                finally { if (e_9) throw e_9.error; }
            }
        };
        Object.defineProperty(Planet.prototype, "desc", {
            get: function () {
                return data_1.default.bodies[this.body].desc;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Planet.prototype, "position", {
            get: function () {
                return system_1.default.position(this.body);
            },
            enumerable: true,
            configurable: true
        });
        Planet.prototype.distance = function (toBody) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, system_1.default.distance(this.body, toBody)];
                        case 1: return [2 /*return*/, _a.sent()];
                    }
                });
            });
        };
        Planet.prototype.hasTrait = function (trait) {
            var e_10, _a;
            try {
                for (var _b = __values(this.traits), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var t_1 = _c.value;
                    if (t_1.name == trait) {
                        return true;
                    }
                }
            }
            catch (e_10_1) { e_10 = { error: e_10_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_10) throw e_10.error; }
            }
            return false;
        };
        Planet.prototype.hasCondition = function (condition) {
            var e_11, _a;
            try {
                for (var _b = __values(this.conditions), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var c = _c.value;
                    if (c.name == condition) {
                        return true;
                    }
                }
            }
            catch (e_11_1) { e_11 = { error: e_11_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_11) throw e_11.error; }
            }
            return false;
        };
        /*
         * Piracy rates
         */
        Planet.prototype.piracyRadius = function () {
            // jurisdiction is a good enough basis for operating range for now
            var radius = this.scale(data_1.default.jurisdiction * 2);
            if (this.hasTrait('black market'))
                radius *= 2;
            if (this.hasTrait('capital'))
                radius *= 0.75;
            if (this.hasTrait('military'))
                radius *= 0.5;
            return radius;
        };
        // Piracy obeys a similar approximation of the inverse square law, just as
        // patrols do, but piracy rates peak at the limit of patrol ranges, where
        // pirates are close enough to remain within operating range of their home
        // base, but far enough away that patrols are not too problematic.
        Planet.prototype.piracyRate = function (distance) {
            if (distance === void 0) { distance = 0; }
            var radius = this.piracyRadius();
            distance = Math.abs(distance - radius);
            var rate = this.scale(this.faction.piracy);
            var intvl = radius / 10;
            for (var i = 0; i < distance; i += intvl) {
                rate *= 0.85;
            }
            return Math.max(0, rate);
        };
        /*
         * Patrols and inspections
         */
        Planet.prototype.patrolRadius = function () {
            var radius = this.scale(data_1.default.jurisdiction);
            if (this.hasTrait('military'))
                radius *= 1.75;
            if (this.hasTrait('capital'))
                radius *= 1.5;
            if (this.hasTrait('black market'))
                radius *= 0.5;
            return radius;
        };
        // Distance is in AU
        Planet.prototype.patrolRate = function (distance) {
            if (distance === void 0) { distance = 0; }
            var radius = this.patrolRadius();
            var patrol = this.scale(this.faction.patrol);
            if (distance < radius) {
                return patrol;
            }
            distance -= radius;
            var rate = patrol;
            for (var i = 0; i < distance; i += 0.1) {
                rate /= 2;
            }
            return Math.max(0, rate);
        };
        Planet.prototype.inspectionRate = function (player) {
            var standing = 1 - (player.getStanding(this.faction.abbrev) / data_1.default.max_abs_standing);
            return this.scale(this.faction.inspection) * standing;
        };
        Planet.prototype.inspectionFine = function (player) {
            return Math.max(10, data_1.default.max_abs_standing - player.getStanding(this.faction));
        };
        /*
         * Fabrication
         */
        Planet.prototype.fabricationAvailability = function () {
            return Math.ceil(Math.min(100, this.fab_health / this.max_fab_health * 100));
        };
        Planet.prototype.fabricationReductionRate = function () {
            if (this.hasTrait('manufacturing hub'))
                return 0.35;
            if (this.hasTrait('tech hub'))
                return 0.5;
            return 0.65;
        };
        Planet.prototype.fabricationTime = function (item, count) {
            if (count === void 0) { count = 1; }
            var resource = resource_1.resources[item];
            if (!resource_1.isCraft(resource)) {
                throw new Error(item + " is not craftable");
            }
            var reduction = this.fabricationReductionRate();
            var health = this.fab_health;
            var turns = 0;
            while (count > 0 && health > 0) {
                turns += resource.craftTurns * reduction;
                health -= resource.craftTurns * reduction;
                --count;
            }
            turns += count * resource.craftTurns;
            return Math.max(1, Math.ceil(turns));
        };
        Planet.prototype.hasFabricationResources = function (item, count) {
            if (count === void 0) { count = 1; }
            var resource = resource_1.resources[item];
            if (!resource_1.isCraft(resource)) {
                throw new Error(item + " is not craftable");
            }
            var reduction = this.fabricationReductionRate();
            var health = this.fab_health;
            for (var i = 0; i < count && health > 0; ++i) {
                health -= resource.craftTurns * reduction;
                if (health == 0) {
                    return false;
                }
            }
            return true;
        };
        Planet.prototype.fabricationFee = function (item, count, player) {
            if (count === void 0) { count = 1; }
            return __awaiter(this, void 0, void 0, function () {
                var resource, rate, _a, reduction, health, fee, i;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            resource = resource_1.resources[item];
                            if (!resource_1.isCraft(resource)) {
                                throw new Error(item + " is not craftable");
                            }
                            _a = data_1.default.craft_fee;
                            return [4 /*yield*/, this.sellPrice(item)];
                        case 1:
                            rate = _a * (_b.sent());
                            reduction = this.fabricationReductionRate();
                            health = this.fab_health;
                            fee = 5 * rate * count;
                            for (i = 0; i < count && health > 0; ++i) {
                                health -= resource.craftTurns * reduction;
                                fee -= rate * 4;
                            }
                            fee -= fee * player.getStandingPriceAdjustment(this.faction.abbrev);
                            fee += fee * this.faction.sales_tax;
                            return [2 /*return*/, Math.max(1, Math.ceil(fee))];
                    }
                });
            });
        };
        Planet.prototype.fabricate = function (item) {
            var resource = resource_1.resources[item];
            if (!resource_1.isCraft(resource)) {
                throw new Error(item + " is not craftable");
            }
            var reduction = this.fabricationReductionRate();
            var health = this.fab_health;
            var turns = 0;
            if (this.fab_health > 0) {
                turns += resource.craftTurns * reduction;
                this.fab_health -= resource.craftTurns * reduction;
            }
            else {
                turns += resource.craftTurns;
            }
            var turns_taken = Math.max(1, Math.ceil(turns));
            return turns_taken;
        };
        Planet.prototype.replenishFabricators = function () {
            return __awaiter(this, void 0, void 0, function () {
                var want, _a, bought, price;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!(this.fab_health < this.max_fab_health / 2)) return [3 /*break*/, 2];
                            want = Math.ceil((this.max_fab_health - this.fab_health) / data_1.default.fab_health);
                            return [4 /*yield*/, this.buy('cybernetics', want)];
                        case 1:
                            _a = __read.apply(void 0, [_b.sent(), 2]), bought = _a[0], price = _a[1];
                            this.fab_health += bought * data_1.default.fab_health;
                            _b.label = 2;
                        case 2: return [2 /*return*/];
                    }
                });
            });
        };
        /*
         * Work
         */
        Planet.prototype.hasPicketLine = function () {
            return this.hasCondition("workers' strike");
        };
        Planet.prototype.payRate = function (player, task) {
            var rate = this.scale(task.pay);
            rate += rate * player.getStandingPriceAdjustment(this.faction.abbrev);
            rate -= rate * this.faction.sales_tax;
            return Math.ceil(rate);
        };
        Planet.prototype.work = function (player, task, days) {
            var e_12, _a;
            var pay = this.payRate(player, task) * days;
            var turns = days * 24 / data_1.default.hours_per_turn;
            var rewards = task.rewards;
            var collected = new store_1.default;
            for (var turn = 0; turn < turns; ++turn) {
                try {
                    for (var rewards_1 = __values(rewards), rewards_1_1 = rewards_1.next(); !rewards_1_1.done; rewards_1_1 = rewards_1.next()) {
                        var item = rewards_1_1.value;
                        collected.inc(item, this.mine(item));
                    }
                }
                catch (e_12_1) { e_12 = { error: e_12_1 }; }
                finally {
                    try {
                        if (rewards_1_1 && !rewards_1_1.done && (_a = rewards_1.return)) _a.call(rewards_1);
                    }
                    finally { if (e_12) throw e_12.error; }
                }
            }
            return { pay: pay, items: collected };
        };
        Planet.prototype.mine = function (item) {
            if (this.production(item) > 0 && util.chance(data_1.default.market.minability)) {
                var amt = util.getRandomNum(0, this.production(item));
                return Math.min(1, amt);
            }
            return 0;
        };
        /*
         * Economics
         */
        Planet.prototype.scale = function (n) {
            if (n === void 0) { n = 0; }
            return data_1.default.scales[this.size] * n;
        };
        Planet.prototype.getStock = function (item) {
            return this.stock.count(item);
        };
        Planet.prototype.avgProduction = function (item) {
            return this.getSupply(item) - this.consumption(item);
        };
        Planet.prototype.netProduction = function (item) {
            return this.production(item) - this.consumption(item);
        };
        Planet.prototype.getDemand = function (item) {
            return this.demand.avg(item);
        };
        Planet.prototype.getSupply = function (item) {
            return this.supply.avg(item);
        };
        Planet.prototype.shortageFactor = function (item) {
            return this.isNetExporter(item) ? 3 : 6;
        };
        Planet.prototype.hasShortage = function (item) {
            return this.getNeed(item) >= this.shortageFactor(item);
        };
        Planet.prototype.surplusFactor = function (item) {
            return this.isNetExporter(item) ? 0.3 : 0.6;
        };
        Planet.prototype.hasSurplus = function (item) {
            return this.getNeed(item) <= this.surplusFactor(item);
        };
        Planet.prototype.hasSuperSurplus = function (item) {
            return this.getNeed(item) <= this.surplusFactor(item) * 0.75;
        };
        Planet.prototype.production = function (item) {
            var e_13, _a;
            var amount = this.produces.get(item) / data_1.default.turns_per_day;
            try {
                for (var _b = __values(this.conditions), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var condition = _c.value;
                    amount += this.scale(condition.produces[item] || 0);
                }
            }
            catch (e_13_1) { e_13 = { error: e_13_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_13) throw e_13.error; }
            }
            return amount;
        };
        Planet.prototype.consumption = function (item) {
            var e_14, _a;
            var amount = this.consumes.get(item) / data_1.default.turns_per_day;
            try {
                for (var _b = __values(this.conditions), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var condition = _c.value;
                    amount += this.scale(condition.consumes[item] || 0);
                }
            }
            catch (e_14_1) { e_14 = { error: e_14_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_14) throw e_14.error; }
            }
            return amount;
        };
        // Increases demand by the number of units of item less than amt that
        // there are in the market. For example, if requesting 5 units of fuel
        // and only 3 are in the market, demand will increase by 2.
        Planet.prototype.requestResource = function (item, amt) {
            var avail = this.getStock(item);
            if (amt > avail) {
                this.incDemand(item, amt - avail);
            }
        };
        Planet.prototype.incDemand = function (item, amt) {
            var e_15, _a;
            var queue = [[item, amt]];
            while (queue.length > 0) {
                var elt = queue.shift();
                if (elt != undefined) {
                    var _b = __read(elt, 2), item_1 = _b[0], amt_1 = _b[1];
                    this.demand.inc(item_1, amt_1);
                    var res = data_1.default.resources[item_1];
                    if (t.isCraft(res) && this.hasShortage(item_1)) {
                        try {
                            for (var _c = __values(Object.keys(res.recipe.materials)), _d = _c.next(); !_d.done; _d = _c.next()) {
                                var mat = _d.value;
                                queue.push([mat, (res.recipe.materials[mat] || 0) * amt_1]);
                            }
                        }
                        catch (e_15_1) { e_15 = { error: e_15_1 }; }
                        finally {
                            try {
                                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                            }
                            finally { if (e_15) throw e_15.error; }
                        }
                    }
                }
            }
        };
        Planet.prototype.incSupply = function (item, amount) {
            this.supply.inc(item, amount);
        };
        Planet.prototype.isNetExporter = function (item) {
            var e_16, _a;
            if (this._exporter[item] === undefined) {
                var res = data_1.default.resources[item];
                if (t.isCraft(res)) {
                    this._exporter[item] = true;
                    try {
                        for (var _b = __values(Object.keys(res.recipe.materials)), _c = _b.next(); !_c.done; _c = _b.next()) {
                            var mat = _c.value;
                            if (!this.isNetExporter(mat)) {
                                this._exporter[item] = false;
                                break;
                            }
                        }
                    }
                    catch (e_16_1) { e_16 = { error: e_16_1 }; }
                    finally {
                        try {
                            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                        }
                        finally { if (e_16) throw e_16.error; }
                    }
                }
                else {
                    this._exporter[item] = this.netProduction(item) > this.scale(1);
                }
            }
            return this._exporter[item];
        };
        Planet.prototype.getNeed = function (item) {
            if (this._need[item] === undefined) {
                var d = this.getDemand(item);
                var s = (this.getStock(item) + (2 * this.getSupply(item))) / 3;
                var n = d - s;
                this._need[item] =
                    n == 0 ? 1
                        : n > 0 ? Math.log(10 * (1 + n))
                            : d / s;
            }
            return this._need[item];
        };
        /**
         * Returns a price adjustment which accounts for the distance to the nearest
         * net exporter of the item. Returns a decimal percentage where 1.0 means no
         * adjustment.
         */
        Planet.prototype.getAvailabilityMarkup = function (item) {
            return __awaiter(this, void 0, void 0, function () {
                var e_17, _a, distance, nearest, _b, _c, body, d, e_17_1, markup, au, i;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            // If this planet is a net exporter of the item, easy access results in a
                            // lower price.
                            if (this.isNetExporter(item)) {
                                return [2 /*return*/, 0.8];
                            }
                            _d.label = 1;
                        case 1:
                            _d.trys.push([1, 6, 7, 8]);
                            _b = __values(t.bodies), _c = _b.next();
                            _d.label = 2;
                        case 2:
                            if (!!_c.done) return [3 /*break*/, 5];
                            body = _c.value;
                            if (body == this.body) {
                                return [3 /*break*/, 4];
                            }
                            if (!window.game.planets[body].isNetExporter(item)) {
                                return [3 /*break*/, 4];
                            }
                            return [4 /*yield*/, system_1.default.distance(this.body, body)];
                        case 3:
                            d = _d.sent();
                            if (distance == undefined || distance > d) {
                                nearest = body;
                                distance = d;
                            }
                            _d.label = 4;
                        case 4:
                            _c = _b.next();
                            return [3 /*break*/, 2];
                        case 5: return [3 /*break*/, 8];
                        case 6:
                            e_17_1 = _d.sent();
                            e_17 = { error: e_17_1 };
                            return [3 /*break*/, 8];
                        case 7:
                            try {
                                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                            }
                            finally { if (e_17) throw e_17.error; }
                            return [7 /*endfinally*/];
                        case 8:
                            if (distance != undefined && nearest != undefined) {
                                markup = 1;
                                // Competing market malus
                                if (data_1.default.bodies[nearest].faction != data_1.default.bodies[this.body].faction) {
                                    markup += 0.1;
                                }
                                au = Math.ceil(distance / physics_1.default.AU);
                                for (i = 0; i < au; ++i) {
                                    markup *= 1.05;
                                }
                                return [2 /*return*/, markup];
                            }
                            else {
                                return [2 /*return*/, 1];
                            }
                            return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Percent adjustment to price due to an item being a necessity (see
         * data.necessity). Returns a decimal percentage, where 1.0 means no
         * adjustment:
         *
         *    price *= this.getScarcityMarkup(item));
         */
        Planet.prototype.getScarcityMarkup = function (item) {
            if (data_1.default.necessity[item]) {
                return 1 + data_1.default.scarcity_markup;
            }
            else {
                return 1;
            }
        };
        /**
         * Also factors in temporary deficits between production and consumption of
         * the item due to Conditions. Returns a decimal percentage, where 1.0
         * means no adjustment.
         */
        Planet.prototype.getConditionMarkup = function (item) {
            var e_18, _a;
            var markup = 1;
            try {
                for (var _b = __values(this.conditions), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var condition = _c.value;
                    var consumption = this.scale(condition.consumes[item] || 0);
                    var production = this.scale(condition.produces[item] || 0);
                    var amount = consumption - production; // production is generally a malus
                    markup += amount;
                }
            }
            catch (e_18_1) { e_18 = { error: e_18_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_18) throw e_18.error; }
            }
            return markup;
        };
        Planet.prototype.price = function (item) {
            return __awaiter(this, void 0, void 0, function () {
                var e_19, _a, value, need, price, _b, _c, trait, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            if (!(this._price[item] == undefined)) return [3 /*break*/, 2];
                            value = resource_1.resources[item].value;
                            need = this.getNeed(item);
                            price = 0;
                            if (need > 1) {
                                price = value + (value * Math.log(need));
                            }
                            else if (need < 1) {
                                price = value * need;
                            }
                            else {
                                price = value;
                            }
                            try {
                                // Linear adjustments for market classifications
                                for (_b = __values(this.traits), _c = _b.next(); !_c.done; _c = _b.next()) {
                                    trait = _c.value;
                                    price -= price * (trait.price[item] || 0);
                                }
                            }
                            catch (e_19_1) { e_19 = { error: e_19_1 }; }
                            finally {
                                try {
                                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                                }
                                finally { if (e_19) throw e_19.error; }
                            }
                            // Scarcity adjustment for items necessary to survival
                            price *= this.getScarcityMarkup(item);
                            // Scarcity adjustment due to temporary conditions affecting production
                            // and consumption of resources
                            price *= this.getConditionMarkup(item);
                            // Set upper and lower boundary to prevent superheating or crashing
                            // markets.
                            price = resource_1.resources[item].clampPrice(price);
                            // Post-clamp adjustments due to distance
                            _d = price;
                            return [4 /*yield*/, this.getAvailabilityMarkup(item)];
                        case 1:
                            // Post-clamp adjustments due to distance
                            price = _d * _e.sent();
                            // Add a bit of "unaccounted for local influences"
                            price = util.fuzz(price, 0.05);
                            this._price[item] = util.R(price);
                            _e.label = 2;
                        case 2: return [2 /*return*/, this._price[item]];
                    }
                });
            });
        };
        Planet.prototype.sellPrice = function (item) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.price(item)];
                        case 1: return [2 /*return*/, _a.sent()];
                    }
                });
            });
        };
        Planet.prototype.buyPrice = function (item, player) {
            return __awaiter(this, void 0, void 0, function () {
                var price;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.price(item)];
                        case 1:
                            price = (_a.sent()) * (1 + this.faction.sales_tax);
                            return [2 /*return*/, player
                                    ? Math.ceil(price * (1 - player.getStandingPriceAdjustment(this.faction.abbrev)))
                                    : Math.ceil(price)];
                    }
                });
            });
        };
        Planet.prototype.buy = function (item, amount, player) {
            return __awaiter(this, void 0, void 0, function () {
                var bought, price, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            bought = Math.min(amount, this.getStock(item));
                            _a = bought;
                            return [4 /*yield*/, this.buyPrice(item, player)];
                        case 1:
                            price = _a * (_b.sent());
                            this.incDemand(item, amount);
                            this.stock.dec(item, bought);
                            if (player && bought) {
                                player.debit(price);
                                player.ship.loadCargo(item, bought);
                                if (player === window.game.player) {
                                    window.dispatchEvent(new CustomEvent("itemsBought", {
                                        detail: {
                                            count: bought,
                                            body: this.body,
                                            item: item,
                                            price: price
                                        }
                                    }));
                                }
                            }
                            return [2 /*return*/, [bought, price]];
                    }
                });
            });
        };
        Planet.prototype.sell = function (item, amount, player) {
            return __awaiter(this, void 0, void 0, function () {
                var e_20, _a, hasShortage, price, _b, standing, _c, _d, c;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            hasShortage = this.hasShortage(item);
                            _b = amount;
                            return [4 /*yield*/, this.sellPrice(item)];
                        case 1:
                            price = _b * (_e.sent());
                            this.stock.inc(item, amount);
                            standing = 0;
                            if (player) {
                                player.ship.unloadCargo(item, amount);
                                player.credit(price);
                                if (hasShortage && !resource_1.resources[item].contraband) {
                                    // Player ended a shortage. Increase their standing with our faction.
                                    if (!this.hasShortage(item)) {
                                        standing += util.getRandomNum(3, 8);
                                    }
                                    // Player contributed toward ending a shortage. Increase their
                                    // standing with our faction slightly.
                                    else {
                                        standing += util.getRandomNum(1, 3);
                                    }
                                }
                                try {
                                    // Player sold items needed as a result of a condition
                                    for (_c = __values(this.conditions), _d = _c.next(); !_d.done; _d = _c.next()) {
                                        c = _d.value;
                                        if (c.consumes[item] != undefined) {
                                            standing += util.getRandomNum(2, 5);
                                        }
                                    }
                                }
                                catch (e_20_1) { e_20 = { error: e_20_1 }; }
                                finally {
                                    try {
                                        if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                                    }
                                    finally { if (e_20) throw e_20.error; }
                                }
                                if (standing > 0)
                                    player.incStanding(this.faction.abbrev, standing);
                                // only trigger for the player, not for agents
                                if (player === window.game.player) {
                                    window.dispatchEvent(new CustomEvent("itemsSold", {
                                        detail: {
                                            count: amount,
                                            body: this.body,
                                            item: item,
                                            price: price,
                                            standing: standing,
                                        },
                                    }));
                                }
                            }
                            return [2 /*return*/, [amount, price, standing]];
                    }
                });
            });
        };
        Planet.prototype.schedule = function (task) {
            this.pending.inc(task.item, task.count);
            this.queue.push(task);
        };
        Planet.prototype.processQueue = function () {
            var e_21, _a;
            // NOTE: this method of regenerating the queue is *much* faster than
            // Array.prototype.filter().
            var queue = this.queue;
            this.queue = [];
            try {
                for (var queue_1 = __values(queue), queue_1_1 = queue_1.next(); !queue_1_1.done; queue_1_1 = queue_1.next()) {
                    var task = queue_1_1.value;
                    if (--task.turns > 0) {
                        this.queue.push(task);
                    }
                    else {
                        this.sell(task.item, task.count);
                        this.pending.dec(task.item, task.count);
                    }
                }
            }
            catch (e_21_1) { e_21 = { error: e_21_1 }; }
            finally {
                try {
                    if (queue_1_1 && !queue_1_1.done && (_a = queue_1.return)) _a.call(queue_1);
                }
                finally { if (e_21) throw e_21.error; }
            }
        };
        Planet.prototype.neededResourceAmount = function (item) {
            if (this.getStock(item.name) > data_1.default.min_stock_count)
                return 0;
            var amount = this.getDemand(item.name) - this.getSupply(item.name) - this.pending.get(item.name);
            return Math.max(Math.ceil(amount), 0);
        };
        Planet.prototype.neededResources = function () {
            return __awaiter(this, void 0, void 0, function () {
                var e_22, _a, amounts, need, _b, _c, item, amount, _d, _e, _f, _g, e_22_1, prioritized;
                return __generator(this, function (_h) {
                    switch (_h.label) {
                        case 0:
                            amounts = {};
                            need = {};
                            _h.label = 1;
                        case 1:
                            _h.trys.push([1, 6, 7, 8]);
                            _b = __values(t.resources), _c = _b.next();
                            _h.label = 2;
                        case 2:
                            if (!!_c.done) return [3 /*break*/, 5];
                            item = _c.value;
                            amount = this.neededResourceAmount(resource_1.resources[item]);
                            if (!(amount > 0)) return [3 /*break*/, 4];
                            amounts[item] = amount;
                            _d = need;
                            _e = item;
                            _g = (_f = Math).log;
                            return [4 /*yield*/, this.price(item)];
                        case 3:
                            _d[_e] = _g.apply(_f, [_h.sent()]) * this.getNeed(item);
                            _h.label = 4;
                        case 4:
                            _c = _b.next();
                            return [3 /*break*/, 2];
                        case 5: return [3 /*break*/, 8];
                        case 6:
                            e_22_1 = _h.sent();
                            e_22 = { error: e_22_1 };
                            return [3 /*break*/, 8];
                        case 7:
                            try {
                                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                            }
                            finally { if (e_22) throw e_22.error; }
                            return [7 /*endfinally*/];
                        case 8:
                            prioritized = Object.keys(amounts).sort(function (a, b) {
                                var diff = need[a] - need[b];
                                return diff > 0 ? -1
                                    : diff < 0 ? 1
                                        : 0;
                            });
                            return [2 /*return*/, {
                                    'prioritized': prioritized,
                                    'amounts': amounts,
                                }];
                    }
                });
            });
        };
        Planet.prototype.exporters = function (item) {
            var _this = this;
            return t.bodies.filter(function (name) {
                var p = window.game.planets[name];
                return name !== _this.body
                    && p.getStock(item) >= 1
                    && !p.hasShortage(item)
                    && (p.hasSurplus(item) || p.isNetExporter(item));
            });
        };
        Planet.prototype.selectExporter = function (item, amount) {
            return __awaiter(this, void 0, void 0, function () {
                var e_23, _a, e_24, _b, e_25, _c, exporters, dist, price, stock, exporters_1, exporters_1_1, body, _d, _e, e_23_1, avgDist, avgPrice, avgStock, distRating, priceRating, stockRating, exporters_2, exporters_2_1, body, bestPlanet, bestRating, hasTradeBan, exporters_3, exporters_3_1, body, rating;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0: return [4 /*yield*/, this.exporters(item)];
                        case 1:
                            exporters = _f.sent();
                            if (exporters.length === 0)
                                return [2 /*return*/];
                            dist = {};
                            price = {};
                            stock = {};
                            _f.label = 2;
                        case 2:
                            _f.trys.push([2, 7, 8, 9]);
                            exporters_1 = __values(exporters), exporters_1_1 = exporters_1.next();
                            _f.label = 3;
                        case 3:
                            if (!!exporters_1_1.done) return [3 /*break*/, 6];
                            body = exporters_1_1.value;
                            if (window.game.planets[body].hasTradeBan)
                                return [3 /*break*/, 5];
                            _d = dist;
                            _e = body;
                            return [4 /*yield*/, this.distance(body)];
                        case 4:
                            _d[_e] = (_f.sent()) / physics_1.default.AU * window.game.planets[body].buyPrice('fuel');
                            price[body] = window.game.planets[body].buyPrice(item);
                            stock[body] = Math.min(amount, window.game.planets[body].getStock(item));
                            _f.label = 5;
                        case 5:
                            exporters_1_1 = exporters_1.next();
                            return [3 /*break*/, 3];
                        case 6: return [3 /*break*/, 9];
                        case 7:
                            e_23_1 = _f.sent();
                            e_23 = { error: e_23_1 };
                            return [3 /*break*/, 9];
                        case 8:
                            try {
                                if (exporters_1_1 && !exporters_1_1.done && (_a = exporters_1.return)) _a.call(exporters_1);
                            }
                            finally { if (e_23) throw e_23.error; }
                            return [7 /*endfinally*/];
                        case 9:
                            avgDist = Object.values(dist).reduce(function (a, b) { return a + b; }, 0)
                                / Object.values(dist).length;
                            avgPrice = Object.values(price).reduce(function (a, b) { return a + b; }, 0)
                                / Object.values(price).length;
                            avgStock = Object.values(stock).reduce(function (a, b) { return a + b; }, 0)
                                / Object.values(stock).length;
                            distRating = {};
                            priceRating = {};
                            stockRating = {};
                            try {
                                for (exporters_2 = __values(exporters), exporters_2_1 = exporters_2.next(); !exporters_2_1.done; exporters_2_1 = exporters_2.next()) {
                                    body = exporters_2_1.value;
                                    distRating[body] = avgDist / dist[body];
                                    priceRating[body] = avgPrice / price[body];
                                    stockRating[body] = stock[body] / avgStock;
                                }
                            }
                            catch (e_24_1) { e_24 = { error: e_24_1 }; }
                            finally {
                                try {
                                    if (exporters_2_1 && !exporters_2_1.done && (_b = exporters_2.return)) _b.call(exporters_2);
                                }
                                finally { if (e_24) throw e_24.error; }
                            }
                            bestRating = 0;
                            hasTradeBan = this.hasTradeBan;
                            try {
                                for (exporters_3 = __values(exporters), exporters_3_1 = exporters_3.next(); !exporters_3_1.done; exporters_3_1 = exporters_3.next()) {
                                    body = exporters_3_1.value;
                                    // no trade ban violations from unaligned markets
                                    if (hasTradeBan && data_1.default.bodies[body].faction != this.faction.abbrev)
                                        continue;
                                    rating = priceRating[body] * stockRating[body] * distRating[body];
                                    if (rating > bestRating) {
                                        bestRating = rating;
                                        bestPlanet = body;
                                    }
                                }
                            }
                            catch (e_25_1) { e_25 = { error: e_25_1 }; }
                            finally {
                                try {
                                    if (exporters_3_1 && !exporters_3_1.done && (_c = exporters_3.return)) _c.call(exporters_3);
                                }
                                finally { if (e_25) throw e_25.error; }
                            }
                            return [2 /*return*/, bestPlanet];
                    }
                });
            });
        };
        /**
         * Returns the number of an item which can be crafted given the resources
         * available in this market.
         */
        Planet.prototype.canManufacture = function (item) {
            var e_26, _a;
            var res = resource_1.resources[item];
            var counts = [];
            if (resource_1.isCraft(res)) {
                var need = this.getNeed(item);
                try {
                    for (var _b = __values(Object.keys(res.recipe.materials)), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var mat = _c.value;
                        if (this.getNeed(mat) > need) {
                            return 0;
                        }
                        var avail = this.getStock(mat);
                        if (avail == 0) {
                            return 0;
                        }
                        var amount = Math.floor(avail / (res.recipe.materials[mat] || 0));
                        counts.push(amount);
                    }
                }
                catch (e_26_1) { e_26 = { error: e_26_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_26) throw e_26.error; }
                }
            }
            if (counts.length > 0) {
                return counts.reduce(function (a, b) { return a < b ? a : b; });
            }
            else {
                return 0;
            }
        };
        Planet.prototype.manufactureSlots = function () {
            return data_1.default.max_crafts - this.queue.filter(function (t) { return isCraftTask(t); }).length;
        };
        Planet.prototype.manufacture = function () {
            return __awaiter(this, void 0, void 0, function () {
                var e_27, _a, e_28, _b, e_29, _c, slots, needed, _d, _e, item, res, want, avail, gets, _f, _g, mat, diff, _h, _j, mat;
                return __generator(this, function (_k) {
                    switch (_k.label) {
                        case 0:
                            slots = this.manufactureSlots();
                            if (slots <= 0)
                                return [2 /*return*/];
                            return [4 /*yield*/, this.neededResources()];
                        case 1:
                            needed = _k.sent();
                            try {
                                for (_d = __values(needed.prioritized), _e = _d.next(); !_e.done; _e = _d.next()) {
                                    item = _e.value;
                                    res = resource_1.resources[item];
                                    if (resource_1.isCraft(res)) {
                                        want = needed.amounts[item];
                                        avail = this.canManufacture(item);
                                        gets = Math.min(want, avail);
                                        if (gets > 0) {
                                            try {
                                                for (_f = __values(Object.keys(res.recipe.materials)), _g = _f.next(); !_g.done; _g = _f.next()) {
                                                    mat = _g.value;
                                                    this.buy(mat, gets * (res.recipe.materials[mat] || 0));
                                                }
                                            }
                                            catch (e_28_1) { e_28 = { error: e_28_1 }; }
                                            finally {
                                                try {
                                                    if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
                                                }
                                                finally { if (e_28) throw e_28.error; }
                                            }
                                            this.schedule({
                                                type: 'craft',
                                                turns: this.fabricate(item),
                                                item: item,
                                                count: gets,
                                            });
                                        }
                                        if (gets < want) {
                                            diff = want - gets;
                                            try {
                                                for (_h = __values(Object.keys(res.recipe.materials)), _j = _h.next(); !_j.done; _j = _h.next()) {
                                                    mat = _j.value;
                                                    this.incDemand(mat, diff * (res.recipe.materials[mat] || 0));
                                                }
                                            }
                                            catch (e_29_1) { e_29 = { error: e_29_1 }; }
                                            finally {
                                                try {
                                                    if (_j && !_j.done && (_c = _h.return)) _c.call(_h);
                                                }
                                                finally { if (e_29) throw e_29.error; }
                                            }
                                        }
                                    }
                                    if (--slots <= 0)
                                        break;
                                }
                            }
                            catch (e_27_1) { e_27 = { error: e_27_1 }; }
                            finally {
                                try {
                                    if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
                                }
                                finally { if (e_27) throw e_27.error; }
                            }
                            return [2 /*return*/];
                    }
                });
            });
        };
        Planet.prototype.importSlots = function () {
            return data_1.default.max_imports - this.queue.filter(function (t) { return isImportTask(t); }).length;
        };
        Planet.prototype.imports = function () {
            return __awaiter(this, void 0, void 0, function () {
                var e_30, _a, slots, need, want, list, list_1, list_1_1, item, amount, planet, _b, bought, price, distance, turns, e_30_1;
                var _this = this;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            slots = this.importSlots();
                            if (slots <= 0)
                                return [2 /*return*/];
                            return [4 /*yield*/, this.neededResources()];
                        case 1:
                            need = _c.sent();
                            want = need.amounts;
                            list = need.prioritized.filter(function (i) {
                                if (_this.isNetExporter(i) && !_this.hasShortage(i)) {
                                    // Remove items that we ourselves export or that we aren't short of
                                    delete want[i];
                                    return false;
                                }
                                return true;
                            });
                            _c.label = 2;
                        case 2:
                            _c.trys.push([2, 10, 11, 12]);
                            list_1 = __values(list), list_1_1 = list_1.next();
                            _c.label = 3;
                        case 3:
                            if (!!list_1_1.done) return [3 /*break*/, 9];
                            item = list_1_1.value;
                            amount = util.clamp(want[item], 2, data_1.default.shipclass.hauler.cargo);
                            return [4 /*yield*/, this.selectExporter(item, amount)];
                        case 4:
                            planet = _c.sent();
                            if (!planet) {
                                return [3 /*break*/, 8];
                            }
                            return [4 /*yield*/, window.game.planets[planet].buy(item, amount)];
                        case 5:
                            _b = __read.apply(void 0, [_c.sent(), 2]), bought = _b[0], price = _b[1];
                            if (!(bought > 0)) return [3 /*break*/, 7];
                            return [4 /*yield*/, this.distance(planet)];
                        case 6:
                            distance = (_c.sent()) / physics_1.default.AU;
                            turns = Math.max(3, Math.ceil(Math.log(distance) * 2)) * data_1.default.turns_per_day;
                            window.game.planets[planet].buy('fuel', distance);
                            this.schedule({
                                type: 'import',
                                item: item,
                                count: bought,
                                from: planet,
                                to: this.body,
                                turns: turns,
                            });
                            _c.label = 7;
                        case 7:
                            if (--slots <= 0)
                                return [3 /*break*/, 9];
                            _c.label = 8;
                        case 8:
                            list_1_1 = list_1.next();
                            return [3 /*break*/, 3];
                        case 9: return [3 /*break*/, 12];
                        case 10:
                            e_30_1 = _c.sent();
                            e_30 = { error: e_30_1 };
                            return [3 /*break*/, 12];
                        case 11:
                            try {
                                if (list_1_1 && !list_1_1.done && (_a = list_1.return)) _a.call(list_1);
                            }
                            finally { if (e_30) throw e_30.error; }
                            return [7 /*endfinally*/];
                        case 12: return [2 /*return*/];
                    }
                });
            });
        };
        Planet.prototype.luxuriate = function () {
            this.buy('luxuries', this.scale(3));
        };
        Planet.prototype.produce = function () {
            var e_31, _a;
            try {
                for (var _b = __values(t.resources), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var item = _c.value;
                    // allow some surplus to build
                    if (this.getStock(item) < this.min_stock || !this.hasSuperSurplus(item)) {
                        var amount = this.production(item);
                        if (amount > 0) {
                            this.sell(item, amount);
                        }
                    }
                }
            }
            catch (e_31_1) { e_31 = { error: e_31_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_31) throw e_31.error; }
            }
        };
        Planet.prototype.consume = function () {
            var e_32, _a;
            try {
                for (var _b = __values(t.resources), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var item = _c.value;
                    var amt = this.consumption(item);
                    if (amt > 0) {
                        this.buy(item, this.consumption(item));
                    }
                }
            }
            catch (e_32_1) { e_32 = { error: e_32_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_32) throw e_32.error; }
            }
        };
        Planet.prototype.apply_conditions = function () {
            var _this = this;
            var e_33, _a, e_34, _b, e_35, _c, e_36, _d;
            // Increment turns on each condition and filter out those which are no
            // longer active. Where condition triggers no longer exist, conditions'
            // duration is reduced.
            this.conditions = this.conditions.filter(function (c) {
                var e_37, _a, e_38, _b, e_39, _c;
                try {
                    for (var _d = __values(Object.keys(c.triggers.shortage)), _e = _d.next(); !_e.done; _e = _d.next()) {
                        var item = _e.value;
                        if (!_this.hasShortage(item)) {
                            c.mul_turns(0.8);
                        }
                    }
                }
                catch (e_37_1) { e_37 = { error: e_37_1 }; }
                finally {
                    try {
                        if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
                    }
                    finally { if (e_37) throw e_37.error; }
                }
                try {
                    for (var _f = __values(Object.keys(c.triggers.surplus)), _g = _f.next(); !_g.done; _g = _f.next()) {
                        var item = _g.value;
                        if (!_this.hasSurplus(item)) {
                            c.mul_turns(0.8);
                        }
                    }
                }
                catch (e_38_1) { e_38 = { error: e_38_1 }; }
                finally {
                    try {
                        if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
                    }
                    finally { if (e_38) throw e_38.error; }
                }
                try {
                    for (var _h = __values(Object.keys(c.triggers.condition)), _j = _h.next(); !_j.done; _j = _h.next()) {
                        var cond = _j.value;
                        if (!_this.hasCondition(cond)) {
                            c.mul_turns(0.8);
                        }
                    }
                }
                catch (e_39_1) { e_39 = { error: e_39_1 }; }
                finally {
                    try {
                        if (_j && !_j.done && (_c = _h.return)) _c.call(_h);
                    }
                    finally { if (e_39) throw e_39.error; }
                }
                c.inc_turns();
                return !c.is_over;
            });
            try {
                // Test for chance of new conditions
                for (var _e = __values(Object.keys(data_1.default.conditions)), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var c = _f.value;
                    // Skip conditions that are already active
                    if (this.hasCondition(c)) {
                        continue;
                    }
                    try {
                        // Shortages
                        for (var _g = __values(Object.keys(data_1.default.conditions[c].triggers.shortage)), _h = _g.next(); !_h.done; _h = _g.next()) {
                            var item = _h.value;
                            if (this.hasShortage(item)) {
                                if (util.chance(data_1.default.conditions[c].triggers.shortage[item])) {
                                    this.conditions.push(new condition_1.Condition(c));
                                }
                            }
                        }
                    }
                    catch (e_34_1) { e_34 = { error: e_34_1 }; }
                    finally {
                        try {
                            if (_h && !_h.done && (_b = _g.return)) _b.call(_g);
                        }
                        finally { if (e_34) throw e_34.error; }
                    }
                    try {
                        // Surpluses
                        for (var _j = __values(Object.keys(data_1.default.conditions[c].triggers.surplus)), _k = _j.next(); !_k.done; _k = _j.next()) {
                            var item = _k.value;
                            if (this.hasSurplus(item)) {
                                if (util.chance(data_1.default.conditions[c].triggers.surplus[item])) {
                                    this.conditions.push(new condition_1.Condition(c));
                                }
                            }
                        }
                    }
                    catch (e_35_1) { e_35 = { error: e_35_1 }; }
                    finally {
                        try {
                            if (_k && !_k.done && (_c = _j.return)) _c.call(_j);
                        }
                        finally { if (e_35) throw e_35.error; }
                    }
                    try {
                        // Conditions
                        for (var _l = __values(Object.keys(data_1.default.conditions[c].triggers.condition)), _m = _l.next(); !_m.done; _m = _l.next()) {
                            var cond = _m.value;
                            if (this.hasCondition(cond) || this.hasTrait(cond)) {
                                if (util.chance(data_1.default.conditions[c].triggers.condition[cond])) {
                                    this.conditions.push(new condition_1.Condition(c));
                                }
                            }
                        }
                    }
                    catch (e_36_1) { e_36 = { error: e_36_1 }; }
                    finally {
                        try {
                            if (_m && !_m.done && (_d = _l.return)) _d.call(_l);
                        }
                        finally { if (e_36) throw e_36.error; }
                    }
                }
            }
            catch (e_33_1) { e_33 = { error: e_33_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_a = _e.return)) _a.call(_e);
                }
                finally { if (e_33) throw e_33.error; }
            }
        };
        /*
         * Contracts
         */
        Planet.prototype.refreshContracts = function () {
            if (this.contracts.length > 0 && window.game) {
                this.contracts = this.contracts.filter(function (c) { return c.valid_until >= window.game.turns; });
            }
            this.refreshPassengerContracts();
            this.refreshSmugglerContracts();
        };
        Planet.prototype.refreshSmugglerContracts = function () {
            return __awaiter(this, void 0, void 0, function () {
                var e_40, _a, hasTradeBan, needed, missions, _b, _c, item, mission;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            hasTradeBan = this.hasTradeBan;
                            // If the trade ban is over, remove smuggling contracts
                            if (this.contracts.length > 0 && window.game) {
                                this.contracts = this.contracts.filter(function (c) { return !(c instanceof mission_1.Smuggler) || hasTradeBan; });
                            }
                            if (!hasTradeBan) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.neededResources()];
                        case 1:
                            needed = _d.sent();
                            missions = [];
                            try {
                                for (_b = __values(needed.prioritized), _c = _b.next(); !_c.done; _c = _b.next()) {
                                    item = _c.value;
                                    if (missions.length > 3)
                                        break;
                                    mission = new mission_1.Smuggler({
                                        issuer: this.body,
                                        item: item,
                                        amt: needed.amounts[item],
                                    });
                                    missions.push({
                                        valid_until: util.getRandomInt(10, 30) * data_1.default.turns_per_day,
                                        mission: mission,
                                    });
                                }
                            }
                            catch (e_40_1) { e_40 = { error: e_40_1 }; }
                            finally {
                                try {
                                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                                }
                                finally { if (e_40) throw e_40.error; }
                            }
                            this.contracts = this.contracts.concat(missions);
                            _d.label = 2;
                        case 2: return [2 /*return*/];
                    }
                });
            });
        };
        Planet.prototype.refreshPassengerContracts = function () {
            var _this = this;
            var e_41, _a;
            var want = util.getRandomInt(0, this.scale(5));
            var dests = t.bodies.filter(function (t) { return t != _this.body; });
            try {
                for (var _b = __values(t.bodies), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var body = _c.value;
                    if (body != this.body) {
                        // add weight to destinations from our own faction
                        if (data_1.default.bodies[body].faction == this.faction.abbrev) {
                            dests.push(body);
                        }
                        // add weight to capitals
                        if (data_1.default.factions[data_1.default.bodies[body].faction].capital == body) {
                            dests.push(body);
                        }
                    }
                }
            }
            catch (e_41_1) { e_41 = { error: e_41_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_41) throw e_41.error; }
            }
            var _loop_1 = function () {
                var dest = util.oneOf(dests.filter(function (d) { return !_this.contracts.find(function (c) { return c.mission.dest == d; }); }));
                var mission = new mission_1.Passengers({ issuer: this_1.body, dest: dest });
                if (this_1.contracts.find(function (c) { return c.mission.title == mission.title; })) {
                    return "continue";
                }
                this_1.contracts.push({
                    valid_until: util.getRandomInt(10, 30) * data_1.default.turns_per_day,
                    mission: mission,
                });
            };
            var this_1 = this;
            while (this.contracts.length < want) {
                _loop_1();
            }
        };
        Planet.prototype.acceptMission = function (mission) {
            this.contracts = this.contracts.filter(function (c) { return c.mission.title != mission.title; });
        };
        Object.defineProperty(Planet.prototype, "hasTradeBan", {
            get: function () {
                var trade_bans = window.game.get_conflicts({
                    target: this.faction.abbrev,
                    name: 'trade ban',
                });
                return trade_bans.length > 0;
            },
            enumerable: true,
            configurable: true
        });
        /*
         * Misc
         */
        Planet.prototype.addonPrice = function (addon, player) {
            var e_42, _a;
            var base = data_1.default.addons[addon].price;
            var standing = base * player.getStandingPriceAdjustment(this.faction.abbrev);
            var tax = base * this.faction.sales_tax;
            var price = base - standing + tax;
            try {
                for (var _b = __values(this.traits), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var trait = _c.value;
                    if ('price' in trait && 'addons' in trait.price) {
                        price *= trait.price['addons'] || 1;
                    }
                }
            }
            catch (e_42_1) { e_42 = { error: e_42_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_42) throw e_42.error; }
            }
            return price;
        };
        /*
         * Returns the number of turns until the next expected import or fabrication
         * of the desired resource will arrive. Returns undefined if none are
         * scheduled in the queue. Does not account for agents.
         */
        Planet.prototype.estimateAvailability = function (item) {
            var e_43, _a;
            var turns = undefined;
            if (this.getStock(item) > 0)
                return 0;
            var res = resource_1.resources[item];
            if (resource_1.isRaw(res) && this.netProduction(item) > 0) {
                return 3;
            }
            try {
                for (var _b = __values(this.queue), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var task = _c.value;
                    if (isImportTask(task)
                        && task.item == item
                        && (turns == undefined || turns > task.turns)) {
                        turns = task.turns;
                    }
                    else if (isCraftTask(task)
                        && task.item == item
                        && (turns == undefined || turns > task.turns)) {
                        turns = task.turns;
                    }
                }
            }
            catch (e_43_1) { e_43 = { error: e_43_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_43) throw e_43.error; }
            }
            return turns;
        };
        Planet.prototype.resourceDependencyPriceAdjustment = function (resource) {
            if (this.hasShortage(resource)) {
                return this.getNeed(resource);
            }
            else if (this.hasSurplus(resource)) {
                return 1 / this.getNeed(resource);
            }
            else {
                return 1;
            }
        };
        Planet.prototype.hasRepairs = function () {
            //return this.resourceDependencyPriceAdjustment('metal') < 10;
            return this.getStock('metal');
        };
        Planet.prototype.hullRepairPrice = function (player) {
            var base = data_1.default.ship.hull.repair;
            var tax = this.faction.sales_tax;
            var standing = player.getStandingPriceAdjustment(this.faction.abbrev);
            var scarcity = this.resourceDependencyPriceAdjustment('metal');
            return Math.ceil((base + (base * tax) - (base * standing)) * scarcity);
        };
        Planet.prototype.armorRepairPrice = function (player) {
            var base = data_1.default.ship.armor.repair;
            var tax = this.faction.sales_tax;
            var standing = player.getStandingPriceAdjustment(this.faction.abbrev);
            var scarcity = this.resourceDependencyPriceAdjustment('metal');
            return Math.ceil((base + (base * tax) - (base * standing)) * scarcity);
        };
        return Planet;
    }());
    exports.Planet = Planet;
});
