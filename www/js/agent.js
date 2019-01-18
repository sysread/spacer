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
        return typeof action == 'string';
    }
    function isJob(action) {
        return action.task != undefined;
    }
    function isRoute(action) {
        return action.transit != undefined;
    }
    var Agent = /** @class */ (function (_super) {
        __extends(Agent, _super);
        function Agent(opt) {
            var _this = _super.call(this, opt) || this;
            var action = opt.action;
            if (action != undefined) {
                if (isRoute(action)) {
                    _this.action = {
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
                _this.action = _this.home;
            }
            return _this;
        }
        Agent.prototype.turn = function () {
            if (isDocked(this.action)) {
                // fully refueled!
                if (this.refuel()) {
                    // select a route
                    var routes = this.profitableRoutes();
                    if (routes.length > 0) {
                        // buy the goods to transport
                        var here = window.game.planets[this.action];
                        var _a = routes[0], item = _a.item, count = _a.count;
                        var _b = __read(here.buy(item, count, this), 2), bought = _b[0], price = _b[1];
                        if (bought != routes[0].count) {
                            throw new Error(bought + " != " + count);
                        }
                        // switch to the new action
                        this.action = routes[0];
                        return;
                    }
                }
                // still here? then find a job and wait for profitability to happen
                this.findWork();
            }
            if (isJob(this.action)) {
                this.workTurn();
                return;
            }
            if (isRoute(this.action)) {
                this.transitTurn();
                return;
            }
        };
        // Returns true if the ship was fully refueled
        Agent.prototype.refuel = function () {
            if (isDocked(this.action)) {
                var planet = window.game.planets[this.action];
                var fuelNeeded = this.ship.refuelUnits();
                var price = planet.buyPrice('fuel', this);
                if (fuelNeeded > 0 && this.money > (fuelNeeded * price)) {
                    var _a = __read(planet.buy('fuel', fuelNeeded), 2), bought = _a[0], paid = _a[1];
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
                var loc = window.game.planets[this.action];
                var job = util.oneOf(loc.work_tasks);
                if (job) {
                    var days = 3;
                    var turns = days * data_1.default.turns_per_day;
                    this.action = {
                        location: this.action,
                        task: job,
                        days: days,
                        turns: turns,
                    };
                }
            }
        };
        // Returns true if any action was performed
        // TODO sell acquired resources to market
        Agent.prototype.workTurn = function () {
            var e_1, _a;
            if (isJob(this.action)) {
                if (--this.action.turns == 0) {
                    var planet = window.game.planets[this.action.location];
                    var result = planet.work(this, this.action.task, this.action.days);
                    // Credit agent for the word completed
                    this.credit(result.pay);
                    try {
                        // Sell any harvested resources to the market
                        for (var _b = __values(result.items.keys()), _c = _b.next(); !_c.done; _c = _b.next()) {
                            var item = _c.value;
                            var _d = __read(planet.sell(item, result.items.count(item)), 3), amount = _d[0], price = _d[1], standing = _d[2];
                            this.incStanding(planet.faction.abbrev, standing);
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
                    // Restore "docked" action
                    this.action = this.action.location;
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
                    this.action = action.dest;
                    // Sell cargo
                    var planet = window.game.planets[this.action];
                    var result = planet.sell(action.item, action.count, this);
                    //console.log(`${this.name} sold ${action.count} units of ${action.item} to ${action.dest}; money now ${this.money}`);
                }
                return true;
            }
            return false;
        };
        Agent.prototype.profitableRoutes = function () {
            var e_2, _a, e_3, _b;
            var routes = [];
            if (isDocked(this.action)) {
                var game = window.game;
                var here = game.planets[this.action];
                var navComp = new navcomp_1.NavComp(this, here.body);
                var cargoSpace = this.ship.cargoLeft;
                try {
                    for (var _c = __values(t.resources), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var item = _d.value;
                        var stock = here.getStock(item);
                        var buyPrice = here.buyPrice(item, this);
                        var canBuy = Math.min(stock, cargoSpace, Math.floor(this.money / buyPrice));
                        if (canBuy == 0) {
                            continue;
                        }
                        try {
                            for (var _e = __values(t.bodies), _f = _e.next(); !_f.done; _f = _e.next()) {
                                var dest = _f.value;
                                var sellPrice = game.planets[dest].sellPrice(item);
                                var fuelPrice = game.planets[dest].buyPrice('fuel', this);
                                var profitPerUnit = sellPrice - buyPrice;
                                if (profitPerUnit <= 0) {
                                    continue;
                                }
                                var transit = navComp.getFastestTransitTo(dest);
                                if (transit == undefined) {
                                    continue;
                                }
                                var fuelCost = transit.fuel * fuelPrice;
                                var profit = (profitPerUnit * canBuy - fuelCost) / transit.turns;
                                if (profit > 0) {
                                    routes.push({
                                        dest: dest,
                                        item: item,
                                        count: canBuy,
                                        profit: profit,
                                        transit: transit,
                                    });
                                }
                            }
                        }
                        catch (e_3_1) { e_3 = { error: e_3_1 }; }
                        finally {
                            try {
                                if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                            }
                            finally { if (e_3) throw e_3.error; }
                        }
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
            return routes.sort(function (a, b) { return a.profit < b.profit ? 1 : -1; });
        };
        return Agent;
    }(person_1.Person));
    exports.Agent = Agent;
});