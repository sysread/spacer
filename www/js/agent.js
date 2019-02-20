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
define(["require", "exports", "./data", "./navcomp", "./transitplan", "./person", "./common", "./util"], function (require, exports, data_1, navcomp_1, transitplan_1, person_1, t, util) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    data_1 = __importDefault(data_1);
    t = __importStar(t);
    util = __importStar(util);
    function isDocked(action) {
        return action.action == 'docked';
    }
    function isJob(action) {
        return action.action == 'job';
    }
    function isRoute(action) {
        return action.action == 'route';
    }
    var Agent = /** @class */ (function (_super) {
        __extends(Agent, _super);
        function Agent(opt) {
            var _this = _super.call(this, opt) || this;
            var action = opt.action;
            if (action != undefined) {
                if (isRoute(action)) {
                    _this.action = {
                        action: 'route',
                        dest: action.dest,
                        item: action.item,
                        profit: action.profit,
                        transit: new transitplan_1.TransitPlan(action.transit),
                        count: action.count,
                    };
                }
                else {
                    _this.action = action;
                }
            }
            else {
                _this.action = _this.dock(_this.home);
            }
            window.addEventListener("turn", function () {
                if (window.game.turns < data_1.default.initial_days * data_1.default.turns_per_day)
                    return;
                if (window.game.turns % data_1.default.turns_per_day == 0)
                    _this.turn();
            });
            return _this;
        }
        Agent.prototype.turn = function () {
            return __awaiter(this, void 0, void 0, function () {
                var transit, routes, _a, item, count, _b, bought, price;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (!isDocked(this.action)) return [3 /*break*/, 5];
                            // Money to burn?
                            if (this.money > data_1.default.max_agent_money) {
                                this.buyLuxuries();
                            }
                            if (!this.refuel()) return [3 /*break*/, 4];
                            if (!this.here.hasTradeBan) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.findAlternateMarket()];
                        case 1:
                            transit = _c.sent();
                            if (transit != undefined) {
                                this.action = {
                                    action: 'route',
                                    dest: transit.dest,
                                    transit: new transitplan_1.TransitPlan(transit),
                                    item: 'water',
                                    count: 0,
                                    profit: 0,
                                };
                                return [2 /*return*/];
                            }
                            return [3 /*break*/, 4];
                        case 2: return [4 /*yield*/, this.profitableRoutes()];
                        case 3:
                            routes = _c.sent();
                            if (routes.length > 0) {
                                _a = routes[0], item = _a.item, count = _a.count;
                                _b = __read(this.here.buy(item, count, this), 2), bought = _b[0], price = _b[1];
                                if (bought != routes[0].count) {
                                    throw new Error(bought + " != " + count);
                                }
                                // switch to the new action
                                this.action = routes[0];
                                return [2 /*return*/];
                            }
                            _c.label = 4;
                        case 4:
                            // still here? then find a job and wait for profitability to happen
                            this.findWork();
                            _c.label = 5;
                        case 5:
                            if (isJob(this.action)) {
                                this.workTurn();
                                return [2 /*return*/];
                            }
                            if (isRoute(this.action)) {
                                this.transitTurn();
                                return [2 /*return*/];
                            }
                            return [2 /*return*/];
                    }
                });
            });
        };
        // Returns a 'Docked' action for the given location
        Agent.prototype.dock = function (here) {
            return {
                action: 'docked',
                location: here,
            };
        };
        Object.defineProperty(Agent.prototype, "here", {
            get: function () {
                if (isDocked(this.action) || isJob(this.action)) {
                    return window.game.planets[this.action.location];
                }
                else {
                    throw new Error('not docked');
                }
            },
            enumerable: true,
            configurable: true
        });
        // Returns true if the ship was fully refueled
        Agent.prototype.refuel = function () {
            if (isDocked(this.action)) {
                var fuelNeeded = this.ship.refuelUnits();
                var price = this.here.buyPrice('fuel', this);
                if (fuelNeeded > 0 && this.money > (fuelNeeded * price)) {
                    var _a = __read(this.here.buy('fuel', fuelNeeded), 2), bought = _a[0], paid = _a[1];
                    var need = fuelNeeded - bought;
                    var total = paid + (need * price);
                    this.debit(total);
                    this.ship.refuel(fuelNeeded);
                }
            }
            return this.ship.refuelUnits() == 0;
        };
        Agent.prototype.findWork = function () {
            // If no job, attempt to find one
            // TODO what to do if there are no jobs?
            // TODO account for strikes
            if (isDocked(this.action)) {
                var which_1 = util.oneOf(this.here.work_tasks);
                var job = data_1.default.work.find(function (w) { return w.name == which_1; });
                if (job) {
                    var days = 3;
                    var turns = days * data_1.default.turns_per_day;
                    this.action = {
                        action: 'job',
                        location: this.action.location,
                        task: job,
                        days: days,
                        turns: turns,
                    };
                }
            }
        };
        Agent.prototype.buyLuxuries = function () {
            if (isDocked(this.action)) {
                var here = window.game.planets[this.action.location];
                var want = Math.ceil((this.money - 1000) / here.buyPrice('luxuries', this));
                var _a = __read(here.buy('luxuries', want), 2), bought = _a[0], price = _a[1];
                this.debit(price);
                //console.debug(`agent: bought ${bought} luxuries for ${price} on ${this.here.name}`);
            }
        };
        // Returns true if any action was performed
        Agent.prototype.workTurn = function () {
            var e_1, _a;
            if (isJob(this.action)) {
                if (--this.action.turns == 0) {
                    var result = this.here.work(this, this.action.task, this.action.days);
                    // Credit agent for the word completed
                    this.credit(result.pay);
                    try {
                        //console.debug(`agent: worked ${this.action.task.name} for ${result.pay} on ${this.here.name}`);
                        // Sell any harvested resources to the market
                        for (var _b = __values(result.items.keys()), _c = _b.next(); !_c.done; _c = _b.next()) {
                            var item = _c.value;
                            var _d = __read(this.here.sell(item, result.items.count(item)), 3), amount = _d[0], price = _d[1], standing = _d[2];
                            this.incStanding(this.here.faction.abbrev, standing);
                            this.credit(price);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    // Restore "Docked" action
                    this.action = this.dock(this.action.location);
                }
                return true;
            }
            return false;
        };
        // Returns true if any action was performed
        Agent.prototype.transitTurn = function () {
            if (isRoute(this.action)) {
                this.action.transit.turn();
                this.ship.burn(this.action.transit.accel);
                if (this.action.transit.left == 0) {
                    var action = this.action;
                    // Arrive
                    this.action = this.dock(action.dest);
                    // Sell cargo
                    if (action.count > 0) {
                        var _a = __read(this.here.sell(action.item, action.count, this), 3), amt = _a[0], price = _a[1], standing = _a[2];
                        //console.debug(`agent: sold ${action.count} units of ${action.item} for ${util.csn(price)} on ${action.dest}`);
                    }
                }
                return true;
            }
            return false;
        };
        Agent.prototype.profitableRoutes = function () {
            return __awaiter(this, void 0, void 0, function () {
                var e_2, _a, e_3, _b, routes, game, here, cargoSpace, navComp, _c, _d, item, stock, buyPrice, canBuy, _e, _f, dest, sellPrice, profitPerUnit, transit, fuelPrice, fuelCost, grossProfit, netProfit, e_3_1, e_2_1;
                return __generator(this, function (_g) {
                    switch (_g.label) {
                        case 0:
                            routes = [];
                            if (!isDocked(this.action)) return [3 /*break*/, 14];
                            game = window.game;
                            here = this.here;
                            cargoSpace = this.ship.cargoLeft;
                            navComp = new navcomp_1.NavComp(this, this.here.body);
                            navComp.dt = 10;
                            _g.label = 1;
                        case 1:
                            _g.trys.push([1, 12, 13, 14]);
                            _c = __values(t.resources), _d = _c.next();
                            _g.label = 2;
                        case 2:
                            if (!!_d.done) return [3 /*break*/, 11];
                            item = _d.value;
                            stock = here.getStock(item);
                            buyPrice = here.buyPrice(item, this);
                            canBuy = Math.min(stock, cargoSpace, Math.floor(this.money / buyPrice));
                            if (canBuy == 0) {
                                return [3 /*break*/, 10];
                            }
                            _g.label = 3;
                        case 3:
                            _g.trys.push([3, 8, 9, 10]);
                            _e = __values(t.bodies), _f = _e.next();
                            _g.label = 4;
                        case 4:
                            if (!!_f.done) return [3 /*break*/, 7];
                            dest = _f.value;
                            if (game.planets[dest].hasTradeBan)
                                return [3 /*break*/, 6];
                            sellPrice = game.planets[dest].sellPrice(item);
                            profitPerUnit = sellPrice - buyPrice;
                            if (profitPerUnit <= 0) {
                                return [3 /*break*/, 6];
                            }
                            return [4 /*yield*/, navComp.guestimate(dest)];
                        case 5:
                            transit = _g.sent();
                            if (transit == undefined) {
                                return [3 /*break*/, 6];
                            }
                            fuelPrice = game.planets[dest].buyPrice('fuel', this);
                            fuelCost = transit.fuel * fuelPrice;
                            grossProfit = profitPerUnit * canBuy;
                            netProfit = (grossProfit - fuelCost) / transit.turns;
                            if (netProfit >= data_1.default.min_agent_profit) {
                                routes.push({
                                    action: 'route',
                                    dest: dest,
                                    item: item,
                                    count: canBuy,
                                    profit: netProfit,
                                    transit: transit,
                                });
                            }
                            _g.label = 6;
                        case 6:
                            _f = _e.next();
                            return [3 /*break*/, 4];
                        case 7: return [3 /*break*/, 10];
                        case 8:
                            e_3_1 = _g.sent();
                            e_3 = { error: e_3_1 };
                            return [3 /*break*/, 10];
                        case 9:
                            try {
                                if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                            }
                            finally { if (e_3) throw e_3.error; }
                            return [7 /*endfinally*/];
                        case 10:
                            _d = _c.next();
                            return [3 /*break*/, 2];
                        case 11: return [3 /*break*/, 14];
                        case 12:
                            e_2_1 = _g.sent();
                            e_2 = { error: e_2_1 };
                            return [3 /*break*/, 14];
                        case 13:
                            try {
                                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                            }
                            finally { if (e_2) throw e_2.error; }
                            return [7 /*endfinally*/];
                        case 14: return [2 /*return*/, routes.sort(function (a, b) { return a.profit < b.profit ? 1 : -1; })];
                    }
                });
            });
        };
        Agent.prototype.findAlternateMarket = function () {
            return __awaiter(this, void 0, void 0, function () {
                var e_4, _a, navComp, best, _b, _c, dest, transit, e_4_1;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            navComp = new navcomp_1.NavComp(this, this.here.body);
                            navComp.dt = 10;
                            _d.label = 1;
                        case 1:
                            _d.trys.push([1, 6, 7, 8]);
                            _b = __values(t.bodies), _c = _b.next();
                            _d.label = 2;
                        case 2:
                            if (!!_c.done) return [3 /*break*/, 5];
                            dest = _c.value;
                            return [4 /*yield*/, navComp.guestimate(dest)];
                        case 3:
                            transit = _d.sent();
                            if (transit == undefined)
                                return [3 /*break*/, 4];
                            if (best != undefined && best.turns > transit.turns) {
                                best = transit;
                            }
                            _d.label = 4;
                        case 4:
                            _c = _b.next();
                            return [3 /*break*/, 2];
                        case 5: return [3 /*break*/, 8];
                        case 6:
                            e_4_1 = _d.sent();
                            e_4 = { error: e_4_1 };
                            return [3 /*break*/, 8];
                        case 7:
                            try {
                                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                            }
                            finally { if (e_4) throw e_4.error; }
                            return [7 /*endfinally*/];
                        case 8: return [2 /*return*/, best];
                    }
                });
            });
        };
        return Agent;
    }(person_1.Person));
    exports.Agent = Agent;
});
