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
define(["require", "exports", "./data", "./system", "./physics", "./store", "./history", "./common", "./util", "./resource", "./trait", "./faction", "./condition"], function (require, exports, data_1, system_1, physics_1, store_1, history_1, t, util, resource_1, trait_1, faction_1, condition_1) {
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
            init = init || {};
            /*
             * Physical and faction
             */
            this.body = body;
            this.name = data_1.default.bodies[this.body].name;
            this.size = data_1.default.bodies[this.body].size;
            this.desc = data_1.default.bodies[this.body].desc;
            this.radius = system_1.default.body(this.body).radius;
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
                                        this.work_tasks.push(task);
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
            // Assign directly in constructor rather than in clearMemos for
            // performance reasons. V8's jit will produce more optimized classes by
            // avoiding dynamic assignment in the constructor.
            this._price = {};
            this._cycle = {};
        }
        Object.defineProperty(Planet.prototype, "position", {
            get: function () {
                return system_1.default.position(this.body);
            },
            enumerable: true,
            configurable: true
        });
        Planet.prototype.distance = function (toBody) {
            return system_1.default.distance(this.body, toBody);
        };
        Planet.prototype.hasTrait = function (trait) {
            var e_6, _a;
            try {
                for (var _b = __values(this.traits), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var t_1 = _c.value;
                    if (t_1.name == trait) {
                        return true;
                    }
                }
            }
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_6) throw e_6.error; }
            }
            return false;
        };
        Planet.prototype.hasCondition = function (condition) {
            var e_7, _a;
            try {
                for (var _b = __values(this.conditions), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var c = _c.value;
                    if (c.name == condition) {
                        return true;
                    }
                }
            }
            catch (e_7_1) { e_7 = { error: e_7_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_7) throw e_7.error; }
            }
            return false;
        };
        /*
         * Patrols and inspections
         */
        Planet.prototype.patrolRadius = function () {
            var radius = this.scale(data_1.default.jurisdiction);
            if (this.hasTrait('military')) {
                return radius * 1.3;
            }
            else if (this.hasTrait('military')) {
                return radius * 1.1;
            }
            else {
                return radius;
            }
        };
        Planet.prototype.patrolRate = function (distance) {
            if (distance === void 0) { distance = 0; }
            var rate = this.scale(this.faction.patrol);
            var radius = this.patrolRadius();
            return Math.max(0, rate * Math.pow(radius, 2) / Math.pow(distance, 2));
            /*const invsq = distance > radius
              ? rate * Math.pow(radius, 2) / Math.pow(distance, 2)
              : rate;
        
            return Math.max(0, invsq);*/
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
            var resource = resource_1.resources[item];
            if (!resource_1.isCraft(resource)) {
                throw new Error(item + " is not craftable");
            }
            var rate = data_1.default.craft_fee * this.sellPrice(item);
            var reduction = this.fabricationReductionRate();
            var health = this.fab_health;
            var fee = 5 * rate * count;
            for (var i = 0; i < count && health > 0; ++i) {
                health -= resource.craftTurns * reduction;
                fee -= rate * 4;
            }
            fee -= fee * player.getStandingPriceAdjustment(this.faction.abbrev);
            fee += fee * this.faction.sales_tax;
            return Math.max(1, Math.ceil(fee));
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
            if (this.fab_health < this.max_fab_health / 2) {
                var want = Math.ceil((this.max_fab_health - this.fab_health) / data_1.default.fab_health);
                var _a = __read(this.buy('cybernetics', want), 2), bought = _a[0], price = _a[1];
                this.fab_health += bought * data_1.default.fab_health;
            }
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
            var e_8, _a;
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
                catch (e_8_1) { e_8 = { error: e_8_1 }; }
                finally {
                    try {
                        if (rewards_1_1 && !rewards_1_1.done && (_a = rewards_1.return)) _a.call(rewards_1);
                    }
                    finally { if (e_8) throw e_8.error; }
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
        Planet.prototype.getStock = function (item) { return this.stock.count(item); };
        Planet.prototype.avgProduction = function (item) { return this.getSupply(item) - this.consumption(item); };
        Planet.prototype.netProduction = function (item) { return this.production(item) - this.consumption(item); };
        Planet.prototype.getDemand = function (item) {
            return this.demand.avg(item);
        };
        Planet.prototype.getSupply = function (item) {
            return this.supply.avg(item);
        };
        Planet.prototype.shortageFactor = function (item) {
            return this.isNetExporter(item) ? 1 : 2.5;
        };
        Planet.prototype.hasShortage = function (item) {
            return this.getNeed(item) >= this.shortageFactor(item);
        };
        Planet.prototype.surplusFactor = function (item) {
            return this.isNetExporter(item) ? 0.1 : 0.25;
        };
        Planet.prototype.hasSurplus = function (item) {
            return this.getNeed(item) <= this.surplusFactor(item);
        };
        Planet.prototype.hasSuperSurplus = function (item) {
            return this.getNeed(item) <= this.surplusFactor(item) / 2;
        };
        Planet.prototype.production = function (item) {
            var e_9, _a;
            var amount = this.produces.get(item) / data_1.default.turns_per_day;
            try {
                for (var _b = __values(this.conditions), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var condition = _c.value;
                    amount += this.scale(condition.produces[item] || 0);
                }
            }
            catch (e_9_1) { e_9 = { error: e_9_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_9) throw e_9.error; }
            }
            return amount;
        };
        Planet.prototype.consumption = function (item) {
            var e_10, _a;
            var amount = this.consumes.get(item) / data_1.default.turns_per_day;
            try {
                for (var _b = __values(this.conditions), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var condition = _c.value;
                    amount += this.scale(condition.consumes[item] || 0);
                }
            }
            catch (e_10_1) { e_10 = { error: e_10_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_10) throw e_10.error; }
            }
            return amount;
        };
        Planet.prototype.incDemand = function (item, amt) {
            var e_11, _a;
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
                        catch (e_11_1) { e_11 = { error: e_11_1 }; }
                        finally {
                            try {
                                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                            }
                            finally { if (e_11) throw e_11.error; }
                        }
                    }
                }
            }
        };
        Planet.prototype.incSupply = function (item, amount) {
            this.supply.inc(item, amount);
        };
        Planet.prototype.isNetExporter = function (item) {
            var production = this.avgProduction(item);
            var consumption = this.consumption(item);
            return (production - consumption) > this.scale(1);
        };
        Planet.prototype.getNeed = function (item) {
            var d = this.getDemand(item);
            var s = (this.getStock(item) + this.getSupply(item)) / 2;
            var n = d - s;
            if (n === 0) {
                return 1;
            }
            else if (n > 0) {
                return Math.log(1 + n);
            }
            else {
                return d / s;
            }
        };
        /**
         * Returns a price adjustment which accounts for the distance to the nearest
         * net exporter of the item. Returns a decimal percentage where 1.0 means no
         * adjustment.
         */
        Planet.prototype.getAvailabilityMarkup = function (item) {
            var e_12, _a;
            // If this planet is a net exporter of the item, easy access results in a
            // lower price.
            if (this.isNetExporter(item)) {
                return 0.8;
            }
            // Find the nearest exporter of the item
            var distance;
            var nearest;
            try {
                for (var _b = __values(t.bodies), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var body = _c.value;
                    if (body == this.body) {
                        continue;
                    }
                    if (!window.game.planets[body].isNetExporter(item)) {
                        continue;
                    }
                    var d = system_1.default.distance(this.body, body);
                    if (distance == undefined || distance > d) {
                        nearest = body;
                        distance = d;
                    }
                }
            }
            catch (e_12_1) { e_12 = { error: e_12_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_12) throw e_12.error; }
            }
            if (distance != undefined && nearest != undefined) {
                var markup = 1;
                // Competing market malus
                if (data_1.default.bodies[nearest].faction != data_1.default.bodies[this.body].faction) {
                    markup += 0.1;
                }
                // Distance malus: compound 10% markup for each AU
                var au = Math.ceil(distance / physics_1.default.AU);
                for (var i = 0; i < au; ++i) {
                    markup *= 1.05;
                }
                return markup;
            }
            else {
                return 1;
            }
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
            var e_13, _a;
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
            catch (e_13_1) { e_13 = { error: e_13_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_13) throw e_13.error; }
            }
            return markup;
        };
        Planet.prototype.price = function (item) {
            var e_14, _a;
            if (!this._cycle[item] || window.game.turns % this._cycle[item] == 0) {
                delete this._price[item];
                this._cycle[item] = util.getRandomInt(3, 12) * data_1.default.turns_per_day;
            }
            if (this._price[item] == undefined) {
                var value = resource_1.resources[item].value;
                var need = this.getNeed(item);
                var price = 0;
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
                    for (var _b = __values(this.traits), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var trait = _c.value;
                        price -= price * (trait.price[item] || 0);
                    }
                }
                catch (e_14_1) { e_14 = { error: e_14_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_14) throw e_14.error; }
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
                price *= this.getAvailabilityMarkup(item);
                // Add a bit of "unaccounted for local influences"
                price = util.fuzz(price, 0.2);
                this._price[item] = util.R(price);
            }
            return this._price[item];
        };
        Planet.prototype.sellPrice = function (item) {
            return this.price(item);
        };
        Planet.prototype.buyPrice = function (item, player) {
            var price = this.price(item) * (1 + this.faction.sales_tax);
            return player
                ? Math.ceil(price * (1 - player.getStandingPriceAdjustment(this.faction.abbrev)))
                : Math.ceil(price);
        };
        Planet.prototype.buy = function (item, amount, player) {
            var bought = Math.min(amount, this.getStock(item));
            var price = bought * this.buyPrice(item, player);
            this.incDemand(item, amount);
            this.stock.dec(item, bought);
            if (player && bought) {
                player.debit(price);
                player.ship.loadCargo(item, bought);
            }
            return [bought, price];
        };
        Planet.prototype.sell = function (item, amount, player) {
            var hasShortage = this.hasShortage(item);
            var price = amount * this.sellPrice(item);
            this.stock.inc(item, amount);
            var standing = 0;
            if (player) {
                player.ship.unloadCargo(item, amount);
                player.credit(price);
                if (hasShortage && !resource_1.resources[item].contraband) {
                    // Player ended a shortage. Increase their standing with our faction.
                    if (!this.hasShortage(item)) {
                        standing = util.getRandomNum(3, 8);
                        player.incStanding(this.faction.abbrev, standing);
                    }
                    // Player contributed toward ending a shortage. Increase their
                    // standing with our faction slightly.
                    else {
                        standing = util.getRandomNum(1, 3);
                        player.incStanding(this.faction.abbrev, standing);
                    }
                }
            }
            return [amount, price, standing];
        };
        Planet.prototype.schedule = function (task) {
            this.pending.inc(task.item, task.count);
            this.queue.push(task);
        };
        Planet.prototype.processQueue = function () {
            var e_15, _a;
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
            catch (e_15_1) { e_15 = { error: e_15_1 }; }
            finally {
                try {
                    if (queue_1_1 && !queue_1_1.done && (_a = queue_1.return)) _a.call(queue_1);
                }
                finally { if (e_15) throw e_15.error; }
            }
        };
        Planet.prototype.neededResourceAmount = function (item) {
            var amount = this.getDemand(item.name) - this.getStock(item.name) - this.pending.get(item.name);
            return Math.max(Math.ceil(amount), 0);
        };
        Planet.prototype.neededResources = function () {
            var e_16, _a;
            var amounts = {}; // Calculate how many of each item we want
            var need = {}; // Pre-calculate each item's need
            try {
                for (var _b = __values(t.resources), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var item = _c.value;
                    var amount = this.neededResourceAmount(resource_1.resources[item]);
                    if (amount > 0) {
                        amounts[item] = amount;
                        need[item] = Math.log(this.price(item)) * this.getNeed(item);
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
            // Sort the greatest needs to the front of the list
            var prioritized = Object.keys(amounts).sort(function (a, b) {
                var diff = need[a] - need[b];
                return diff > 0 ? -1
                    : diff < 0 ? 1
                        : 0;
            });
            return {
                'prioritized': prioritized,
                'amounts': amounts,
            };
        };
        Planet.prototype.exporters = function (item) {
            var _this = this;
            var bodies = Object.keys(window.game.planets);
            return bodies.filter(function (name) {
                var p = window.game.planets[name];
                return p.body !== _this.body
                    && !p.hasShortage(item)
                    && p.getStock(item) >= 1
                    && (p.hasSurplus(item) || p.isNetExporter(item));
            });
        };
        Planet.prototype.selectExporter = function (item, amount) {
            var e_17, _a, e_18, _b, e_19, _c;
            var exporters = this.exporters(item);
            if (exporters.length === 0)
                return;
            // Calculate a rating based on difference from average distance, price, stock
            var dist = {};
            var price = {};
            var stock = {};
            try {
                for (var exporters_1 = __values(exporters), exporters_1_1 = exporters_1.next(); !exporters_1_1.done; exporters_1_1 = exporters_1.next()) {
                    var body = exporters_1_1.value;
                    dist[body] = this.distance(body) / physics_1.default.AU * window.game.planets[body].buyPrice('fuel');
                    price[body] = window.game.planets[body].buyPrice(item);
                    stock[body] = Math.min(amount, window.game.planets[body].getStock(item));
                }
            }
            catch (e_17_1) { e_17 = { error: e_17_1 }; }
            finally {
                try {
                    if (exporters_1_1 && !exporters_1_1.done && (_a = exporters_1.return)) _a.call(exporters_1);
                }
                finally { if (e_17) throw e_17.error; }
            }
            var avgDist = Object.values(dist).reduce(function (a, b) { return a + b; }, 0)
                / Object.values(dist).length;
            var avgPrice = Object.values(price).reduce(function (a, b) { return a + b; }, 0)
                / Object.values(price).length;
            var avgStock = Object.values(stock).reduce(function (a, b) { return a + b; }, 0)
                / Object.values(stock).length;
            var distRating = {};
            var priceRating = {};
            var stockRating = {};
            try {
                for (var exporters_2 = __values(exporters), exporters_2_1 = exporters_2.next(); !exporters_2_1.done; exporters_2_1 = exporters_2.next()) {
                    var body = exporters_2_1.value;
                    distRating[body] = avgDist / dist[body];
                    priceRating[body] = avgPrice / price[body];
                    stockRating[body] = stock[body] / avgStock;
                }
            }
            catch (e_18_1) { e_18 = { error: e_18_1 }; }
            finally {
                try {
                    if (exporters_2_1 && !exporters_2_1.done && (_b = exporters_2.return)) _b.call(exporters_2);
                }
                finally { if (e_18) throw e_18.error; }
            }
            // Calculate a rating by comparing distance, price, and number of
            // available units
            var bestPlanet;
            var bestRating = 0;
            try {
                for (var exporters_3 = __values(exporters), exporters_3_1 = exporters_3.next(); !exporters_3_1.done; exporters_3_1 = exporters_3.next()) {
                    var body = exporters_3_1.value;
                    var rating = priceRating[body] * stockRating[body] * distRating[body];
                    if (rating > bestRating) {
                        bestRating = rating;
                        bestPlanet = body;
                    }
                }
            }
            catch (e_19_1) { e_19 = { error: e_19_1 }; }
            finally {
                try {
                    if (exporters_3_1 && !exporters_3_1.done && (_c = exporters_3.return)) _c.call(exporters_3);
                }
                finally { if (e_19) throw e_19.error; }
            }
            return bestPlanet;
        };
        /**
         * Returns the number of an item which can be crafted given the resources
         * available in this market.
         */
        Planet.prototype.canManufacture = function (item) {
            var e_20, _a;
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
                catch (e_20_1) { e_20 = { error: e_20_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_20) throw e_20.error; }
                }
            }
            if (counts.length > 0) {
                return counts.reduce(function (a, b) { return a < b ? a : b; });
            }
            else {
                return 0;
            }
        };
        Planet.prototype.manufacture = function () {
            var e_21, _a, e_22, _b, e_23, _c;
            var needed = this.neededResources();
            try {
                for (var _d = __values(needed.prioritized), _e = _d.next(); !_e.done; _e = _d.next()) {
                    var item = _e.value;
                    var res = resource_1.resources[item];
                    if (resource_1.isCraft(res)) {
                        var want = needed.amounts[item];
                        var avail = this.canManufacture(item);
                        var gets = Math.min(want, avail);
                        if (gets > 0) {
                            try {
                                for (var _f = __values(Object.keys(res.recipe.materials)), _g = _f.next(); !_g.done; _g = _f.next()) {
                                    var mat = _g.value;
                                    this.buy(mat, gets * (res.recipe.materials[mat] || 0));
                                }
                            }
                            catch (e_22_1) { e_22 = { error: e_22_1 }; }
                            finally {
                                try {
                                    if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
                                }
                                finally { if (e_22) throw e_22.error; }
                            }
                            this.schedule({
                                type: 'craft',
                                turns: this.fabricate(item),
                                item: item,
                                count: gets,
                            });
                        }
                        if (gets < want) {
                            try {
                                for (var _h = __values(Object.keys(res.recipe.materials)), _j = _h.next(); !_j.done; _j = _h.next()) {
                                    var mat = _j.value;
                                    this.incDemand(mat, res.recipe.materials[mat] || 0);
                                }
                            }
                            catch (e_23_1) { e_23 = { error: e_23_1 }; }
                            finally {
                                try {
                                    if (_j && !_j.done && (_c = _h.return)) _c.call(_h);
                                }
                                finally { if (e_23) throw e_23.error; }
                            }
                        }
                    }
                }
            }
            catch (e_21_1) { e_21 = { error: e_21_1 }; }
            finally {
                try {
                    if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
                }
                finally { if (e_21) throw e_21.error; }
            }
        };
        Planet.prototype.imports = function () {
            var _this = this;
            var e_24, _a;
            if (this.queue.filter(function (t) { return isImportTask(t); }).length >= data_1.default.max_deliveries)
                return;
            var need = this.neededResources();
            var want = need.amounts;
            var list = need.prioritized.filter(function (i) {
                if (_this.isNetExporter(i) && !_this.hasShortage(i)) {
                    // Remove items that we ourselves export or that we aren't short of
                    delete want[i];
                    return false;
                }
                return true;
            });
            try {
                ITEM: for (var list_1 = __values(list), list_1_1 = list_1.next(); !list_1_1.done; list_1_1 = list_1.next()) {
                    var item = list_1_1.value;
                    var amount = want[item];
                    var planet = this.selectExporter(item, amount);
                    if (!planet) {
                        continue;
                    }
                    var _b = __read(window.game.planets[planet].buy(item, amount), 2), bought = _b[0], price = _b[1];
                    if (bought > 0) {
                        var distance = this.distance(planet) / physics_1.default.AU;
                        var turns = Math.max(3, Math.ceil(Math.log(distance) * 2)) * data_1.default.turns_per_day;
                        window.game.planets[planet].buy('fuel', distance);
                        this.schedule({
                            type: 'import',
                            item: item,
                            count: bought,
                            from: planet,
                            to: this.body,
                            turns: turns,
                        });
                    }
                }
            }
            catch (e_24_1) { e_24 = { error: e_24_1 }; }
            finally {
                try {
                    if (list_1_1 && !list_1_1.done && (_a = list_1.return)) _a.call(list_1);
                }
                finally { if (e_24) throw e_24.error; }
            }
        };
        Planet.prototype.produce = function () {
            var e_25, _a;
            try {
                for (var _b = __values(this.produces.keys()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var item = _c.value;
                    // allow some surplus to build
                    //if (this.getStock(item) < this.min_stock && !this.hasSuperSurplus(item)) {
                    if (!this.hasSuperSurplus(item) && this.price(item) >= resource_1.resources[item].value * 0.6) {
                        var amount = this.production(item);
                        if (amount > 0) {
                            this.sell(item, amount);
                        }
                    }
                }
            }
            catch (e_25_1) { e_25 = { error: e_25_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_25) throw e_25.error; }
            }
        };
        Planet.prototype.consume = function () {
            var e_26, _a;
            try {
                for (var _b = __values(this.consumes.keys()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var item = _c.value;
                    var amt = this.consumption(item);
                    if (amt > 0) {
                        this.buy(item, this.consumption(item));
                    }
                }
            }
            catch (e_26_1) { e_26 = { error: e_26_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_26) throw e_26.error; }
            }
        };
        Planet.prototype.rollups = function () {
            var e_27, _a, e_28, _b;
            if (window.game.turns % (24 / data_1.default.hours_per_turn) === 0) {
                try {
                    for (var _c = __values(this.stock.keys()), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var item = _d.value;
                        this.incSupply(item, this.getStock(item));
                    }
                }
                catch (e_27_1) { e_27 = { error: e_27_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                    }
                    finally { if (e_27) throw e_27.error; }
                }
                this.supply.rollup();
                this.demand.rollup();
                try {
                    for (var _e = __values(this.need.keys()), _f = _e.next(); !_f.done; _f = _e.next()) {
                        var item = _f.value;
                        this.need.inc(item, this.getNeed(item));
                    }
                }
                catch (e_28_1) { e_28 = { error: e_28_1 }; }
                finally {
                    try {
                        if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                    }
                    finally { if (e_28) throw e_28.error; }
                }
                this.need.rollup();
            }
        };
        Planet.prototype.apply_conditions = function () {
            var e_29, _a, e_30, _b, e_31, _c, e_32, _d;
            // Increment turns on each condition and filter out those which are no
            // longer active.
            this.conditions = this.conditions.filter(function (c) {
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
                    catch (e_30_1) { e_30 = { error: e_30_1 }; }
                    finally {
                        try {
                            if (_h && !_h.done && (_b = _g.return)) _b.call(_g);
                        }
                        finally { if (e_30) throw e_30.error; }
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
                    catch (e_31_1) { e_31 = { error: e_31_1 }; }
                    finally {
                        try {
                            if (_k && !_k.done && (_c = _j.return)) _c.call(_j);
                        }
                        finally { if (e_31) throw e_31.error; }
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
                    catch (e_32_1) { e_32 = { error: e_32_1 }; }
                    finally {
                        try {
                            if (_m && !_m.done && (_d = _l.return)) _d.call(_l);
                        }
                        finally { if (e_32) throw e_32.error; }
                    }
                }
            }
            catch (e_29_1) { e_29 = { error: e_29_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_a = _e.return)) _a.call(_e);
                }
                finally { if (e_29) throw e_29.error; }
            }
        };
        Planet.prototype.turn = function () {
            this.produce();
            this.consume();
            this.processQueue();
            // Only do the really expensive stuff once per day
            if (window.game.turns % data_1.default.turns_per_day == 0) {
                this.manufacture();
                this.imports();
                this.replenishFabricators();
                this.apply_conditions();
            }
            this.rollups();
        };
        /*
         * Misc
         */
        Planet.prototype.addonPrice = function (addon, player) {
            var e_33, _a;
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
            catch (e_33_1) { e_33 = { error: e_33_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_33) throw e_33.error; }
            }
            return price;
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
            return this.resourceDependencyPriceAdjustment('metal') < 10;
        };
        Planet.prototype.hullRepairPrice = function (player) {
            var base = data_1.default.ship.hull.repair;
            var tax = this.faction.sales_tax;
            var standing = player.getStandingPriceAdjustment(this.faction.abbrev);
            var scarcity = this.resourceDependencyPriceAdjustment('metal');
            return (base + (base * tax) - (base * standing)) * scarcity;
        };
        Planet.prototype.armorRepairPrice = function (player) {
            var base = data_1.default.ship.armor.repair;
            var tax = this.faction.sales_tax;
            var standing = player.getStandingPriceAdjustment(this.faction.abbrev);
            var scarcity = this.resourceDependencyPriceAdjustment('metal');
            return (base + (base * tax) - (base * standing)) * scarcity;
        };
        return Planet;
    }());
    exports.Planet = Planet;
});
