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
define(["require", "exports", "./data", "./system", "./person", "./planet", "./agent", "./conflict", "./events", "./common", "./util"], function (require, exports, data_1, system_1, person_1, planet_1, agent_1, conflict_1, events_1, t, util) {
    "use strict";
    data_1 = __importDefault(data_1);
    system_1 = __importDefault(system_1);
    t = __importStar(t);
    util = __importStar(util);
    ;
    const DefaultOptions = {
        hideOrbitPaths: true,
    };
    ;
    const planets = {};
    class Game {
        constructor() {
            this.turns = 0;
            this.date = new Date(data_1.default.start_date);
            this._player = null;
            this.locus = null;
            this.page = 'summary';
            this.frozen = false;
            this.agents = [];
            this.conflicts = {};
            this.notifications = [];
            this.options = DefaultOptions;
            this.reset_date();
        }
        init() {
            const saved = window.localStorage.getItem('game');
            const init = saved == null ? null : JSON.parse(saved);
            if (init) {
                try {
                    this.turns = init.turns;
                    this.locus = init.locus;
                    this.options = init.options || DefaultOptions;
                    this._player = new person_1.Person(init.player);
                    this.date.setHours(this.date.getHours() + (this.turns * data_1.default.hours_per_turn));
                    console.log('setting system date', this.date);
                    this.build_planets(init.planets);
                    this.build_agents(init.agents);
                    this.build_conflicts(init.conflicts);
                }
                catch (e) {
                    console.warn('initialization error:', e);
                    this.locus = null;
                    this.turns = 0;
                    this.options = DefaultOptions;
                    this._player = null;
                    this.build_planets();
                    this.build_agents();
                    this.build_conflicts();
                }
            }
            else {
                this.options = DefaultOptions;
                this.build_planets();
                this.build_agents();
            }
            events_1.trigger(new events_1.GameLoaded);
        }
        get planets() {
            return planets;
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
            date.setDate(date.getDate() - data_1.default.initial_days);
            return date;
        }
        reset_date() {
            this.date = this.start_date();
            console.log('resetting system date', this.date);
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
            for (const body of t.bodies) {
                if (init && init[body]) {
                    planets[body] = new planet_1.Planet(body, init[body]);
                }
                else {
                    planets[body] = new planet_1.Planet(body);
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
                    const faction = util.oneOf(t.factions);
                    const body = data_1.default.factions[faction].capital;
                    const agent = new agent_1.Agent({
                        name: 'Merchant from ' + data_1.default.bodies[body].name,
                        ship: { type: 'schooner' },
                        faction_name: faction,
                        home: body,
                        money: 1000,
                        standing: data_1.default.factions[faction].standing,
                    });
                    this.agents.push(agent);
                }
            }
        }
        build_conflicts(init) {
            this.conflicts = {};
            if (init != undefined) {
                for (const c of Object.keys(init)) {
                    this.conflicts[c] = new conflict_1.Blockade(init[c]);
                }
            }
        }
        new_game(player, home) {
            window.localStorage.removeItem('game');
            this._player = player;
            this.locus = home;
            this.turns = 0;
            this.page = 'summary';
            this.reset_date();
            this.build_planets();
            this.build_agents();
            this.build_conflicts();
            this.save_game();
        }
        save_game() {
            const data = {
                turns: this.turns,
                locus: this.locus,
                player: this._player,
                agents: this.agents,
                planets: this.planets,
                conflicts: this.conflicts,
                options: this.options,
            };
            window.localStorage.setItem('game', JSON.stringify(data));
        }
        delete_game() {
            window.localStorage.removeItem('game');
        }
        get is_starting() {
            return this.turns < (data_1.default.initial_days * data_1.default.turns_per_day);
        }
        get in_transit() {
            return this.frozen
                && this.transit_plan != undefined;
        }
        turn(n = 1, no_save = false) {
            for (let i = 0; i < n; ++i) {
                ++this.turns;
                // Update game and system date
                this.date.setHours(this.date.getHours() + data_1.default.hours_per_turn);
                const isNewDay = this.turns % data_1.default.turns_per_day == 0;
                if (this.in_transit) {
                    system_1.default.reset_orbit_cache();
                }
                else {
                    // Start new conflicts
                    if (this.turns % (data_1.default.turns_per_day * 3) == 0) {
                        this.start_conflicts();
                    }
                    // Remove finished conflicts
                    this.finish_conflicts();
                    // Dispatch events
                    events_1.trigger(new events_1.GameTurn({ turn: this.turns, isNewDay: isNewDay }));
                    if (isNewDay) {
                        events_1.trigger(new events_1.NewDay({ turn: this.turns, isNewDay: isNewDay }));
                    }
                }
            }
            if (!no_save) {
                this.save_game();
            }
        }
        freeze() {
            this.frozen_date = this.date.getTime();
            this.frozen = true;
        }
        unfreeze() {
            if (this.frozen_date) {
                const end = this.date.getTime();
                const turns = Math.abs(end - this.frozen_date) / 3600000 / data_1.default.hours_per_turn;
                this.turns -= turns;
                this.date = new Date();
                this.date.setTime(this.frozen_date);
                system_1.default.reset_orbit_cache();
                this.frozen_date = undefined;
                this.frozen = false;
                setTimeout(() => this.turn(turns), 200);
            }
        }
        set_transit_plan(transit_plan) {
            this.transit_plan = transit_plan;
        }
        arrive() {
            if (this.transit_plan) {
                console.log('arrived:', this.transit_plan.dest);
                this.locus = this.transit_plan.dest;
                this.transit_plan = undefined;
            }
            if (this.locus) { // game has started
                events_1.trigger(new events_1.Arrived({ dest: this.locus }));
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
        notify(msg, long = false) {
            if (!this.is_starting) {
                const dismiss = long ? Game.NOTIFY_LONG : Game.NOTIFY_SHORT;
                this.notifications.push([msg, dismiss]);
            }
        }
        dismiss(msg) {
            this.notifications = this.notifications.filter(n => n[0] != msg);
        }
        /*
         * Conflicts
         */
        start_conflicts() {
            if (Object.keys(this.conflicts).length >= 2)
                return;
            // TODO notifications when conflicts start
            for (const pro of t.factions) {
                for (const target of t.factions) {
                    // Blockades
                    const blockade = new conflict_1.Blockade({ proponent: pro, target: target });
                    if (this.conflicts[blockade.key] == undefined && blockade.chance()) {
                        this.conflicts[blockade.key] = blockade;
                        const turns = Math.ceil(util.getRandomNum(data_1.default.turns_per_day * 7, data_1.default.turns_per_day * 60));
                        blockade.start(turns);
                        this.notify(`${pro} has declared a ${blockade.name} against ${target}`);
                    }
                }
            }
        }
        finish_conflicts() {
            for (const k of Object.keys(this.conflicts)) {
                if (this.conflicts[k].is_over) {
                    delete this.conflicts[k];
                }
            }
        }
        get_conflicts(opt) {
            return Object.values(this.conflicts).filter(c => {
                if (opt) {
                    if (opt.target && c.target != opt.target)
                        return false;
                    if (opt.proponent && c.proponent != opt.proponent)
                        return false;
                    if (opt.name && c.name != opt.name)
                        return false;
                }
                return true;
            });
        }
    }
    Game.NOTIFY_SHORT = 3;
    Game.NOTIFY_LONG = 8;
    ;
    console.log('Spacer is starting');
    const game = new Game;
    window.game = game;
    window.game.init();
    window.game.arrive();
    return game;
});
