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
define(["require", "exports", "./data", "./system", "./person", "./planet", "./agent", "./mission", "./common", "./util"], function (require, exports, data_1, system_1, person_1, planet_1, agent_1, mission_1, t, util) {
    "use strict";
    data_1 = __importDefault(data_1);
    system_1 = __importDefault(system_1);
    t = __importStar(t);
    util = __importStar(util);
    ;
    var Game = /** @class */ (function () {
        function Game() {
            this.turns = 0;
            this.date = new Date(data_1.default.start_date);
            this.player = null;
            this.locus = null;
            this.planets = {};
            this.page = null;
            this.frozen = false;
            this.agents = [];
            var saved = window.localStorage.getItem('game');
            var init = saved == null ? null : JSON.parse(saved);
            if (init) {
                try {
                    this.turns = init.turns;
                    this.locus = init.locus;
                    this.page = init.page;
                    this.player = new person_1.Person(init.player);
                    this.date.setHours(this.date.getHours() + (this.turns * data_1.default.hours_per_turn));
                    console.log('setting system date', this.date);
                    system_1.default.set_date(this.strdate());
                    this.build_planets(init.planets);
                    this.build_agents(init.agents);
                }
                catch (e) {
                    console.warn('initialization error; clearing data. error was:', e);
                    this.locus = null;
                    this.turns = 0;
                    this.player = null;
                    this.build_planets();
                    this.build_agents();
                    this.reset_date();
                }
            }
            else {
                this.locus = null;
                this.turns = 0;
                this.player = null;
                this.build_planets();
                this.build_agents();
                this.reset_date();
            }
        }
        Object.defineProperty(Game.prototype, "here", {
            get: function () {
                if (this.locus != null) {
                    return this.planets[this.locus];
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Game.prototype, "is_frozen", {
            get: function () {
                return this.frozen;
            },
            enumerable: true,
            configurable: true
        });
        Game.prototype.reset_date = function () {
            this.date = new Date(data_1.default.start_date);
            this.date.setDate(this.date.getDate() - data_1.default.initial_days);
            console.log('resetting system date', this.date);
            system_1.default.set_date(this.strdate());
        };
        Game.prototype.strdate = function (date) {
            date = date || this.date;
            var y = date.getFullYear();
            var m = date.getMonth() + 1;
            var d = date.getDate();
            return [y, m < 10 ? "0" + m : m, d < 10 ? "0" + d : d].join('-');
        };
        Game.prototype.status_date = function (date) {
            return this.strdate(date).replace(/-/g, '.');
        };
        Game.prototype.build_planets = function (init) {
            var e_1, _a;
            this.planets = {};
            try {
                for (var _b = __values(t.bodies), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var body = _c.value;
                    if (init && init[body]) {
                        this.planets[body] = new planet_1.Planet(body, init[body]);
                    }
                    else {
                        this.planets[body] = new planet_1.Planet(body);
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
        };
        Game.prototype.build_agents = function (init) {
            var e_2, _a, e_3, _b;
            this.agents = [];
            if (init && init.length > 0) {
                try {
                    for (var init_1 = __values(init), init_1_1 = init_1.next(); !init_1_1.done; init_1_1 = init_1.next()) {
                        var opt = init_1_1.value;
                        this.agents.push(new agent_1.Agent(opt));
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (init_1_1 && !init_1_1.done && (_a = init_1.return)) _a.call(init_1);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
            else {
                for (var i = 0; i < data_1.default.max_agents; ++i) {
                    try {
                        for (var _c = __values(t.factions), _d = _c.next(); !_d.done; _d = _c.next()) {
                            var faction = _d.value;
                            var body = data_1.default.factions[faction].capital;
                            var agent = new agent_1.Agent({
                                name: 'Merchant from ' + data_1.default.bodies[body].name,
                                ship: { type: 'schooner' },
                                faction: faction,
                                home: body,
                                money: 1000,
                                standing: data_1.default.factions[faction].standing,
                            });
                            this.agents.push(agent);
                        }
                    }
                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                    finally {
                        try {
                            if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
                        }
                        finally { if (e_3) throw e_3.error; }
                    }
                }
            }
        };
        Game.prototype.new_game = function (player, home) {
            window.localStorage.removeItem('game');
            this.player = player;
            this.locus = home;
            this.turns = 0;
            this.reset_date();
            this.build_planets();
        };
        Game.prototype.save_game = function () {
            window.localStorage.setItem('game', JSON.stringify(this));
        };
        Game.prototype.delete_game = function () {
            window.localStorage.removeItem('game');
        };
        Game.prototype.turn = function (n, no_save) {
            if (n === void 0) { n = 1; }
            if (no_save === void 0) { no_save = false; }
            var e_4, _a, e_5, _b;
            for (var i = 0; i < n; ++i) {
                ++this.turns;
                this.date.setHours(this.date.getHours() + data_1.default.hours_per_turn);
                system_1.default.set_date(this.strdate());
                try {
                    for (var _c = __values(util.shuffle(Object.values(this.planets))), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var p = _d.value;
                        p.turn();
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                    }
                    finally { if (e_4) throw e_4.error; }
                }
                if (this.turns >= data_1.default.turns_per_day * data_1.default.initial_days) {
                    try {
                        for (var _e = __values(this.agents), _f = _e.next(); !_f.done; _f = _e.next()) {
                            var a = _f.value;
                            a.turn();
                        }
                    }
                    catch (e_5_1) { e_5 = { error: e_5_1 }; }
                    finally {
                        try {
                            if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                        }
                        finally { if (e_5) throw e_5.error; }
                    }
                }
                mission_1.Events.Turn(this.turns);
            }
            if (!no_save) {
                this.save_game();
            }
        };
        Game.prototype.freeze = function () {
            this.frozen = true;
        };
        Game.prototype.unfreeze = function () {
            this.frozen = false;
        };
        Game.prototype.set_transit_plan = function (transit_plan) {
            this.transit_plan = transit_plan;
        };
        Game.prototype.arrive = function () {
            if (!this.transit_plan)
                return;
            this.locus = this.transit_plan.dest;
            this.transit_plan = undefined;
            mission_1.Events.Arrived(this.locus);
        };
        Game.prototype.trade_routes = function () {
            var e_6, _a, e_7, _b;
            var trade = {};
            try {
                for (var _c = __values(Object.values(this.planets)), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var planet = _d.value;
                    try {
                        for (var _e = __values(planet.queue), _f = _e.next(); !_f.done; _f = _e.next()) {
                            var task = _f.value;
                            if (planet_1.isImportTask(task)) {
                                var item = task.item;
                                var to = task.to;
                                var from = task.from;
                                if (trade[item] == null) {
                                    trade[item] = {};
                                }
                                if (trade[item][to] == null) {
                                    trade[item][to] = {};
                                }
                                if (trade[item][to][from] == null) {
                                    trade[item][to][from] = [];
                                }
                                trade[item][to][from].push({
                                    hours: task.turns * data_1.default.hours_per_turn,
                                    amount: task.count,
                                });
                            }
                        }
                    }
                    catch (e_7_1) { e_7 = { error: e_7_1 }; }
                    finally {
                        try {
                            if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                        }
                        finally { if (e_7) throw e_7.error; }
                    }
                }
            }
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_6) throw e_6.error; }
            }
            return trade;
        };
        return Game;
    }());
    ;
    console.log('Spacer is starting');
    if (!window.game) {
        window.game = new Game;
    }
    return window.game;
});
