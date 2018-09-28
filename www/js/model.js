/*
 * Special case: must use window.game to avoid circular reference with game.js
 */
define(function(require, exports, module) {
  const data      = require('data');
  const system    = require('system');
  const util      = require('util');
  const Physics   = require('physics');
  const resources = [];

  const Resource = class {
    constructor(name) {
      this.name        = name;
      this.mass        = data.resources[name].mass;
      this.contraband  = data.resources[name].contraband;
      this.isMinable   = data.resources[name].mine !== undefined;
      this.isCraftable = data.resources[name].recipe !== undefined;
      this.mineTurns   = this.isMinable ? data.resources[name].mine.tics : null;
      this.craftTurns  = this.isCraftable ? data.resources[name].recipe.tics : null;
      this.recipe      = this.isCraftable ? data.resources[name].recipe.materials : null;
      this.ingredients = this.isCraftable ? Object.keys(this.recipe) : [];
      this.value       = this.calculateBaseValue();
    }

    calculateBaseValue() {
      let value = 0;

      if (this.isMinable) {
        value = data.resources[this.name].mine.value;
      }
      else if (this.isCraftable) {
        for (const mat of Object.keys(this.recipe)) {
          value += this.recipe[mat] * resources[mat].calculateBaseValue();
        }

        for (let i = 0; i < this.craftTurns; ++i) {
          value *= 1.2;
        }
      }

      return value;
    }
  };

  const Faction = class {
    constructor(abbrev) {
      // Faction instance rather than abbrev string
      if (abbrev.hasOwnProperty('abbrev')) {
        abbrev = abbrev.abbrev;
      }

      this.abbrev    = abbrev;
      this.full_name = data.factions[abbrev].full_name;
      this.capital   = data.factions[abbrev].capital;
      this.sales_tax = data.factions[abbrev].sales_tax;
      this.patrol    = data.factions[abbrev].patrol;
      this.patrol    = data.factions[abbrev].patrol;
      this.produces  = new Store(data.factions[abbrev].produces);
      this.consumes  = new Store(data.factions[abbrev].consumes);
    }

    get desc() { return data.factions[abbrev].desc }
    toString() { return this.abbrev }
  };

  const Trait = class {
    constructor(name) {
      this.name     = name;
      this.produces = new Store(data.traits[name].produces);
      this.consumes = new Store(data.traits[name].consumes);
    }
  };

  const Store = class {
    constructor(init) {
      if (init && init.hasOwnProperty('store')) {
        this.store = init.store;
      }
      else if (init) {
        this.store = init;
      }
      else {
        this.store = {};
        for (const item of Object.keys(resources)) {
          this.store[item] = 0;
        }
      }
    }

    item(item)     { return resources[item] }
    get keys()     { return Object.keys(this.store) }
    set(item, amt) { this.store[item] = amt }
    get(item)      { return this.store[item] }
    count(item)    { return Math.floor(this.store[item]) }

    sum() {
      let n = 0;
      for (const k of Object.keys(this.store))
        n += this.store[k];
      return n;
    }

    dec(item, amount) {
      this.inc(item, -amount);
    }

    inc(item, amount=0) {
      if (!this.store.hasOwnProperty(item)) {
        throw new Error('not found: ' + item);
      }

      this.store[item] = this.store[item] + amount;

      if (this.store[item] < 0) {
        this.store[item] = 0;
      }
    }
  };

  const History = class {
    constructor(length, init) {
      init = init || {};
      this.length  = length;
      this.history = init.history;
      this.sum     = new Store(init.sum);
      this.daily   = new Store(init.daily);

      if (!this.history) {
        this.history = {};
        for (const item of Object.keys(resources)) {
          this.history[item] = [];
        }
      }
    }

    inc(item, n) { return this.daily.inc(item, n) }
    dec(item, n) { return this.daily.dec(item, n) }
    nth(item, n) { return this.history[item][n] }
    get keys()   { return this.sum.keys }
    item(item)   { return this.sum.item(item) }
    get(item)    { return this.sum.get(item) }
    count(item)  { return this.sum.count(item) }

    avg(item) {
      if (this.history[item].length === 0) {
        return 0;
      }

      return this.sum.get(item) / this.history[item].length;
    }

    add(item, amount) {
      if (!this.history.hasOwnProperty(item)) {
        throw new Error('not found: ' + item);
      }

      this.history[item].unshift(amount);
      this.sum.inc(item, amount);

      while (this.history[item].length > this.length) {
        this.sum.dec(item, this.history[item].pop());
      }
    }

    rollup() {
      for (const item of Object.keys(resources)) {
        this.add(item, this.daily.get(item));
      }

      this.daily = new Store;
    }
  };

  const Planet = class {
    constructor(body, init) {
      init = init || {};

      /*
       * Physical and faction
       */
      this.body    = body;
      this.name    = data.bodies[body].name;
      this.size    = data.bodies[body].size;
      this.traits  = data.bodies[body].traits.map((t) => {return new Trait(t)});
      this.faction = new Faction(data.bodies[body].faction);

      /*
       * Fabrication
       */
      this.max_fab_units  = Math.ceil(this.scale(data.fabricators));
      this.max_fab_health = this.max_fab_units * data.fab_health;
      this.fab_health     = this.max_fab_units * data.fab_health;

      /*
       * Work
       */
      this.work_tasks = [];
      TASK:for (const task of data.work) {
        for (const req of task.avail) {
          for (const trait of this.traits) {
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
      this.stock   = new Store(init.stock);
      this.supply  = new History(data.market_history, init.supply);
      this.demand  = new History(data.market_history, init.demand);
      this.need    = new History(data.market_history, init.need);
      this.pending = new Store(init.pending);
      this.queue   = init.queue || [];
      this.cycle   = init.cycle || {};

      this.produces = new Store;
      this.consumes = new Store;
      for (const item of Object.keys(resources)) {
        this.produces.inc(item, this.scale(data.market.produces[item]));
        this.consumes.inc(item, this.scale(data.market.consumes[item]));

        this.produces.inc(item, this.scale(this.faction.produces.get(item)));
        this.consumes.inc(item, this.scale(this.faction.consumes.get(item)));

        for (const trait of this.traits) {
          this.produces.inc(item, this.scale(trait.produces.get(item)));
          this.consumes.inc(item, this.scale(trait.consumes.get(item)));
        }

        this.cycle[item] = util.getRandomInt(3, 10);
      }

      this.clearMemos();
    }

    get desc() { return data.bodies[this.body].desc }

    /*
     * Physical
     */
    get kind()       { return system.kind(this.body) }
    get central()    { return system.central(this.body) }
    get gravity()    { return system.gravity(this.body) }
    get position()   { return system.position(this.body) }
    distance(toBody) { return system.distance(this.body, toBody) }

    /*
     * Patrols and inspections
     */
    inspectionRate(distance) {
      const standing = 1 - (window.game.player.getStanding(this.faction.abbrev) / data.max_abs_standing);
      const rate = this.scale(this.faction.patrol * standing);
      return distance ? rate * Math.pow(data.jurisdiction, 2) / Math.pow(distance, 2) : rate;
    }

    inspectionChance(distance) {
      const stealth = 1 - window.game.player.ship.stealth;
      const rate = this.inspectionRate(distance);
      const rand = Math.random();
      return rand <= (rate * stealth);
    }

    inspectionFine() {
      return Math.max(10, data.max_abs_standing - window.game.player.getStanding(this.faction));
    }

    /*
     * Fabrication
     */
    fabricationAvailability() {
      return Math.ceil(Math.min(100, this.fab_health / this.max_fab_health * 100));
    }

    fabricationTime(item) {
      const resource = resources[item];
      if (!resource.isCraftable) return;
      if (resource.craftTurns <= this.fab_health) {
        return Math.ceil(resource.craftTurns / 2);
      } else {
        return Math.max(1, Math.ceil((resource.craftTurns - this.fab_health) / 2));
      }
    }

    fabricate(item) {
      const adjusted = this.fabricationTime(item);
      if (adjusted === null) return;
      this.fab_health = Math.max(0, this.fab_health - resources[item].craftTurns);
      return adjusted;
    }

    replenishFabricators() {
      if (this.fab_health < this.max_fab_health / 2) {
        const want = Math.ceil((this.max_fab_health - this.fab_health) / data.fab_health);
        const [bought, price] = this.buy('cybernetics', want);
        this.fab_health += bought * data.fab_health;
      }
    }

    /*
     * Work
     */
    payRate(player, task) {
      let rate = this.scale(task.pay);
      rate += rate * player.getStandingPriceAdjustment(this.faction.abbrev);
      rate -= rate * this.faction.sales_tax;
      return Math.ceil(rate);
    }

    work(player, task, days) {
      const pay       = this.payRate(player, task) * days
      const turns     = days * 24 / data.hours_per_turn;
      const rewards   = task.rewards;
      const collected = new Store;

      for (let turn = 0; turn < turns; ++turn) {
        for (const item of rewards) {
          collected.inc(item, this.mine(item));
        }
      }

      return {pay: pay, items: collected};
    }

    mine(item) {
      if (this.production(item) > 0 && Math.random() <= data.market.minability) {
        return Math.min(1, this.production(item));
      }

      return 0;
    }

    /*
     * Economics
     */
    scale(n=0)           { return data.scales[this.size] * n }

    getStock(item)       { return this.stock.count(item) }
    getSupply(item)      { return this.supply.avg(item) }
    getDemand(item)      { return this.demand.avg(item) }

    shortageFactor(item) { return this.isNetExporter(item) ? 4 : 6 }
    hasShortage(item)    { return this.getNeed(item) >= this.shortageFactor(item) }

    surplusFactor(item)  { return this.isNetExporter(item) ? 0.2 : 0.8 }
    hasSurplus(item)     { return this.getNeed(item) <= this.surplusFactor(item) }

    production(item)     { return this.produces.get(item) / (24 / data.hours_per_turn) }
    consumption(item)    { return this.consumes.get(item) / (24 / data.hours_per_turn) }
    avgProduction(item)  { return this.getSupply(item) - this.consumption(item) }
    netProduction(item)  { return this.production(item) - this.consumption(item) }

    incDemand(item, amount) {
      this.demand.inc(item, amount);

      if (resources[item].isCraftable && this.hasShortage(item)) {
        for (const mat of resources[item].ingredients) {
          this.incDemand(mat, resources[item].recipe[mat]);
        }
      }
    }

    incSupply(item, amount) {
      this.supply.inc(item, amount);
    }

    isNetExporter(item) {
      if (!this._isNetExporter.hasOwnProperty(item)) {
        let isExporter = false;

        if (resources[item].isMinable) {
          const net = this.netProduction(item);
          isExporter = net >= this.scale(1);
        }

        if (!isExporter && resources[item].isCraftable) {
          let matExporter = true;
          for (const mat of resources[item].ingredients) {
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
    }

    // TODO include distance and delivery time from nearest source
    getNeed(item) {
      const markup = data.necessity[item] ? 1 + data.scarcity_markup : 1;

      const d = this.getDemand(item);
      if (d === 0) return markup * this.getDemand(item) / this.surplusFactor(item);

      const s = (this.getStock(item) + this.getSupply(item)) / 2;
      if (s === 0) return markup * this.getDemand(item) * this.shortageFactor(item);

      return markup * d / s;
    }

    price(item) {
      if (!this.hasOwnProperty('_price')) {
        this._price = {};
      }

      if (window.game.turns % (this.cycle[item] % 24 / data.hours_per_turn) === 0) {
        delete this._price[item];
      }

      if (!this._price.hasOwnProperty(item)) {
        const value  = resources[item].value;
        const markup = data.necessity[item] ? 1 + data.scarcity_markup : 1;
        const need   = this.getNeed(item);

        if (need > 1) {
          this._price[item] = Math.ceil(markup * Math.min(value * 3, value * (1 + (need / (need + 5)))));
        } else if (need < 1) {
          this._price[item] = Math.ceil(markup * Math.max(value / 4, value * need));
        } else {
          this._price[item] = Math.ceil(markup * value);
        }
      }

      return this._price[item];
    }

    sellPrice(item) {
      return this.price(item);
    }

    buyPrice(item, player) {
      const base  = this.price(item);
      const price = base + (base * this.faction.sales_tax);

      return player
        ? util.R(price * (1 - player.getStandingPriceAdjustment(this.faction.abbrev)))
        : util.R(price);
    }

    buy(item, amount, player) {
      const bought = Math.min(amount, this.getStock(item));
      const price  = bought * this.buyPrice(item, player);

      this.incDemand(item, amount);
      this.stock.dec(item, bought);

      if (player && bought) {
        player.debit(price);
        player.ship.loadCargo(item, bought);
      }

      return [bought, price];
    }

    sell(item, amount, player) {
      const hadShortage = this.hasShortage(item);
      const price = amount * this.sellPrice(item);
      this.stock.inc(item, amount);

      let standing = 0;

      if (player) {
        player.ship.unloadCargo(item, amount);
        player.credit(price);

        if (hadShortage && !resources[item].contraband) {
          // Player ended a shortage. Increase their standing with our faction.
          if (!this.hasShortage(item)) {
            player.incStanding(this.faction.abbrev, 5);
            standing = 5;
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
    }

    schedule(turns, item, amt, msg) {
      this.pending.inc(item, amt);
      this.queue.push([turns, item, amt, msg]);
    }

    processQueue() {
      // NOTE: this method of regenerating the queue is *much* faster than
      // Array.prototype.filter().
      const queue = this.queue;
      this.queue = [];

      for (const task of queue) {
        if (--task[0] > 0) {
          this.queue.push(task);
        }
        else {
          this.sell(task[1], task[2]);
          this.pending.dec(task[1], task[2]);
        }
      }
    }

    neededResourceAmount(item) {
      const amount = Math.ceil(this.getDemand(item.name) - this.getStock(item.name) - this.pending.get(item.name));
      return amount > 0 ? amount : 0;
    }

    neededResources() {
      // Calculate how many of each item we want
      const amounts = {};
      for (const item of Object.values(resources)) {
        const amount = this.neededResourceAmount(item);
        if (amount > 0) amounts[item.name] = amount;
      }

      // Sort the greatest needs to the front of the list
      const prioritized = Object.keys(amounts).sort((a, b) => {
        const diff = this.getNeed(a) - this.getNeed(b);
        return diff > 0 ? -1
             : diff < 0 ?  1
             : 0;
      });

      return {'prioritized': prioritized, 'amounts': amounts};
    }

    exporters(item) {
      return Object.keys(window.game.planets).filter(name => {
        const p = window.game.planets[name];
        return p.body !== this.body
            && !p.hasShortage(item)
            && p.getStock(item) >= 1
            && (p.hasSurplus(item) || p.isNetExporter(item));
      });
    }

    selectExporter(item, amount) {
      const exporters = this.exporters(item);

      if (exporters.length === 0)
        return;

      // Calculate a rating based on difference from average distance, price, stock
      const dist  = {}, price = {}, stock = {};
      for (const body of exporters) {
        dist[body]  = this.distance(body) / Physics.AU * window.game.planets[body].buyPrice('fuel');
        price[body] = window.game.planets[body].buyPrice(item);
        stock[body] = Math.min(amount, window.game.planets[body].getStock(item));
      }

      const avgDist
        = Object.values(dist).reduce((a, b) => {return a + b}, 0)
        / Object.values(dist).length;

      const avgPrice
        = Object.values(price).reduce((a, b) => {return a + b}, 0)
        / Object.values(price).length;

      const avgStock
        = Object.values(stock).reduce((a, b) => {return a + b}, 0)
        / Object.values(stock).length;

      const distRating  = {}, priceRating = {}, stockRating = {};
      for (const body of exporters) {
        distRating[body]  = dist[body]  / avgDist;
        priceRating[body] = price[body] / avgPrice;
        stockRating[body] = stock[body] / avgStock;
      }

      // Calculate a rating by comparing distance, price, and number of
      // available units
      let bestRating = 0, bestPlanet = null;
      for (const body of exporters) {
        const rating = priceRating[body] * stockRating[body] * distRating[body];
        if (rating > bestRating) {
          bestRating = rating;
          bestPlanet = body;
        }
      }

      return bestPlanet;
    }

    manufacture() {
      const need = this.neededResources();
      const want = need.amounts;
      const list = [];

      for (const i of need.prioritized) {
        let canCraft = true;

        // Not craftable or we do not need it
        if (!resources[i].isCraftable || this.getNeed(i) < 0.25) {
          canCraft = false;
        }

        // Cache so we don't recalculate these over and over
        const mat_stock = {};
        const mat_short = {};

        for (const mat of resources[i].ingredients) {
          for (const mat of resources[i].ingredients) {
            if (!mat_stock[mat]) mat_stock[mat] = this.getStock(mat);
            if (!mat_short[mat]) mat_short[mat] = this.hasShortage(mat);

            if (mat_stock[mat] < resources[i].recipe[mat] || mat_short[mat]) {
              this.incDemand(mat, resources[i].recipe[mat]);
              canCraft = false;
            }
          }
        }

        if (canCraft) {
          list.push(i);
        } else {
          delete want[i];
        }
      }

      while (Object.keys(want).length > 0) {
        const items = list
          .filter(i => want[i])
          .map(i => resources[i]);

        for (const item of items) {
          for (const mat of item.ingredients) {
            this.buy(mat, item.recipe[mat]);
          }

          if (--want[item.name] === 0) {
            delete want[item.name];
          }

          const turns = this.fabricate(item.name);
          this.schedule(turns, item.name, 1, {type: 'craft', item: item.name, count: 1});
          //console.debug( sprintf('[ craft] [%10s] %12s: %02d', this.body, item.name, 1) );
        }
      }
    }

    imports() {
      if (this.queue.length > 10)
        return;

      const need = this.neededResources();
      const want = need.amounts;

      const list = need.prioritized.filter(i => {
        if (this.isNetExporter(i) && !this.hasShortage(i)) {
          // Remove items that we ourselves export or that we aren't short of
          delete want[i];
          return false;
        }

        return true;
      });

      ITEM: for (const item of list) {
        // Import amounts should be between 5-20 units
        const amount = Math.min(20, Math.max(want[item], 5));
        const planet = this.selectExporter(item, amount);
        if (!planet) continue;

        const [bought, price] = window.game.planets[planet].buy(item, amount);

        if (bought > 0) {
          const distance = this.distance(planet) / Physics.AU;
          const turns = Math.ceil(distance * 10);
          window.game.planets[planet].buy('fuel', distance);
          this.schedule(turns, item, bought, {type: 'import', item: item, count: bought, from: planet, to: this.body});
          //console.debug( sprintf('[import] [%10s] %12s: %02d from %10s', this.body, item, bought, planet) );
        }
      }
    }

    produce() {
      for (const item of this.produces.keys) {
        if (this.production(item) > 0 && !this.hasSurplus(item)) {
          this.sell(item, this.production(item));
        }
      }
    }

    consume() {
      for (const item of this.consumes.keys) {
        this.buy(item, this.consumption(item));
      }
    }

    rollups() {
      if (window.game.turns % (24 / data.hours_per_turn) === 0) {
        for (const item of this.stock.keys) {
          this.incSupply(item, this.getStock(item));
        }

        this.supply.rollup();
        this.demand.rollup();

        for (const item of this.need.keys) {
          this.need.inc(item, this.getNeed(item));
        }

        this.need.rollup();
      }
    }

    clearMemos() {
      this._isNetExporter = {};
    }

    turn() {
      this.clearMemos();
      this.produce();
      this.consume();
      this.processQueue();
      this.manufacture();
      this.replenishFabricators();
      this.imports();
      this.rollups();
    }
  };

  for (const name of Object.keys(data.resources))
    resources[name] = new Resource(name);

  exports.resources = resources;
  exports.Resource  = Resource;
  exports.Store     = Store;
  exports.Faction   = Faction;
  exports.Trait     = Trait;
  exports.History   = History;
  exports.Planet    = Planet;
});
