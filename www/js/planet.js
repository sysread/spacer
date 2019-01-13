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
    var Planet = /** @class */ (function () {
        function Planet(body, init) {
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
            TASK: for (var _i = 0, _a = data_1.default.work; _i < _a.length; _i++) {
                var task = _a[_i];
                for (var _b = 0, _c = task.avail; _b < _c.length; _b++) {
                    var req = _c[_b];
                    for (var _d = 0, _e = this.traits; _d < _e.length; _d++) {
                        var trait = _e[_d];
                        if (req === trait.name) {
                            this.work_tasks.push(task);
                            continue TASK;
                        }
                    }
                }
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
            this.produces = new store_1.default;
            this.consumes = new store_1.default;
            for (var _f = 0, _g = t.resources; _f < _g.length; _f++) {
                var item = _g[_f];
                this.produces.inc(item, this.scale(data_1.default.market.produces[item]));
                this.consumes.inc(item, this.scale(data_1.default.market.consumes[item]));
                this.produces.inc(item, this.scale(this.faction.produces[item] || 0));
                this.consumes.inc(item, this.scale(this.faction.consumes[item] || 0));
                for (var _h = 0, _j = this.traits; _h < _j.length; _h++) {
                    var trait = _j[_h];
                    this.produces.inc(item, this.scale(trait.produces[item]));
                    this.consumes.inc(item, this.scale(trait.consumes[item]));
                }
            }
            // Assign directly in constructor rather than in clearMemos for
            // performance reasons. V8's jit will produce more optimized classes by
            // avoiding dynamic assignment in the constructor.
            this._isNetExporter = {};
            this._getDemand = {};
            this._getSupply = {};
            this._getNeed = {};
            this._getShortage = {};
            this._getSurplus = {};
            this._price = {};
            this._cycle = {};
            for (var _k = 0, _l = t.resources; _k < _l.length; _k++) {
                var item = _l[_k];
                this._cycle[item] = util.getRandomInt(2, 6) * data_1.default.turns_per_day;
            }
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
            for (var _i = 0, _a = this.traits; _i < _a.length; _i++) {
                var t_1 = _a[_i];
                if (t_1.name == trait) {
                    return true;
                }
            }
            return false;
        };
        Planet.prototype.hasCondition = function (condition) {
            for (var _i = 0, _a = this.conditions; _i < _a.length; _i++) {
                var c = _a[_i];
                if (c.name == condition) {
                    return true;
                }
            }
            return false;
        };
        /*
         * Patrols and inspections
         */
        Planet.prototype.patrolRate = function (distance) {
            if (distance === void 0) { distance = 0; }
            var rate = this.scale(this.faction.patrol);
            var invsq = distance > data_1.default.jurisdiction
                ? rate * Math.pow(data_1.default.jurisdiction, 2) / Math.pow(distance, 2)
                : rate;
            return Math.max(0, invsq);
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
                var _a = this.buy('cybernetics', want), bought = _a[0], price = _a[1];
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
            var pay = this.payRate(player, task) * days;
            var turns = days * 24 / data_1.default.hours_per_turn;
            var rewards = task.rewards;
            var collected = new store_1.default;
            for (var turn = 0; turn < turns; ++turn) {
                for (var _i = 0, rewards_1 = rewards; _i < rewards_1.length; _i++) {
                    var item = rewards_1[_i];
                    collected.inc(item, this.mine(item));
                }
            }
            return { pay: pay, items: collected };
        };
        Planet.prototype.mine = function (item) {
            if (this.production(item) > 0 && Math.random() <= data_1.default.market.minability) {
                return Math.min(1, this.production(item));
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
        Planet.prototype.shortageFactor = function (item) { return this.isNetExporter(item) ? 4 : 6; };
        Planet.prototype.surplusFactor = function (item) { return this.isNetExporter(item) ? 0.2 : 0.8; };
        Planet.prototype.avgProduction = function (item) { return this.getSupply(item) - this.consumption(item); };
        Planet.prototype.netProduction = function (item) { return this.production(item) - this.consumption(item); };
        Planet.prototype.getDemand = function (item) {
            if (this._getDemand[item] == undefined)
                this._getDemand[item] = this.demand.avg(item);
            return this._getDemand[item];
        };
        Planet.prototype.getSupply = function (item) {
            if (this._getSupply[item] == undefined)
                this._getSupply[item] = this.supply.avg(item);
            return this._getSupply[item];
        };
        Planet.prototype.hasShortage = function (item) {
            if (this._getShortage[item] == undefined)
                this._getShortage[item] = this.getNeed(item) >= this.shortageFactor(item);
            return this._getShortage[item];
        };
        Planet.prototype.hasSurplus = function (item) {
            if (this._getSurplus[item] == undefined)
                this._getSurplus[item] = this.getNeed(item) <= this.surplusFactor(item);
            return this._getSurplus[item];
        };
        Planet.prototype.production = function (item) {
            var amount = this.produces.get(item) / data_1.default.turns_per_day;
            for (var _i = 0, _a = this.conditions; _i < _a.length; _i++) {
                var condition = _a[_i];
                amount += this.scale(condition.produces[item] || 0);
            }
            return amount;
        };
        Planet.prototype.consumption = function (item) {
            var amount = this.consumes.get(item) / data_1.default.turns_per_day;
            for (var _i = 0, _a = this.conditions; _i < _a.length; _i++) {
                var condition = _a[_i];
                amount += this.scale(condition.consumes[item] || 0);
            }
            return amount;
        };
        Planet.prototype.incDemand = function (item, amt) {
            var queue = [[item, amt]];
            while (queue.length > 0) {
                var elt = queue.shift();
                if (elt != undefined) {
                    var item_1 = elt[0], amt_1 = elt[1];
                    this.demand.inc(item_1, amt_1);
                    var res = data_1.default.resources[item_1];
                    if (t.isCraft(res) && this.hasShortage(item_1)) {
                        for (var _i = 0, _a = Object.keys(res.recipe.materials); _i < _a.length; _i++) {
                            var mat = _a[_i];
                            queue.push([mat, (res.recipe.materials[mat] || 0) * amt_1]);
                        }
                    }
                }
            }
        };
        Planet.prototype.incSupply = function (item, amount) {
            this.supply.inc(item, amount);
        };
        Planet.prototype.isNetExporter = function (item) {
            if (!this._isNetExporter.hasOwnProperty(item)) {
                var isExporter = false;
                var res = resource_1.resources[item];
                if (resource_1.isRaw(res)) {
                    var net = this.netProduction(item);
                    isExporter = net >= this.scale(1);
                }
                if (!isExporter && resource_1.isCraft(res)) {
                    var matExporter = true;
                    for (var _i = 0, _a = res.ingredients; _i < _a.length; _i++) {
                        var mat = _a[_i];
                        if (!this.isNetExporter(mat)) {
                            matExporter = false;
                            break;
                        }
                    }
                    isExporter = matExporter;
                }
                this._isNetExporter[item] = isExporter;
            }
            return this._isNetExporter[item];
        };
        // TODO include distance and delivery time from nearest source
        Planet.prototype.getNeed = function (item) {
            if (this._getNeed[item] == undefined) {
                var markup = data_1.default.necessity[item] ? 1 + data_1.default.scarcity_markup : 1;
                var result = void 0;
                var d = this.getDemand(item);
                if (d === 0) {
                    result = markup * d / this.surplusFactor(item);
                }
                else {
                    var s = (this.getStock(item) + this.getSupply(item)) / 2;
                    if (s === 0) {
                        result = markup * d * this.shortageFactor(item);
                    }
                    else {
                        result = markup * d / s;
                    }
                }
                this._getNeed[item] = result;
            }
            return this._getNeed[item];
        };
        Planet.prototype.getScarcityMarkup = function (item) {
            var markup = 1;
            if (data_1.default.necessity[item]) {
                markup += data_1.default.scarcity_markup;
            }
            for (var _i = 0, _a = this.conditions; _i < _a.length; _i++) {
                var condition = _a[_i];
                var consumption = this.scale(condition.consumes[item] || 0);
                var production = this.scale(condition.produces[item] || 0);
                var amount = consumption - production; // production is generally a malus
                markup += amount;
            }
            return markup;
        };
        Planet.prototype.price = function (item) {
            if (window.game.turns % this._cycle[item] == 0) {
                delete this._price[item];
            }
            if (this._price[item] == undefined) {
                var value = resource_1.resources[item].value;
                var markup = this.getScarcityMarkup(item);
                var need = this.getNeed(item);
                var price = 0;
                if (need > 1) {
                    price = markup * value + (value * Math.log(need));
                }
                else if (need < 1) {
                    price = markup * value * need;
                }
                else {
                    price = markup * value;
                }
                // Special cases for market classifications
                for (var _i = 0, _a = this.traits; _i < _a.length; _i++) {
                    var trait = _a[_i];
                    price -= price * (trait.price[item] || 0);
                }
                // Set upper and lower boundary, allowing for a little more inflation
                // than price crashing.
                price = util.clamp(price, value / 2, value * 3);
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
            var base = this.price(item);
            var price = base + (base * this.faction.sales_tax);
            return player
                ? util.R(price * (1 - player.getStandingPriceAdjustment(this.faction.abbrev)))
                : util.R(price);
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
            var hadShortage = this.hasShortage(item);
            var price = amount * this.sellPrice(item);
            this.stock.inc(item, amount);
            var standing = 0;
            if (player) {
                player.ship.unloadCargo(item, amount);
                player.credit(price);
                if (hadShortage && !resource_1.resources[item].contraband) {
                    // Player ended a shortage. Increase their standing with our faction.
                    if (!this.hasShortage(item)) {
                        standing = util.getRandomNum(1, 5);
                        player.incStanding(this.faction.abbrev, standing);
                    }
                    // Player contributed toward ending a shortage. Increase their
                    // standing with our faction slightly.
                    else {
                        player.incStanding(this.faction.abbrev, 1);
                        standing = 1;
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
            // NOTE: this method of regenerating the queue is *much* faster than
            // Array.prototype.filter().
            var queue = this.queue;
            this.queue = [];
            for (var _i = 0, queue_1 = queue; _i < queue_1.length; _i++) {
                var task = queue_1[_i];
                if (--task.turns > 0) {
                    this.queue.push(task);
                }
                else {
                    this.sell(task.item, task.count);
                    this.pending.dec(task.item, task.count);
                }
            }
        };
        Planet.prototype.neededResourceAmount = function (item) {
            var amount = this.getDemand(item.name) - this.getStock(item.name) - this.pending.get(item.name);
            return Math.max(Math.ceil(amount), 0);
        };
        Planet.prototype.neededResources = function () {
            var amounts = {}; // Calculate how many of each item we want
            var need = {}; // Pre-calculate each item's need
            for (var _i = 0, _a = t.resources; _i < _a.length; _i++) {
                var item = _a[_i];
                var amount = this.neededResourceAmount(resource_1.resources[item]);
                if (amount > 0) {
                    amounts[item] = amount;
                    need[item] = this.getNeed(item);
                }
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
            var exporters = this.exporters(item);
            if (exporters.length === 0)
                return;
            // Calculate a rating based on difference from average distance, price, stock
            var dist = {};
            var price = {};
            var stock = {};
            for (var _i = 0, exporters_1 = exporters; _i < exporters_1.length; _i++) {
                var body = exporters_1[_i];
                dist[body] = this.distance(body) / physics_1.default.AU * window.game.planets[body].buyPrice('fuel');
                price[body] = window.game.planets[body].buyPrice(item);
                stock[body] = Math.min(amount, window.game.planets[body].getStock(item));
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
            for (var _a = 0, exporters_2 = exporters; _a < exporters_2.length; _a++) {
                var body = exporters_2[_a];
                distRating[body] = avgDist / dist[body];
                priceRating[body] = avgPrice / price[body];
                stockRating[body] = stock[body] / avgStock;
            }
            // Calculate a rating by comparing distance, price, and number of
            // available units
            var bestPlanet;
            var bestRating = 0;
            for (var _b = 0, exporters_3 = exporters; _b < exporters_3.length; _b++) {
                var body = exporters_3[_b];
                var rating = priceRating[body] * stockRating[body] * distRating[body];
                if (rating > bestRating) {
                    bestRating = rating;
                    bestPlanet = body;
                }
            }
            return bestPlanet;
        };
        Planet.prototype.manufacture = function () {
            var need = this.neededResources();
            var want = need.amounts;
            var list = [];
            for (var _i = 0, _a = need.prioritized; _i < _a.length; _i++) {
                var i = _a[_i];
                var res = resource_1.resources[i];
                // Not craftable or we do not need it
                if (!resource_1.isCraft(res) || this.getNeed(i) < 0.25) {
                    delete want[i];
                }
                else {
                    // Cache so we don't recalculate these over and over
                    var has_stock = {};
                    var is_short = {};
                    for (var _b = 0, _c = res.ingredients; _b < _c.length; _b++) {
                        var mat = _c[_b];
                        if (has_stock[mat] == undefined) {
                            has_stock[mat] = this.getStock(mat);
                        }
                        if (is_short[mat] == undefined) {
                            is_short[mat] = this.hasShortage(mat);
                        }
                        var amt = res.recipe.materials[mat] || 0;
                        if (has_stock[mat] < amt || is_short[mat]) {
                            this.incDemand(mat, amt);
                        }
                    }
                    list.push(i);
                }
            }
            while (Object.keys(want).length > 0) {
                var items = list
                    .filter(function (i) { return want[i]; })
                    .map(function (i) { return resource_1.resources[i]; });
                for (var _d = 0, items_1 = items; _d < items_1.length; _d++) {
                    var item = items_1[_d];
                    if (resource_1.isCraft(item)) {
                        for (var _e = 0, _f = item.ingredients; _e < _f.length; _e++) {
                            var mat = _f[_e];
                            this.buy(mat, item.recipe.materials[mat] || 0);
                        }
                    }
                    if (--want[item.name] === 0) {
                        delete want[item.name];
                    }
                    this.schedule({
                        type: 'craft',
                        turns: this.fabricate(item.name),
                        item: item.name,
                        count: 1,
                    });
                }
            }
        };
        Planet.prototype.imports = function () {
            var _this = this;
            if (this.queue.length >= 10)
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
            ITEM: for (var _i = 0, list_1 = list; _i < list_1.length; _i++) {
                var item = list_1[_i];
                // Import amounts should be between 5-20 units
                var amount = util.clamp(want[item] * (data_1.default.necessity[item] ? 2 : 1), 5, 20);
                var planet = this.selectExporter(item, amount);
                if (!planet) {
                    continue;
                }
                var _a = window.game.planets[planet].buy(item, amount), bought = _a[0], price = _a[1];
                if (bought > 0) {
                    var distance = this.distance(planet) / physics_1.default.AU;
                    var turns = Math.ceil(distance * (24 / data_1.default.hours_per_turn) * 5); // 5 days per AU
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
        };
        Planet.prototype.produce = function () {
            for (var _i = 0, _a = this.produces.keys(); _i < _a.length; _i++) {
                var item = _a[_i];
                var amount = this.production(item);
                if (amount > 0 && !this.hasSurplus(item)) {
                    this.sell(item, amount);
                }
            }
        };
        Planet.prototype.consume = function () {
            for (var _i = 0, _a = this.consumes.keys(); _i < _a.length; _i++) {
                var item = _a[_i];
                var amt = this.consumption(item);
                if (amt > 0) {
                    this.buy(item, this.consumption(item));
                }
            }
        };
        Planet.prototype.rollups = function () {
            if (window.game.turns % (24 / data_1.default.hours_per_turn) === 0) {
                for (var _i = 0, _a = this.stock.keys(); _i < _a.length; _i++) {
                    var item = _a[_i];
                    this.incSupply(item, this.getStock(item));
                }
                this.supply.rollup();
                this.demand.rollup();
                for (var _b = 0, _c = this.need.keys(); _b < _c.length; _b++) {
                    var item = _c[_b];
                    this.need.inc(item, this.getNeed(item));
                }
                this.need.rollup();
            }
        };
        Planet.prototype.apply_conditions = function () {
            // Increment turns on each condition and filter out those which are no
            // longer active.
            this.conditions = this.conditions.filter(function (c) {
                c.inc_turns();
                return !c.is_over;
            });
            // Test for chance of new conditions
            for (var _i = 0, _a = Object.keys(data_1.default.conditions); _i < _a.length; _i++) {
                var c = _a[_i];
                // Skip conditions that are already active
                if (this.hasCondition(c)) {
                    continue;
                }
                // Shortages
                for (var _b = 0, _c = Object.keys(data_1.default.conditions[c].triggers.shortage); _b < _c.length; _b++) {
                    var item = _c[_b];
                    if (this.hasShortage(item)) {
                        if (util.chance(data_1.default.conditions[c].triggers.shortage[item])) {
                            this.conditions.push(new condition_1.Condition(c));
                        }
                    }
                }
                // Surpluses
                for (var _d = 0, _e = Object.keys(data_1.default.conditions[c].triggers.surplus); _d < _e.length; _d++) {
                    var item = _e[_d];
                    if (this.hasSurplus(item)) {
                        if (util.chance(data_1.default.conditions[c].triggers.surplus[item])) {
                            this.conditions.push(new condition_1.Condition(c));
                        }
                    }
                }
                // Conditions
                for (var _f = 0, _g = Object.keys(data_1.default.conditions[c].triggers.condition); _f < _g.length; _f++) {
                    var cond = _g[_f];
                    if (this.hasCondition(cond) || this.hasTrait(cond)) {
                        if (util.chance(data_1.default.conditions[c].triggers.condition[cond])) {
                            this.conditions.push(new condition_1.Condition(c));
                        }
                    }
                }
            }
        };
        Planet.prototype.clearMemos = function () {
            this._isNetExporter = {};
            this._getDemand = {};
            this._getSupply = {};
            this._getNeed = {};
            this._getShortage = {};
            this._getSurplus = {};
            // this._price cleared in price() on its own schedule
        };
        Planet.prototype.turn = function () {
            this.produce();
            this.consume();
            this.processQueue();
            // Only do the really expensive stuff once per day
            if (window.game.turn % data_1.default.turns_per_day == 0) {
                this.manufacture();
                this.replenishFabricators();
                this.imports();
                this.apply_conditions();
            }
            this.rollups();
            this.clearMemos();
        };
        /*
         * Misc
         */
        Planet.prototype.addonPrice = function (addon, player) {
            var base = data_1.default.addons[addon].price;
            var standing = base * player.getStandingPriceAdjustment(this.faction.abbrev);
            var tax = base * this.faction.sales_tax;
            var price = base - standing + tax;
            for (var _i = 0, _a = this.traits; _i < _a.length; _i++) {
                var trait = _a[_i];
                if ('price' in trait && 'addons' in trait.price) {
                    price -= base * (trait.price['addons'] || 0);
                }
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
