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
define(["require", "exports", "./data", "./system", "./data/initial", "./person", "./planet", "./agent", "./events", "./common"], function (require, exports, data_1, system_1, initial_1, person_1, planet_1, agent_1, events_1, t) {
    "use strict";
    data_1 = __importDefault(data_1);
    system_1 = __importDefault(system_1);
    t = __importStar(t);
    ;
    class Game {
        constructor() {
            this.turns = 0;
            this.date = new Date(data_1.default.start_date);
            this._player = null;
            this.locus = null;
            this.planets = {};
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
        }
        init() {
            const saved = window.localStorage.getItem('game');
            const init = saved == null ? null : JSON.parse(saved);
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
        }
        onTurn(cb) {
            window.addEventListener('turn', cb);
        }
        get player() {
            if (!this._player) {
                throw new Error('player is not available before the game has started');
            }
            return this._player;
        }
        get here() {
            if (!this.locus) {
                throw new Error('here is not available before the game has started');
            }
            return this.planets[this.locus];
        }
        get is_frozen() {
            return this.frozen;
        }
        start_date() {
            const date = new Date(data_1.default.start_date);
            date.setDate(this.date.getDate() - data_1.default.initial_days);
            return date;
        }
        reset_date() {
            this.date = this.start_date();
            console.log('resetting system date', this.date);
            system_1.default.set_date(this.strdate());
        }
        strdate(date) {
            date = date || this.date;
            let y = date.getFullYear();
            let m = date.getMonth() + 1;
            let d = date.getDate();
            return [y, m < 10 ? `0${m}` : m, d < 10 ? `0${d}` : d].join('-');
        }
        status_date(date) {
            return this.strdate(date).replace(/-/g, '.');
        }
        build_planets(init) {
            this.planets = {};
            for (const body of t.bodies) {
                if (init && init[body]) {
                    this.planets[body] = new planet_1.Planet(body, init[body]);
                }
                else {
                    this.planets[body] = new planet_1.Planet(body);
                }
            }
        }
        build_agents(init) {
            this.agents = [];
            if (init && init.length > 0 && init.length == data_1.default.max_agents) {
                for (const opt of init) {
                    this.agents.push(new agent_1.Agent(opt));
                }
            }
            else {
                for (let i = 0; i < data_1.default.max_agents; ++i) {
                    for (const faction of t.factions) {
                        const body = data_1.default.factions[faction].capital;
                        const agent = new agent_1.Agent({
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
            }
        }
        new_game(player, home) {
            window.localStorage.removeItem('game');
            this._player = player;
            this.locus = home;
            this.turns = initial_1.NewGameData.turns;
            this.page = initial_1.NewGameData.page;
            this.date.setHours(this.date.getHours() + (this.turns * data_1.default.hours_per_turn));
            console.log('setting system date', this.date);
            system_1.default.set_date(this.strdate());
            this.build_planets(initial_1.NewGameData.planets);
            this.build_agents(); // agents not part of initial data set
            // Work-around for chicken and egg problem with initializing contracts for
            // newly created planets when doing so relies on the existence of
            // window.game and window.game.player.
            for (const p of Object.values(this.planets)) {
                p.refreshContracts();
            }
            this.save_game();
        }
        save_game() {
            window.localStorage.setItem('game', JSON.stringify(this));
        }
        delete_game() {
            window.localStorage.removeItem('game');
        }
        build_new_game_data() {
            this.turns = 0;
            this.reset_date();
            this.build_planets();
            this.build_agents();
            this.turn(data_1.default.initial_days * data_1.default.turns_per_day, true);
            // clear bits we do not wish to include in the initial data set
            this._player = null;
            for (const p of Object.values(this.planets)) {
                p.contracts = [];
            }
            return JSON.stringify(this);
        }
        turn(n = 1, no_save = false) {
            for (let i = 0; i < n; ++i) {
                ++this.turns;
                this.date.setHours(this.date.getHours() + data_1.default.hours_per_turn);
                system_1.default.set_date(this.strdate());
                events_1.Events.signal({ type: events_1.Ev.Turn, turn: this.turns });
                window.dispatchEvent(this.turnEvent);
            }
            if (!no_save) {
                this.save_game();
            }
        }
        freeze() {
            this.frozen = true;
        }
        unfreeze() {
            this.frozen = false;
        }
        set_transit_plan(transit_plan) {
            this.transit_plan = transit_plan;
        }
        arrive() {
            if (this.transit_plan) {
                this.locus = this.transit_plan.dest;
                this.transit_plan = undefined;
            }
            if (this.locus) {
                events_1.Events.signal({ type: events_1.Ev.Arrived, dest: this.locus });
            }
        }
        trade_routes() {
            const trade = {};
            for (const planet of Object.values(this.planets)) {
                for (const task of planet.queue) {
                    if (planet_1.isImportTask(task)) {
                        const item = task.item;
                        const to = task.to;
                        const from = task.from;
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
            return trade;
        }
    }
    ;
    console.log('Spacer is starting');
    var game = new Game;
    window.game = game;
    window.game.init();
    window.game.arrive();
    return game;
});
