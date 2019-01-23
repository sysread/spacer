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
define(["require", "exports", "./data", "./system", "./person", "./planet", "./agent", "./events", "./common", "./util"], function (require, exports, data_1, system_1, person_1, planet_1, agent_1, events_1, t, util) {
    "use strict";
    data_1 = __importDefault(data_1);
    system_1 = __importDefault(system_1);
    t = __importStar(t);
    util = __importStar(util);
    ;
    var planets = {};
    var Game = /** @class */ (function () {
        function Game() {
            this.turns = 0;
            this.date = new Date(data_1.default.start_date);
            this._player = null;
            this.locus = null;
            this.page = null;
            this.frozen = false;
            this.agents = [];
            this.reset_date();
            this.turnEvent = new CustomEvent('turn', {
                detail: {
                    get turn() { return game.turns; },
                    get isNewDay() { return game.turns % data_1.default.turns_per_day == 0; },
                },
            });
            this.dayEvent = new CustomEvent('day', {
                detail: {
                    get turn() { return game.turns; },
                    get isNewDay() { return game.turns % data_1.default.turns_per_day == 0; },
                },
            });
        }
        Game.prototype.init = function () {
            var saved = window.localStorage.getItem('game');
            var init = saved == null ? null : JSON.parse(saved);
            if (init) {
                try {
                    this.turns = init.turns;
                    this.locus = init.locus;
                    this.page = init.page;
                    this._player = new person_1.Person(init._player);
                    this.date.setHours(this.date.getHours() + (this.turns * data_1.default.hours_per_turn));
                    console.log('setting system date', this.date);
                    system_1.default.set_date(this.strdate());
                    this.build_planets(init.planets);
                    this.build_agents(init.agents);
                }
                catch (e) {
                    console.warn('initialization error:', e);
                    this.locus = null;
                    this.turns = 0;
                    this._player = null;
                    this.build_planets();
                    this.build_agents();
                }
            }
            else {
                this.build_planets();
                this.build_agents();
            }
        };
        Game.prototype.onTurn = function (cb) {
            window.addEventListener('turn', cb);
        };
        Game.prototype.onDay = function (cb) {
            window.addEventListener('day', cb);
        };
        Object.defineProperty(Game.prototype, "planets", {
            get: function () {
                return planets;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Game.prototype, "player", {
            get: function () {
                if (!this._player) {
                    throw new Error('player is not available before the game has started');
                }
                return this._player;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Game.prototype, "here", {
            get: function () {
                if (!this.locus) {
                    throw new Error('here is not available before the game has started');
                }
                return this.planets[this.locus];
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
        Game.prototype.start_date = function () {
            var date = new Date(data_1.default.start_date);
            date.setDate(this.date.getDate() - data_1.default.initial_days);
            return date;
        };
        Game.prototype.reset_date = function () {
            this.date = this.start_date();
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
            try {
                for (var _b = __values(t.bodies), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var body = _c.value;
                    if (init && init[body]) {
                        planets[body] = new planet_1.Planet(body, init[body]);
                    }
                    else {
                        planets[body] = new planet_1.Planet(body);
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
            var e_2, _a;
            this.agents = [];
            if (init && init.length > 0 && init.length == data_1.default.max_agents) {
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
                    var faction = util.oneOf(t.factions);
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
        };
        Game.prototype.new_game = function (player, home) {
            var e_3, _a;
            window.localStorage.removeItem('game');
            this._player = player;
            this.locus = home;
            //this.turns = NewGameData.turns;
            //this.page = NewGameData.page;
            this.turns = 0;
            this.page = 'summary';
            this.date.setHours(this.date.getHours() + (this.turns * data_1.default.hours_per_turn));
            console.log('setting system date', this.date);
            system_1.default.set_date(this.strdate());
            //this.build_planets(NewGameData.planets);
            this.build_planets();
            this.build_agents(); // agents not part of initial data set
            try {
                // Work-around for chicken and egg problem with initializing contracts for
                // newly created planets when doing so relies on the existence of
                // window.game and window.game.player.
                for (var _b = __values(Object.values(this.planets)), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var p = _c.value;
                    p.refreshContracts();
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_3) throw e_3.error; }
            }
            this.save_game();
        };
        Game.prototype.save_game = function () {
            window.localStorage.setItem('game', JSON.stringify(this));
        };
        Game.prototype.delete_game = function () {
            window.localStorage.removeItem('game');
        };
        Game.prototype.build_new_game_data = function () {
            var e_4, _a;
            this.turns = 0;
            this.reset_date();
            this.build_planets();
            this.build_agents();
            this.turn(data_1.default.initial_days * data_1.default.turns_per_day, true);
            // clear bits we do not wish to include in the initial data set
            this._player = null;
            try {
                for (var _b = __values(Object.values(this.planets)), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var p = _c.value;
                    p.contracts = [];
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_4) throw e_4.error; }
            }
            return JSON.stringify(this);
        };
        Game.prototype.turn = function (n, no_save) {
            if (n === void 0) { n = 1; }
            if (no_save === void 0) { no_save = false; }
            for (var i = 0; i < n; ++i) {
                ++this.turns;
                this.date.setHours(this.date.getHours() + data_1.default.hours_per_turn);
                system_1.default.set_date(this.strdate());
                events_1.Events.signal({ type: events_1.Ev.Turn, turn: this.turns });
                window.dispatchEvent(this.turnEvent);
                if (this.turns % data_1.default.turns_per_day)
                    window.dispatchEvent(this.dayEvent);
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
            if (this.transit_plan) {
                this.locus = this.transit_plan.dest;
                this.transit_plan = undefined;
            }
            if (this.locus) {
                events_1.Events.signal({ type: events_1.Ev.Arrived, dest: this.locus });
            }
        };
        Game.prototype.trade_routes = function () {
            var e_5, _a, e_6, _b;
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
                    catch (e_6_1) { e_6 = { error: e_6_1 }; }
                    finally {
                        try {
                            if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                        }
                        finally { if (e_6) throw e_6.error; }
                    }
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_5) throw e_5.error; }
            }
            return trade;
        };
        return Game;
    }());
    ;
    console.log('Spacer is starting');
    var game = new Game;
    window.game = game;
    window.game.init();
    window.game.arrive();
    return game;
});
